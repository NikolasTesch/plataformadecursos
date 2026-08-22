// Testes de INTEGRAÇÃO PostgreSQL REAIS para o domínio de pagamentos (S6.1).
//
// Estes testes NÃO usam mocks: conectam a um banco de TESTE PostgreSQL isolado
// (sempre com nome contendo `_test`, nunca o banco de aplicação/produção) e
// exercitam o serviço `@/services/pagamentos` ponta a ponta, provando
// concorrência e invariantes de banco que mocks não conseguem cobrir:
//   1. retry concorrente; não excede 4 tentativas (1 inicial + 3 retries);
//   2. duas renovações simultâneas não perdem período (lock FOR UPDATE);
//   3. primeira concessão concorrente mantém um único entitlement;
//   4. registro + aprovação na sequência concede exatamente 30/365 dias;
//   5. refund recorrente com subscription_id divergente é DomainError sem mutação;
//   6. índice parcial único de venda única aprovada, CHECKs e cascade de user.
//
// O banco de teste é resolvido/validado por `vitest.integration.config.mts`
// (exige `TEST_DATABASE_URL` apontando a um banco que case
// `^[A-Za-z0-9_]+_test$`, sem derivação de `DATABASE_URL`) e provisionado por
// `global-setup.ts` (cria/aplica migrations somente nele). NÃO importamos
// `dotenv/config` aqui para não sobrescrever o `DATABASE_URL` de teste definido
// pela config.
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { Prisma } from "@/generated/prisma/client";
import { db } from "@/lib/db";

import {
  criarCompraPendente,
  registrarAssinatura,
  processarEventoExternoValidado,
  DomainError,
} from "@/services/pagamentos";

// Guarda de segurança: a suíte só deve rodar contra um banco de teste cujo nome
// case `^[A-Za-z0-9_]+_test$` (ex.: concursfoco_test). Nunca o banco de
// aplicação/produção.
const TEST_DB_NAME_RE = /^[A-Za-z0-9_]+_test$/;
function dbNameOf(url: string): string {
  return new URL(url).pathname.replace(/^\//, "").split("?")[0];
}
const guardUrl = process.env.TEST_DATABASE_URL;
if (!guardUrl || !TEST_DB_NAME_RE.test(dbNameOf(guardUrl))) {
  throw new Error(
    "Integração S6.1 recusou executar: TEST_DATABASE_URL não aponta a um banco " +
    "de TESTE válido (nome deve casar ^[A-Za-z0-9_]+_test$). Defina " +
    "TEST_DATABASE_URL apontando a um banco de teste isolado; nunca ao banco de " +
    "aplicação/produção.",
  );
}

const NOW = new Date("2026-08-19T12:00:00.000Z");
const DAY = 24 * 60 * 60 * 1000;

// Fixtures rastreados para limpeza determinística (sem apagar dados estranhos).
const created = {
  users: new Set<string>(),
  products: new Set<string>(),
  recursoIds: new Set<string>(), // recurso_id dos webhook_events criados
};

async function limpar(): Promise<void> {
  // webhook_events pelos recurso_id rastreados (não por id genérico).
  if (created.recursoIds.size) {
    await db.webhook_events.deleteMany({ where: { recurso_id: { in: [...created.recursoIds] } } });
  }
  if (created.users.size) {
    // Ordem importa por causa das FKs/restrições reais:
    // 1. purchases antes de entitlements: deletar entitlement dispara
    //    `ON DELETE SET NULL` em purchases.entitlement_id, o que viola o CHECK
    //    `purchases_aprovado_entitlement_chk` se a purchase estiver `aprovado`.
    // 2. entitlements antes de users: `entitlements_user_id_fkey` é RESTRICT.
    // 3. users em cascade remove subscriptions.
    await db.purchases.deleteMany({ where: { user_id: { in: [...created.users] } } });
    await db.entitlements.deleteMany({ where: { user_id: { in: [...created.users] } } });
    await db.users.deleteMany({ where: { id: { in: [...created.users] } } });
  }
  if (created.products.size) {
    await db.products.deleteMany({ where: { id: { in: [...created.products] } } });
  }
  created.users.clear();
  created.products.clear();
  created.recursoIds.clear();
}

beforeEach(async () => {
  await limpar();
});
afterEach(async () => {
  await limpar();
});

let seq = 0;
function uid(prefix: string): string {
  seq += 1;
  return `${prefix}_${Date.now().toString(36)}_${seq}_${Math.random().toString(36).slice(2, 8)}`;
}

// Gera e rastreia o recurso_id de um webhook_event para limpeza garantida.
function ruid(prefix: string): string {
  const id = uid(prefix);
  created.recursoIds.add(id);
  return id;
}

async function criarUsuario() {
  const id = uid("u");
  const user = await db.users.create({
    data: { nome: "T", email: `${id}@test.local`, senha_hash: "x", consentimento_lgpd_em: NOW },
  });
  created.users.add(user.id);
  return user;
}

async function criarProduto(
  tipo: "assinatura" | "venda_unica",
  opts: { preco_mensal_cents?: number | null; preco_anual_cents?: number | null; preco_unico_cents?: number | null } = {},
) {
  const id = uid("p");
  const product = await db.products.create({
    data: {
      tipo,
      nome: id,
      status: "ativo",
      preco_mensal_cents: opts.preco_mensal_cents ?? null,
      preco_anual_cents: opts.preco_anual_cents ?? null,
      preco_unico_cents: opts.preco_unico_cents ?? null,
    },
  });
  created.products.add(product.id);
  return product;
}

describe("S6.1 — concorrência e invariantes em PostgreSQL real", () => {
  it("retry concorrente não excede 4 tentativas (1 inicial + 3 retries)", async () => {
  const recursoId = ruid("pay");
  const compraIdInexistente = uid("purchase");
    const evento = {
      provedor: "mercado_pago" as const,
      recurso_id: recursoId,
      tipo_evento: "payment.approved",
      payload: { purchase_id: compraIdInexistente } as Prisma.InputJsonObject,
      compra_id: compraIdInexistente,
    };

    // 10 chamadas simultâneas para o MESMO evento (compra inexistente => falha de domínio).
    const promessas = Array.from({ length: 10 }, () =>
      processarEventoExternoValidado(evento, { now: () => NOW }),
    );
    await Promise.allSettled(promessas);

    const ev = await db.webhook_events.findUnique({
      where: {
        provedor_recurso_id_tipo_evento: {
          provedor: "mercado_pago",
          recurso_id: recursoId,
          tipo_evento: "payment.approved",
        },
      },
    });
    expect(ev).not.toBeNull();

    // O lock FOR UPDATE serializa os incrementos: exatamente 4 tentativas, nunca 5.
    expect(ev!.tentativas).toBe(4);
    expect(ev!.status).toBe("falhou");
    expect(ev!.ultimo_erro).toContain("compra não encontrada");
  });

  it("duas renovações simultâneas não perdem período (lock FOR UPDATE)", async () => {
    const user = await criarUsuario();
    const product = await criarProduto("assinatura", {
      preco_mensal_cents: 1000,
      preco_anual_cents: 10000,
    });
    const T0 = NOW;
    const subscription = await db.subscriptions.create({
      data: {
        user_id: user.id,
        product_id: product.id,
        periodicidade: "mensal",
        mp_subscription_id: uid("pre"),
        status: "ativa",
        acesso_ate: T0,
      },
    });
    const entitlement = await db.entitlements.create({
      data: {
        user_id: user.id,
        product_id: product.id,
        subscription_id: subscription.id,
        origem: "pagamento",
        acesso_ate: T0,
      },
    });
    // Duas purchases pendentes distintas para a mesma assinatura (dois ciclos).
    const purchase1 = await db.purchases.create({
      data: {
        user_id: user.id,
        product_id: product.id,
        tipo: "checkout",
        status: "pendente",
        periodicidade: "mensal",
        subscription_id: subscription.id,
        valor_cents: 1000,
      },
    });
    const purchase2 = await db.purchases.create({
      data: {
        user_id: user.id,
        product_id: product.id,
        tipo: "checkout",
        status: "pendente",
        periodicidade: "mensal",
        subscription_id: subscription.id,
        valor_cents: 1000,
      },
    });

    const evento1 = {
      provedor: "mercado_pago" as const,
      recurso_id: ruid("pay1"),
      tipo_evento: "payment.approved",
      payload: { purchase_id: purchase1.id, subscription_id: subscription.id } as Prisma.InputJsonObject,
      compra_id: purchase1.id,
      subscription_id: subscription.id,
    };
    const evento2 = {
      provedor: "mercado_pago" as const,
      recurso_id: ruid("pay2"),
      tipo_evento: "payment.approved",
      payload: { purchase_id: purchase2.id, subscription_id: subscription.id } as Prisma.InputJsonObject,
      compra_id: purchase2.id,
      subscription_id: subscription.id,
    };

    await Promise.all([
      processarEventoExternoValidado(evento1, { now: () => T0 }),
      processarEventoExternoValidado(evento2, { now: () => T0 }),
    ]);

    const sub = await db.subscriptions.findUnique({ where: { id: subscription.id } });
    const ent = await db.entitlements.findUnique({ where: { id: entitlement.id } });
    const esperado = new Date(T0.getTime() + 60 * DAY);
    expect(sub!.acesso_ate.getTime()).toBe(esperado.getTime());
    expect(ent!.acesso_ate!.getTime()).toBe(esperado.getTime());
  });

  it("primeira concessão concorrente mantém um único entitlement", async () => {
    const user = await criarUsuario();
    const product = await criarProduto("assinatura", {
      preco_mensal_cents: 1000,
      preco_anual_cents: 10000,
    });
    const subscription = await db.subscriptions.create({
      data: {
        user_id: user.id,
        product_id: product.id,
        periodicidade: "mensal",
        mp_subscription_id: uid("pre"),
        status: "ativa",
        acesso_ate: NOW,
      },
    });
    const purchase = await db.purchases.create({
      data: {
        user_id: user.id,
        product_id: product.id,
        tipo: "checkout",
        status: "pendente",
        periodicidade: "mensal",
        subscription_id: subscription.id,
        valor_cents: 1000,
      },
    });

    // Dois eventos de aprovação CONCORRENTES para a MESMA compra (recurso_id distintos).
    const evento1 = {
      provedor: "mercado_pago" as const,
      recurso_id: ruid("payA"),
      tipo_evento: "payment.approved",
      payload: { purchase_id: purchase.id, subscription_id: subscription.id } as Prisma.InputJsonObject,
      compra_id: purchase.id,
      subscription_id: subscription.id,
    };
    const evento2 = {
      provedor: "mercado_pago" as const,
      recurso_id: ruid("payB"),
      tipo_evento: "payment.approved",
      payload: { purchase_id: purchase.id, subscription_id: subscription.id } as Prisma.InputJsonObject,
      compra_id: purchase.id,
      subscription_id: subscription.id,
    };

    await Promise.all([
      processarEventoExternoValidado(evento1, { now: () => NOW }),
      processarEventoExternoValidado(evento2, { now: () => NOW }),
    ]);

    const ents = await db.entitlements.findMany({ where: { subscription_id: subscription.id } });
    expect(ents).toHaveLength(1);
    const compra = await db.purchases.findUnique({ where: { id: purchase.id } });
    expect(compra!.status).toBe("aprovado");
  });

  it("registro + aprovação na sequência concede exatamente 30 dias a partir de now", async () => {
    const user = await criarUsuario();
    const product = await criarProduto("assinatura", {
      preco_mensal_cents: 1000,
      preco_anual_cents: 10000,
    });
    const purchase = await criarCompraPendente(
      { user_id: user.id, product_id: product.id, valor_cents: 1000, periodicidade: "mensal" },
      { now: () => NOW },
    );
    const sub = await registrarAssinatura(
      {
        user_id: user.id,
        product_id: product.id,
        purchase_id: purchase.id,
        periodicidade: "mensal",
        mp_subscription_id: uid("pre"),
      },
      { now: () => NOW },
    );
    // Registro: acesso_ate = now, sem data arbitrária do DTO.
    expect(sub.acesso_ate.getTime()).toBe(NOW.getTime());

    const evento = {
      provedor: "mercado_pago" as const,
      recurso_id: ruid("pay"),
      tipo_evento: "payment.approved",
      payload: { purchase_id: purchase.id, subscription_id: sub.id } as Prisma.InputJsonObject,
      compra_id: purchase.id,
      subscription_id: sub.id,
    };
    const res = await processarEventoExternoValidado(evento, { now: () => NOW });
    expect(res.duplicado).toBe(false);

    const subApos = await db.subscriptions.findUnique({ where: { id: sub.id } });
    const esperado = new Date(NOW.getTime() + 30 * DAY);
    expect(subApos!.acesso_ate.getTime()).toBe(esperado.getTime());
  });

  it("refund recorrente com subscription_id divergente lança DomainError e não muta", async () => {
    const user = await criarUsuario();
    const product = await criarProduto("assinatura", {
      preco_mensal_cents: 1000,
      preco_anual_cents: 10000,
    });
    const subscription = await db.subscriptions.create({
      data: {
        user_id: user.id,
        product_id: product.id,
        periodicidade: "mensal",
        mp_subscription_id: uid("pre"),
        status: "ativa",
        acesso_ate: NOW,
      },
    });
    const entitlement = await db.entitlements.create({
      data: {
        user_id: user.id,
        product_id: product.id,
        subscription_id: subscription.id,
        origem: "pagamento",
        acesso_ate: new Date(NOW.getTime() + 30 * DAY),
      },
    });
    const purchase = await db.purchases.create({
      data: {
        user_id: user.id,
        product_id: product.id,
        tipo: "checkout",
        status: "aprovado",
        periodicidade: "mensal",
        subscription_id: subscription.id,
        entitlement_id: entitlement.id,
        valor_cents: 1000,
      },
    });

    const evento = {
      provedor: "mercado_pago" as const,
      recurso_id: ruid("payRefund"),
      tipo_evento: "refund",
      payload: { purchase_id: purchase.id, subscription_id: "subscription-DIVERGENTE" } as Prisma.InputJsonObject,
      compra_id: purchase.id,
      subscription_id: "subscription-DIVERGENTE",
    };

    await expect(processarEventoExternoValidado(evento, { now: () => NOW })).rejects.toBeInstanceOf(DomainError);

    const subApos = await db.subscriptions.findUnique({ where: { id: subscription.id } });
    const compraApos = await db.purchases.findUnique({ where: { id: purchase.id } });
    expect(subApos!.status).toBe("ativa"); // não cancelada
    expect(compraApos!.status).toBe("aprovado"); // não reembolsada
  });

  it("índice parcial único bloqueia 2ª venda única aprovada (user, product)", async () => {
    const user = await criarUsuario();
    const product = await criarProduto("venda_unica", { preco_unico_cents: 1000 });
    const ent1 = await db.entitlements.create({
      data: { user_id: user.id, product_id: product.id, origem: "pagamento", acesso_ate: null },
    });
    await db.purchases.create({
      data: {
        user_id: user.id,
        product_id: product.id,
        tipo: "checkout",
        status: "aprovado",
        entitlement_id: ent1.id,
        valor_cents: 1000,
      },
    });
    const ent2 = await db.entitlements.create({
      data: { user_id: user.id, product_id: product.id, origem: "pagamento", acesso_ate: null },
    });
    // Deve violar o índice parcial único purchases_venda_unica_aprovada_key.
    await expect(
      db.purchases.create({
        data: {
          user_id: user.id,
          product_id: product.id,
          tipo: "checkout",
          status: "aprovado",
          entitlement_id: ent2.id,
          valor_cents: 1000,
        },
      }),
    ).rejects.toMatchObject({ code: "P2002" });
  });

  it("CHECK subscription_periodicidade: purchase com subscription_id sem periodicidade falha", async () => {
    const user = await criarUsuario();
    const product = await criarProduto("assinatura", { preco_mensal_cents: 1000 });
    await expect(
      db.purchases.create({
        data: {
          user_id: user.id,
          product_id: product.id,
          tipo: "checkout",
          status: "pendente",
          subscription_id: uid("sub"),
          valor_cents: 1000,
        },
      }),
    ).rejects.toThrow();
  });

  it("CHECK aprovado_entitlement: purchase aprovada sem entitlement_id falha", async () => {
    const user = await criarUsuario();
    const product = await criarProduto("venda_unica", { preco_unico_cents: 1000 });
    await expect(
      db.purchases.create({
        data: {
          user_id: user.id,
          product_id: product.id,
          tipo: "checkout",
          status: "aprovado",
          valor_cents: 1000,
        },
      }),
    ).rejects.toThrow();
  });

  it("CHECK subscription_acesso: entitlement de subscription sem acesso_ate falha", async () => {
    const user = await criarUsuario();
    const product = await criarProduto("assinatura", { preco_mensal_cents: 1000 });
    await expect(
      db.entitlements.create({
        data: {
          user_id: user.id,
          product_id: product.id,
          subscription_id: uid("sub"),
          origem: "pagamento",
          acesso_ate: null,
        },
      }),
    ).rejects.toThrow();
  });

  it("cascade user remove purchases e subscriptions", async () => {
    const user = await criarUsuario();
    const product = await criarProduto("assinatura", {
      preco_mensal_cents: 1000,
      preco_anual_cents: 10000,
    });
    const subscription = await db.subscriptions.create({
      data: {
        user_id: user.id,
        product_id: product.id,
        periodicidade: "mensal",
        mp_subscription_id: uid("pre"),
        status: "ativa",
        acesso_ate: NOW,
      },
    });
    await db.purchases.create({
      data: {
        user_id: user.id,
        product_id: product.id,
        tipo: "checkout",
        status: "pendente",
        periodicidade: "mensal",
        subscription_id: subscription.id,
        valor_cents: 1000,
      },
    });

    await db.users.delete({ where: { id: user.id } });
    created.users.delete(user.id); // já removido; afterEach será no-op

    const subRestante = await db.subscriptions.findUnique({ where: { id: subscription.id } });
    const purchaseRestante = await db.purchases.findFirst({
      where: { subscription_id: subscription.id },
    });
    expect(subRestante).toBeNull();
    expect(purchaseRestante).toBeNull();
  });
});
