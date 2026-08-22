import { describe, expect, it, vi } from "vitest";
import { Prisma } from "@/generated/prisma/client";
import type {
  entitlements,
  purchases,
  subscriptions,
  webhook_events,
} from "@/generated/prisma/client";

vi.mock("@/lib/db", () => ({ db: {} }));

import {
  criarCompraPendente,
  registrarAssinatura,
  processarEventoExternoValidado,
  marcarAssinaturasExpiradas,
  cancelarAssinatura,
  type DependenciasPagamentos,
} from "@/services/pagamentos";

// ---------------------------------------------------------------------------
// NOTA DE COBERTURA
// Estes testes unitários usam uma transação fake (sem banco real) e validam a
// lógica de domínio de forma isolada e determinística. Locks PostgreSQL
// explícitos (FOR UPDATE), a unicidade parcial de venda única aprovada e as
// CHECK constraints são garantidos no banco pela migration
// `20260819210000_s6_pagamentos_invariantes` e COMPROVADOS por testes de
// integração reais em `tests/integration/pagamentos.test.ts` (`npm run test:pg`),
// que exercitam concorrência e invariantes em PostgreSQL real. Mocks NÃO cobrem
// locks — a evidência real está na suíte de integração.
// ---------------------------------------------------------------------------

interface TxFake {
  $queryRaw: ReturnType<typeof vi.fn>;
  products: { findUnique: ReturnType<typeof vi.fn> };
  purchases: {
    create: ReturnType<typeof vi.fn>;
    findUnique: ReturnType<typeof vi.fn>;
    findFirst: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
  };
  entitlements: {
    create: ReturnType<typeof vi.fn>;
    findFirst: ReturnType<typeof vi.fn>;
    findUnique: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
    delete: ReturnType<typeof vi.fn>;
  };
  subscriptions: {
    findUnique: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
    updateMany: ReturnType<typeof vi.fn>;
  };
  webhook_events: {
    findUnique: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
    updateMany: ReturnType<typeof vi.fn>;
  };
}

function criarTransacaoFake(): {
  tx: TxFake;
  transaction: NonNullable<DependenciasPagamentos["transaction"]>;
} {
  const tx: TxFake = {
    $queryRaw: vi.fn().mockResolvedValue([]),
    products: { findUnique: vi.fn() },
    purchases: {
      create: vi.fn(),
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn(),
    },
    entitlements: {
      create: vi.fn(),
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    subscriptions: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn().mockResolvedValue({ count: 0 }),
    },
    webhook_events: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
    },
  };
  const transaction: NonNullable<DependenciasPagamentos["transaction"]> = async (fn) =>
    fn(tx as unknown as Prisma.TransactionClient);
  return { tx, transaction };
}

const AGORA = new Date("2026-08-19T12:00:00Z");

function produtoFake(overrides: Partial<{ tipo: "assinatura" | "venda_unica"; status: "ativo" | "inativo"; preco_mensal_cents: number | null; preco_anual_cents: number | null; preco_unico_cents: number | null }> = {}) {
  return {
    id: "product-1",
    tipo: "venda_unica" as const,
    status: "ativo" as const,
    preco_mensal_cents: null,
    preco_anual_cents: null,
    preco_unico_cents: 1000,
    ...overrides,
  };
}

function compraFake(overrides: Partial<purchases> = {}): purchases & { product: ReturnType<typeof produtoFake> } {
  return {
    id: "purchase-1",
    user_id: "user-1",
    product_id: "product-1",
    entitlement_id: null,
    subscription_id: null,
    mp_payment_id: null,
    tipo: "checkout",
    periodicidade: null,
    status: "pendente",
    valor_cents: 1000,
    coupon_id: null,
    criado_em: AGORA,
    atualizado_em: AGORA,
    product: produtoFake(),
    ...overrides,
  } as purchases & { product: ReturnType<typeof produtoFake> };
}

function eventoFake(overrides: Partial<webhook_events> = {}): webhook_events {
  return {
    id: "event-1",
    provedor: "mercado_pago",
    recurso_id: "payment-1",
    tipo_evento: "payment.approved",
    status: "processado",
    payload: { purchase_id: "purchase-1" },
    recebido_em: AGORA,
    processado_em: AGORA,
    tentativas: 0,
    ultimo_erro: null,
    ...overrides,
  };
}

function assinaturaFake(overrides: Partial<subscriptions> = {}): subscriptions {
  return {
    id: "subscription-1",
    user_id: "user-1",
    product_id: "product-1",
    periodicidade: "mensal",
    mp_subscription_id: "preapproval-1",
    status: "ativa",
    acesso_ate: AGORA,
    cancelada_em: null,
    criado_em: AGORA,
    atualizado_em: AGORA,
    ...overrides,
  };
}

function erroUnique(): Prisma.PrismaClientKnownRequestError {
  return new Prisma.PrismaClientKnownRequestError("Unique constraint failed", {
    code: "P2002",
    clientVersion: "7.0.0",
  });
}

describe("criarCompraPendente (S6.1)", () => {
  it("persiste compra pendente sem conceder acesso", async () => {
    const { tx, transaction } = criarTransacaoFake();
    const compra = compraFake();
    tx.products.findUnique.mockResolvedValue(produtoFake());
    tx.purchases.create.mockResolvedValue(compra);

    const resultado = await criarCompraPendente(
      { user_id: "user-1", product_id: "product-1", valor_cents: 1000 },
      { transaction },
    );

    expect(resultado.status).toBe("pendente");
    expect(resultado.entitlement_id).toBeNull();
    expect(tx.purchases.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ status: "pendente", mp_payment_id: null }),
    });
    expect(tx.entitlements.create).not.toHaveBeenCalled();
  });

  it("rejeita produto inativo", async () => {
    const { tx, transaction } = criarTransacaoFake();
    tx.products.findUnique.mockResolvedValue(produtoFake({ status: "inativo" }));

    await expect(
      criarCompraPendente({ user_id: "user-1", product_id: "product-1", valor_cents: 1000 }, { transaction }),
    ).rejects.toThrow(/inativo/);
  });

  it("rejeita valor incompatível com o preço do produto", async () => {
    const { tx, transaction } = criarTransacaoFake();
    tx.products.findUnique.mockResolvedValue(produtoFake({ preco_unico_cents: 1000 }));

    await expect(
      criarCompraPendente({ user_id: "user-1", product_id: "product-1", valor_cents: 999 }, { transaction }),
    ).rejects.toThrow(/não confere/);
  });

  it("bloqueia intenção duplicada de venda única já aprovada (P6/R9)", async () => {
    const { tx, transaction } = criarTransacaoFake();
    tx.products.findUnique.mockResolvedValue(produtoFake());
    tx.purchases.findFirst.mockResolvedValue(compraFake({ status: "aprovado" }));

    await expect(
      criarCompraPendente({ user_id: "user-1", product_id: "product-1", valor_cents: 1000 }, { transaction }),
    ).rejects.toThrow(/já existe/);
  });
});

describe("processarEventoExternoValidado (S6.1)", () => {
  it("aprova venda única uma vez e ignora o mesmo evento depois (terminal)", async () => {
    const { tx, transaction } = criarTransacaoFake();
    const compra = compraFake();
    const entitlement: entitlements = {
      id: "entitlement-1",
      user_id: "user-1",
      product_id: "product-1",
      subscription_id: null,
      origem: "pagamento",
      acesso_ate: null,
      criado_em: AGORA,
      atualizado_em: AGORA,
    };
    tx.webhook_events.create.mockResolvedValue(eventoFake({ status: "recebido", processado_em: null }));
    tx.webhook_events.findUnique.mockResolvedValue(eventoFake({ status: "recebido", processado_em: null }));
    tx.webhook_events.update.mockResolvedValue(eventoFake());
    tx.purchases.findUnique.mockResolvedValue(compra);
    tx.entitlements.create.mockResolvedValue(entitlement);
    tx.purchases.update.mockResolvedValue({ ...compra, status: "aprovado", entitlement_id: entitlement.id });

    const dados = {
      provedor: "mercado_pago" as const,
      recurso_id: "payment-1",
      tipo_evento: "payment.approved",
      payload: { purchase_id: "purchase-1" } as Prisma.InputJsonObject,
      compra_id: "purchase-1",
    };
    const primeiro = await processarEventoExternoValidado(dados, { transaction });
    expect(primeiro.duplicado).toBe(false);
    expect(tx.entitlements.create).toHaveBeenCalledTimes(1);

    // Segunda chamada: create conflita (unique), recupera evento já processado
    tx.webhook_events.create.mockRejectedValueOnce(erroUnique());
    tx.webhook_events.findUnique.mockResolvedValue(eventoFake());
    const segundo = await processarEventoExternoValidado(
      { ...dados, payload: { purchase_id: "purchase-1" } as Prisma.InputJsonObject },
      { transaction },
    );
    expect(segundo.duplicado).toBe(true);
    expect(tx.entitlements.create).toHaveBeenCalledTimes(1);
  });

  it("renova assinatura somando 30/365 dias a partir de max(now, acesso atual)", async () => {
    const { tx, transaction } = criarTransacaoFake();
    for (const [periodicidade, dias] of [["mensal", 30], ["anual", 365]] as const) {
      vi.clearAllMocks();
      const acessoInicial = new Date(AGORA);
      const preco = periodicidade === "mensal" ? 1000 : 10000;
      const compra = compraFake({ periodicidade, subscription_id: "subscription-1", valor_cents: preco });
      compra.product = produtoFake({ tipo: "assinatura", preco_mensal_cents: 1000, preco_anual_cents: 10000, preco_unico_cents: null });
      const assinatura = assinaturaFake({ periodicidade, acesso_ate: acessoInicial });
      tx.webhook_events.create.mockResolvedValue(eventoFake({ status: "recebido", processado_em: null }));
      tx.webhook_events.findUnique.mockResolvedValue(eventoFake({ status: "recebido", processado_em: null }));
      tx.webhook_events.update.mockResolvedValue(eventoFake());
      tx.purchases.findUnique.mockResolvedValue(compra);
      tx.subscriptions.findUnique.mockResolvedValue(assinatura);
      tx.entitlements.findFirst.mockResolvedValue(null);
      tx.entitlements.create.mockImplementation(async ({ data }: { data: entitlements }) => ({
        ...data,
        id: "entitlement-recorrente",
        criado_em: acessoInicial,
        atualizado_em: acessoInicial,
      } as entitlements));
      tx.purchases.update.mockResolvedValue({ ...compra, status: "aprovado" });
      tx.subscriptions.update.mockResolvedValue({ ...assinatura, acesso_ate: new Date("2026-08-20T12:00:00Z") });

      await processarEventoExternoValidado(
        {
          provedor: "mercado_pago",
          recurso_id: `payment-${periodicidade}`,
          tipo_evento: "payment.approved",
          payload: { purchase_id: compra.id, subscription_id: assinatura.id } as Prisma.InputJsonObject,
          compra_id: compra.id,
          subscription_id: assinatura.id,
        },
        { transaction, now: () => acessoInicial },
      );

      const chamada = tx.entitlements.create.mock.calls[0]?.[0] as { data: entitlements };
      const esperado = new Date(acessoInicial.getTime() + dias * 24 * 60 * 60 * 1000);
      expect(chamada.data.acesso_ate).toEqual(esperado);
    }
  });

  it("refund de venda única revoga o entitlement permanente", async () => {
    const { tx, transaction } = criarTransacaoFake();
    const compra = compraFake({ entitlement_id: "entitlement-1", status: "aprovado" });
    tx.webhook_events.create.mockResolvedValue(eventoFake({ tipo_evento: "refund", status: "recebido", processado_em: null }));
    tx.webhook_events.findUnique.mockResolvedValue(eventoFake({ tipo_evento: "refund", status: "recebido", processado_em: null }));
    tx.webhook_events.update.mockResolvedValue(eventoFake({ tipo_evento: "refund" }));
    tx.purchases.findUnique.mockResolvedValue(compra);
    tx.purchases.update.mockResolvedValue({ ...compra, status: "reembolsado", entitlement_id: null });

    const resultado = await processarEventoExternoValidado(
      {
        provedor: "mercado_pago",
        recurso_id: "payment-refund-1",
        tipo_evento: "refund",
        payload: { purchase_id: compra.id } as Prisma.InputJsonObject,
        compra_id: compra.id,
      },
      { transaction },
    );

    expect(tx.entitlements.delete).toHaveBeenCalledWith({ where: { id: "entitlement-1" } });
    expect(resultado.entitlement).toBeNull();
  });

  it("refund de assinatura preserva o entitlement e cancela a continuidade", async () => {
    const { tx, transaction } = criarTransacaoFake();
    const compra = compraFake({ entitlement_id: "entitlement-1", subscription_id: "subscription-1", status: "aprovado" });
    compra.product = produtoFake({ tipo: "assinatura", preco_mensal_cents: 1000, preco_anual_cents: 10000, preco_unico_cents: null });
    const entitlement: entitlements = {
      id: "entitlement-1",
      user_id: compra.user_id,
      product_id: compra.product_id,
      subscription_id: "subscription-1",
      origem: "pagamento",
      acesso_ate: new Date("2026-09-18T12:00:00Z"),
      criado_em: AGORA,
      atualizado_em: AGORA,
    };
    tx.webhook_events.create.mockResolvedValue(eventoFake({ tipo_evento: "refund", status: "recebido", processado_em: null }));
    tx.webhook_events.findUnique.mockResolvedValue(eventoFake({ tipo_evento: "refund", status: "recebido", processado_em: null }));
    tx.webhook_events.update.mockResolvedValue(eventoFake({ tipo_evento: "refund" }));
    tx.purchases.findUnique.mockResolvedValue(compra);
    tx.subscriptions.findUnique.mockResolvedValue(assinaturaFake());
    tx.subscriptions.update.mockResolvedValue(assinaturaFake({ status: "cancelada", cancelada_em: new Date() }));
    tx.purchases.update.mockResolvedValue({ ...compra, status: "reembolsado" });
    tx.entitlements.findUnique.mockResolvedValue(entitlement);

    const resultado = await processarEventoExternoValidado(
      {
        provedor: "mercado_pago",
        recurso_id: "payment-refund-recorrente-1",
        tipo_evento: "refund",
        payload: { purchase_id: compra.id, subscription_id: "subscription-1" } as Prisma.InputJsonObject,
        compra_id: compra.id,
        subscription_id: "subscription-1",
      },
      { transaction },
    );

    expect(tx.entitlements.delete).not.toHaveBeenCalled();
    expect(tx.subscriptions.update).toHaveBeenCalledWith({
      where: { id: "subscription-1" },
      data: { status: "cancelada", cancelada_em: expect.any(Date) },
    });
    expect(resultado.entitlement?.acesso_ate).toEqual(entitlement.acesso_ate);
  });

  it("refund de compra pendente falha reprocessável (registra falha e propaga)", async () => {
    const { tx, transaction } = criarTransacaoFake();
    const compra = compraFake({ status: "pendente" });
    tx.webhook_events.create.mockResolvedValue(eventoFake({ tipo_evento: "refund", status: "recebido", processado_em: null }));
    tx.webhook_events.findUnique.mockResolvedValue(eventoFake({ tipo_evento: "refund", status: "recebido", processado_em: null }));
    tx.purchases.findUnique.mockResolvedValue(compra);
    tx.webhook_events.updateMany.mockResolvedValue({ count: 1 });

    await expect(
      processarEventoExternoValidado(
        {
          provedor: "mercado_pago",
          recurso_id: "payment-refund-pendente",
          tipo_evento: "refund",
          payload: { purchase_id: compra.id } as Prisma.InputJsonObject,
          compra_id: compra.id,
        },
        { transaction },
      ),
    ).rejects.toThrow(/reembolsar/);

    // registra falha com where condicional (não sobrescreve processado, não 5ª tentativa)
    expect(tx.webhook_events.updateMany).toHaveBeenCalledWith({
      where: { id: "event-1", status: { not: "processado" }, tentativas: { lt: 4 } },
      data: expect.objectContaining({ status: "falhou", tentativas: { increment: 1 } }),
    });
  });

  it("aprovação atrasada após refund é no-op sem entitlement adicional", async () => {
    const { tx, transaction } = criarTransacaoFake();
    // Compra já reembolsada
    const compra = compraFake({ status: "reembolsado", entitlement_id: "entitlement-1" });
    tx.webhook_events.create.mockResolvedValue(eventoFake({ status: "recebido", processado_em: null }));
    tx.webhook_events.findUnique.mockResolvedValue(eventoFake({ status: "recebido", processado_em: null }));
    tx.webhook_events.update.mockResolvedValue(eventoFake());
    tx.purchases.findUnique.mockResolvedValue(compra);

    const resultado = await processarEventoExternoValidado(
      {
        provedor: "mercado_pago",
        recurso_id: "payment-late-approval",
        tipo_evento: "payment.approved",
        payload: { purchase_id: compra.id } as Prisma.InputJsonObject,
        compra_id: compra.id,
      },
      { transaction },
    );

    expect(resultado.entitlement).toBeNull();
    expect(tx.entitlements.create).not.toHaveBeenCalled();
  });

  it("não reativa compra recusada", async () => {
    const { tx, transaction } = criarTransacaoFake();
    const compra = compraFake({ status: "recusado" });
    tx.webhook_events.create.mockResolvedValue(eventoFake({ status: "recebido", processado_em: null }));
    tx.webhook_events.findUnique.mockResolvedValue(eventoFake({ status: "recebido", processado_em: null }));
    tx.webhook_events.update.mockResolvedValue(eventoFake());
    tx.purchases.findUnique.mockResolvedValue(compra);

    const resultado = await processarEventoExternoValidado(
      {
        provedor: "mercado_pago",
        recurso_id: "payment-recusada",
        tipo_evento: "payment.approved",
        payload: { purchase_id: compra.id } as Prisma.InputJsonObject,
        compra_id: compra.id,
      },
      { transaction },
    );

    expect(resultado.entitlement).toBeNull();
    expect(tx.entitlements.create).not.toHaveBeenCalled();
  });

  it("refund de venda única com subscription_id divergente no evento não cancela assinatura alheia", async () => {
    const { tx, transaction } = criarTransacaoFake();
    const compra = compraFake({ entitlement_id: "entitlement-1", status: "aprovado" });
    compra.product = produtoFake({ tipo: "venda_unica", preco_unico_cents: 1000 });
    tx.webhook_events.create.mockResolvedValue(eventoFake({ tipo_evento: "refund", status: "recebido", processado_em: null }));
    tx.webhook_events.findUnique.mockResolvedValue(eventoFake({ tipo_evento: "refund", status: "recebido", processado_em: null }));
    tx.webhook_events.update.mockResolvedValue(eventoFake({ tipo_evento: "refund" }));
    tx.purchases.findUnique.mockResolvedValue(compra);
    tx.purchases.update.mockResolvedValue({ ...compra, status: "reembolsado", entitlement_id: null });

    await processarEventoExternoValidado(
      {
        provedor: "mercado_pago",
        recurso_id: "payment-refund-vu",
        tipo_evento: "refund",
        payload: { purchase_id: compra.id, subscription_id: "subscription-ALHEIA" } as Prisma.InputJsonObject,
        compra_id: compra.id,
        subscription_id: "subscription-ALHEIA",
      },
      { transaction },
    );

    // decisão pelo tipo do produto (venda única), ignora subscription_id do evento
    expect(tx.subscriptions.update).not.toHaveBeenCalled();
    expect(tx.entitlements.delete).toHaveBeenCalledWith({ where: { id: "entitlement-1" } });
  });

  it("refund de compra recusada não altera estado nem cancela assinatura", async () => {
    const { tx, transaction } = criarTransacaoFake();
    const compra = compraFake({ status: "recusado", entitlement_id: "entitlement-1", subscription_id: "subscription-1" });
    compra.product = produtoFake({ tipo: "assinatura", preco_mensal_cents: 1000, preco_anual_cents: 10000, preco_unico_cents: null });
    tx.webhook_events.create.mockResolvedValue(eventoFake({ tipo_evento: "refund", status: "recebido", processado_em: null }));
    tx.webhook_events.findUnique.mockResolvedValue(eventoFake({ tipo_evento: "refund", status: "recebido", processado_em: null }));
    tx.webhook_events.update.mockResolvedValue(eventoFake({ tipo_evento: "refund" }));
    tx.purchases.findUnique.mockResolvedValue(compra);

    const resultado = await processarEventoExternoValidado(
      {
        provedor: "mercado_pago",
        recurso_id: "payment-refund-rec",
        tipo_evento: "refund",
        payload: { purchase_id: compra.id, subscription_id: "subscription-1" } as Prisma.InputJsonObject,
        compra_id: compra.id,
        subscription_id: "subscription-1",
      },
      { transaction },
    );

    expect(resultado.compra?.status).toBe("recusado");
    expect(tx.purchases.update).not.toHaveBeenCalled();
    expect(tx.subscriptions.update).not.toHaveBeenCalled();
    expect(tx.entitlements.delete).not.toHaveBeenCalled();
  });

  it("renovação atualiza entitlement existente em vez de duplicar", async () => {
    const { tx, transaction } = criarTransacaoFake();
    const now = new Date("2026-08-19T12:00:00Z");
    const compra = compraFake({ periodicidade: "mensal", subscription_id: "subscription-1", valor_cents: 1000 });
    compra.product = produtoFake({ tipo: "assinatura", preco_mensal_cents: 1000, preco_anual_cents: 10000, preco_unico_cents: null });
    const assinatura = assinaturaFake({ periodicidade: "mensal", acesso_ate: now });
    const existente: entitlements = {
      id: "entitlement-1",
      user_id: "user-1",
      product_id: "product-1",
      subscription_id: "subscription-1",
      origem: "pagamento",
      acesso_ate: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000),
      criado_em: now,
      atualizado_em: now,
    };
    tx.webhook_events.create.mockResolvedValue(eventoFake({ status: "recebido", processado_em: null }));
    tx.webhook_events.findUnique.mockResolvedValue(eventoFake({ status: "recebido", processado_em: null }));
    tx.webhook_events.update.mockResolvedValue(eventoFake());
    tx.purchases.findUnique.mockResolvedValue(compra);
    tx.subscriptions.findUnique.mockResolvedValue(assinatura);
    tx.entitlements.findFirst.mockResolvedValue(existente);
    tx.entitlements.update.mockImplementation(async ({ data }: { data: entitlements }) => ({ ...existente, ...data } as entitlements));
    tx.purchases.update.mockResolvedValue({ ...compra, status: "aprovado" });
    tx.subscriptions.update.mockResolvedValue({ ...assinatura, acesso_ate: new Date("2026-08-20T12:00:00Z") });

    await processarEventoExternoValidado(
      {
        provedor: "mercado_pago",
        recurso_id: "payment-renew",
        tipo_evento: "payment.approved",
        payload: { purchase_id: compra.id, subscription_id: "subscription-1" } as Prisma.InputJsonObject,
        compra_id: compra.id,
        subscription_id: "subscription-1",
      },
      { transaction, now: () => now },
    );

    expect(tx.entitlements.create).not.toHaveBeenCalled();
    expect(tx.entitlements.update).toHaveBeenCalledTimes(1);
    const chamada = tx.entitlements.update.mock.calls[0]?.[0] as { data: entitlements };
    // base = max(now, assinatura=now, entitlement=now+30d) = now+30d; +30d = now+60d
    const esperado = new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000);
    expect(chamada.data.acesso_ate).toEqual(esperado);
  });

  it("não reprocessa após atingir o limite 1+3 de tentativas", async () => {
    const { tx, transaction } = criarTransacaoFake();
    // recover de evento já com tentativas=4 (falhou)
    tx.webhook_events.create.mockRejectedValueOnce(erroUnique());
    tx.webhook_events.findUnique.mockResolvedValue(eventoFake({ status: "falhou", tentativas: 4 }));

    const resultado = await processarEventoExternoValidado(
      {
        provedor: "mercado_pago",
        recurso_id: "payment-limite",
        tipo_evento: "payment.approved",
        payload: { purchase_id: "purchase-1" } as Prisma.InputJsonObject,
        compra_id: "purchase-1",
      },
      { transaction },
    );

    expect(resultado.duplicado).toBe(true);
    expect(tx.entitlements.create).not.toHaveBeenCalled();
    expect(tx.webhook_events.update).not.toHaveBeenCalled();
  });

  it("subscription.updated sem subscription_status falha (não reativa)", async () => {
    const { tx, transaction } = criarTransacaoFake();
    tx.webhook_events.create.mockResolvedValue(eventoFake({ status: "recebido", processado_em: null }));
    tx.webhook_events.findUnique.mockResolvedValue(eventoFake({ status: "recebido", processado_em: null }));
    tx.webhook_events.updateMany.mockResolvedValue({ count: 1 });

    await expect(
      processarEventoExternoValidado(
        {
          provedor: "mercado_pago",
          recurso_id: "sub-upd",
          tipo_evento: "subscription.updated",
          payload: {} as Prisma.InputJsonObject,
          subscription_id: "subscription-1",
        },
        { transaction },
      ),
    ).rejects.toThrow(/subscription_status/);

    expect(tx.subscriptions.update).not.toHaveBeenCalled();
  });

  it("persiste falha com tentativa incrementada e erro sanitizado (propaga)", async () => {
    const { tx, transaction } = criarTransacaoFake();
    const compra = compraFake();
    tx.webhook_events.create.mockResolvedValue(eventoFake({ status: "recebido", processado_em: null }));
    tx.webhook_events.findUnique.mockResolvedValue(eventoFake({ status: "recebido", processado_em: null }));
    // efeito falha: findUnique da compra lança
    tx.purchases.findUnique.mockRejectedValue(new Error("boom password=supersecreto"));
    tx.webhook_events.updateMany.mockResolvedValue({ count: 1 });

    await expect(
      processarEventoExternoValidado(
        {
          provedor: "mercado_pago",
          recurso_id: "payment-falha",
          tipo_evento: "payment.approved",
          payload: { purchase_id: compra.id } as Prisma.InputJsonObject,
          compra_id: compra.id,
        },
        { transaction },
      ),
    ).rejects.toThrow();

    const chamada = tx.webhook_events.updateMany.mock.calls[0]?.[0] as {
      where: { id: string; status: { not: string }; tentativas: { lt: number } };
      data: { status: string; tentativas: { increment: number }; ultimo_erro: string };
    };
    expect(chamada.where).toEqual({ id: "event-1", status: { not: "processado" }, tentativas: { lt: 4 } });
    expect(chamada.data.status).toBe("falhou");
    expect(chamada.data.tentativas).toEqual({ increment: 1 });
    expect(chamada.data.ultimo_erro).toContain("password=***");
  });
});

describe("registrarAssinatura (S6.1)", () => {
  it("vincula assinatura a compra pendente na mesma transação", async () => {
    const { tx, transaction } = criarTransacaoFake();
    const compra = compraFake({ periodicidade: "mensal" });
    compra.product = produtoFake({ tipo: "assinatura", preco_mensal_cents: 1000, preco_anual_cents: 10000, preco_unico_cents: null });
    tx.purchases.findUnique.mockResolvedValue(compra);
    tx.subscriptions.findUnique.mockResolvedValue(null);
    tx.subscriptions.create.mockResolvedValue(assinaturaFake());
    tx.purchases.update.mockResolvedValue(compra);

    const resultado = await registrarAssinatura(
      {
        user_id: "user-1",
        product_id: "product-1",
        purchase_id: "purchase-1",
        periodicidade: "mensal",
        mp_subscription_id: "preapproval-1",
      },
      { transaction },
    );

    expect(resultado.id).toBe("subscription-1");
    expect(tx.purchases.update).toHaveBeenCalledWith({
      where: { id: "purchase-1" },
      data: { subscription_id: "subscription-1" },
    });
  });

  it("rejeita mp_subscription_id já registrado (não reanimar)", async () => {
    const { tx, transaction } = criarTransacaoFake();
    const compra = compraFake({ periodicidade: "mensal" });
    compra.product = produtoFake({ tipo: "assinatura", preco_mensal_cents: 1000, preco_anual_cents: 10000, preco_unico_cents: null });
    tx.purchases.findUnique.mockResolvedValue(compra);
    tx.subscriptions.findUnique.mockResolvedValue(assinaturaFake());

    await expect(
      registrarAssinatura(
        {
          user_id: "user-1",
          product_id: "product-1",
          purchase_id: "purchase-1",
          periodicidade: "mensal",
          mp_subscription_id: "preapproval-1",
        },
        { transaction },
      ),
    ).rejects.toThrow(/já registrada/);
  });

  it("falha se a compra já tem subscription_id vinculada (não sobrescreve)", async () => {
    const { tx, transaction } = criarTransacaoFake();
    const compra = compraFake({ periodicidade: "mensal", subscription_id: "subscription-ja-existe" });
    compra.product = produtoFake({ tipo: "assinatura", preco_mensal_cents: 1000, preco_anual_cents: 10000, preco_unico_cents: null });
    tx.purchases.findUnique.mockResolvedValue(compra);

    await expect(
      registrarAssinatura(
        {
          user_id: "user-1",
          product_id: "product-1",
          purchase_id: "purchase-1",
          periodicidade: "mensal",
          mp_subscription_id: "preapproval-1",
        },
        { transaction },
      ),
    ).rejects.toThrow(/já possui subscription_id/);
    expect(tx.subscriptions.create).not.toHaveBeenCalled();
  });

  it("usa acesso_ate determinístico (now+período), ignorando DTO arbitrário", async () => {
    const { tx, transaction } = criarTransacaoFake();
    const compra = compraFake({ periodicidade: "mensal" });
    compra.product = produtoFake({ tipo: "assinatura", preco_mensal_cents: 1000, preco_anual_cents: 10000, preco_unico_cents: null });
    tx.purchases.findUnique.mockResolvedValue(compra);
    tx.subscriptions.findUnique.mockResolvedValue(null);
    tx.subscriptions.create.mockImplementation(async ({ data }: { data: subscriptions }) => ({ ...assinaturaFake(), ...data }));
    tx.purchases.update.mockResolvedValue(compra);

    const now = new Date("2026-08-19T12:00:00Z");
    await registrarAssinatura(
      {
        user_id: "user-1",
        product_id: "product-1",
        purchase_id: "purchase-1",
        periodicidade: "mensal",
        mp_subscription_id: "preapproval-1",
      },
      { transaction, now: () => now },
    );

    const chamada = tx.subscriptions.create.mock.calls[0]?.[0] as { data: subscriptions };
    expect(chamada.data.acesso_ate).toEqual(now);
  });

  it("refund de assinatura com evento.subscription_id divergente é erro sem mutação", async () => {
    const { tx, transaction } = criarTransacaoFake();
    const compra = compraFake({ entitlement_id: "entitlement-1", subscription_id: "subscription-1", status: "aprovado" });
    compra.product = produtoFake({ tipo: "assinatura", preco_mensal_cents: 1000, preco_anual_cents: 10000, preco_unico_cents: null });
    tx.webhook_events.create.mockResolvedValue(eventoFake({ tipo_evento: "refund", status: "recebido", processado_em: null }));
    tx.webhook_events.findUnique.mockResolvedValue(eventoFake({ tipo_evento: "refund", status: "recebido", processado_em: null }));
    tx.webhook_events.updateMany.mockResolvedValue({ count: 1 });
    tx.purchases.findUnique.mockResolvedValue(compra);

    await expect(
      processarEventoExternoValidado(
        {
          provedor: "mercado_pago",
          recurso_id: "payment-refund-div",
          tipo_evento: "refund",
          payload: { purchase_id: compra.id, subscription_id: "subscription-ALHEIA" } as Prisma.InputJsonObject,
          compra_id: compra.id,
          subscription_id: "subscription-ALHEIA",
        },
        { transaction },
      ),
    ).rejects.toThrow(/diverge/);

    // sem mutação: não cancela assinatura, não altera compra
    expect(tx.subscriptions.update).not.toHaveBeenCalled();
    expect(tx.purchases.update).not.toHaveBeenCalled();
  });

  it("registro + aprovação na sequência concede 30 dias a partir de now (sem data arbitrária)", async () => {
    const { tx, transaction } = criarTransacaoFake();
    const now = new Date("2026-08-19T12:00:00Z");
    const compra = compraFake({ periodicidade: "mensal" });
    compra.product = produtoFake({ tipo: "assinatura", preco_mensal_cents: 1000, preco_anual_cents: 10000, preco_unico_cents: null });
    const assinatura = assinaturaFake({ periodicidade: "mensal", acesso_ate: now });

    // --- registrarAssinatura ---
    tx.purchases.findUnique.mockResolvedValueOnce(compra); // 1ª leitura: sem subscription_id
    tx.subscriptions.findUnique.mockResolvedValue(null);
    tx.subscriptions.create.mockImplementation(async ({ data }: { data: subscriptions }) => ({ ...assinatura, ...data }));
    tx.purchases.update.mockResolvedValueOnce(compra);

    const sub = await registrarAssinatura(
      { user_id: "user-1", product_id: "product-1", purchase_id: "purchase-1", periodicidade: "mensal", mp_subscription_id: "preapproval-1" },
      { transaction, now: () => now },
    );
    expect(sub.acesso_ate).toEqual(now); // acesso_ate = now; sem data arbitrária do DTO

    // --- aprovação ---
    const evento = {
      provedor: "mercado_pago" as const,
      recurso_id: "payment-seq",
      tipo_evento: "payment.approved",
      payload: { purchase_id: "purchase-1", subscription_id: sub.id } as Prisma.InputJsonObject,
      compra_id: "purchase-1",
      subscription_id: sub.id,
    };
    tx.webhook_events.create.mockResolvedValue(eventoFake({ status: "recebido", processado_em: null }));
    tx.webhook_events.findUnique.mockResolvedValue(eventoFake({ status: "recebido", processado_em: null }));
    tx.webhook_events.update.mockResolvedValue(eventoFake());
    tx.purchases.findUnique.mockResolvedValue({ ...compra, subscription_id: sub.id }); // leituras seguintes
    tx.subscriptions.findUnique.mockResolvedValue({ ...assinatura, id: sub.id, acesso_ate: now });
    tx.entitlements.findFirst.mockResolvedValue(null);
    tx.entitlements.create.mockImplementation(async ({ data }: { data: entitlements }) => ({ ...data, id: "entitlement-seq", criado_em: now, atualizado_em: now } as entitlements));
    tx.purchases.update.mockResolvedValue({ ...compra, status: "aprovado" });
    tx.subscriptions.update.mockResolvedValue({ ...assinatura, id: sub.id, acesso_ate: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000) });

    const res = await processarEventoExternoValidado(evento, { transaction, now: () => now });
    expect(res.duplicado).toBe(false);
    const chamada = tx.entitlements.create.mock.calls[0]?.[0] as { data: entitlements };
    expect(chamada.data.acesso_ate).toEqual(new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000));
  });
});

describe("marcarAssinaturasExpiradas (S6.1)", () => {
  it("marca ativa/pausada vencida como expirada", async () => {
    const { tx, transaction } = criarTransacaoFake();
    tx.subscriptions.updateMany.mockResolvedValue({ count: 2 });

    const resultado = await marcarAssinaturasExpiradas(new Date("2026-08-20T00:00:00Z"), { transaction });

    expect(resultado.count).toBe(2);
    expect(tx.subscriptions.updateMany).toHaveBeenCalledWith({
      where: { status: { in: ["ativa", "pausada"] }, acesso_ate: { lt: new Date("2026-08-20T00:00:00Z") } },
      data: { status: "expirada" },
    });
  });
});

describe("cancelarAssinatura (S6.1)", () => {
  it("cancela e registra cancelada_em", async () => {
    const { tx, transaction } = criarTransacaoFake();
    tx.subscriptions.update.mockResolvedValue(assinaturaFake({ status: "cancelada" }));

    await cancelarAssinatura("subscription-1", { transaction, now: () => AGORA });

    expect(tx.subscriptions.update).toHaveBeenCalledWith({
      where: { id: "subscription-1" },
      data: { status: "cancelada", cancelada_em: AGORA },
    });
  });
});
