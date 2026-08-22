import { db as dbPadrao } from "@/lib/db";
import type {
  entitlements,
  PurchasePeriodicidade,
  purchases,
  subscriptions,
  SubscriptionStatus,
  WebhookEventProvedor,
  webhook_events,
} from "@/generated/prisma/client";
import { Prisma } from "@/generated/prisma/client";

type Transacao = Prisma.TransactionClient;
type ExecutarTransacao = <T>(fn: (tx: Transacao) => Promise<T>) => Promise<T>;

/** Máximo de tentativas: 1 inicial + até 3 reprocessamentos. */
const MAX_TENTATIVAS = 4;

export class DomainError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DomainError";
  }
}

export interface DependenciasPagamentos {
  transaction?: ExecutarTransacao;
  now?: () => Date;
}

export interface DadosCompraPendente {
  user_id: string;
  product_id: string;
  valor_cents: number;
  periodicidade?: PurchasePeriodicidade;
  coupon_id?: string | null;
}

export interface DadosAssinatura {
  user_id: string;
  product_id: string;
  purchase_id: string;
  periodicidade: PurchasePeriodicidade;
  mp_subscription_id: string;
}

export interface EventoExternoValidado {
  provedor: WebhookEventProvedor;
  recurso_id: string;
  tipo_evento: string;
  payload: Prisma.InputJsonValue;
  compra_id?: string;
  subscription_id?: string;
  subscription_status?: SubscriptionStatus;
}

export interface ResultadoEvento {
  duplicado: boolean;
  evento: webhook_events;
  compra: purchases | null;
  entitlement: entitlements | null;
}

function transacaoPadrao(fn: (tx: Transacao) => Promise<unknown>): Promise<unknown> {
  return dbPadrao.$transaction(fn);
}

function executar(deps: DependenciasPagamentos): ExecutarTransacao {
  return deps.transaction ?? (transacaoPadrao as ExecutarTransacao);
}

function agora(deps: DependenciasPagamentos): Date {
  return deps.now?.() ?? new Date();
}

function validarTexto(valor: string, campo: string): string {
  const limpo = valor.trim();
  if (limpo === "") throw new DomainError(`${campo} é obrigatório`);
  return limpo;
}

function validarValor(valor_cents: number): void {
  if (!Number.isInteger(valor_cents) || valor_cents < 0) {
    throw new DomainError("valor_cents deve ser um inteiro não negativo");
  }
}

function sanitizarErro(erro: unknown): string {
  const raw = erro instanceof Error ? erro.message : String(erro);
  const mascarado = raw.replace(
    /(password|token|secret|authorization|apikey|api_key)\s*[:=]\s*\S+/gi,
    "$1=***",
  );
  return mascarado.slice(0, 2000);
}

function isUniqueConflict(erro: unknown): boolean {
  return erro instanceof Prisma.PrismaClientKnownRequestError && erro.code === "P2002";
}

// Locks PostgreSQL explícitos (ordem: evento → purchase → subscription → entitlement)
async function lockEvento(tx: Transacao, id: string): Promise<void> {
  await tx.$queryRaw`SELECT 1 FROM "webhook_events" WHERE "id" = ${id} FOR UPDATE`;
}
async function lockCompra(tx: Transacao, id: string): Promise<void> {
  await tx.$queryRaw`SELECT 1 FROM "purchases" WHERE "id" = ${id} FOR UPDATE`;
}
async function lockAssinatura(tx: Transacao, id: string): Promise<void> {
  await tx.$queryRaw`SELECT 1 FROM "subscriptions" WHERE "id" = ${id} FOR UPDATE`;
}
async function lockEntitlementPorSubscription(tx: Transacao, subscriptionId: string): Promise<void> {
  await tx.$queryRaw`SELECT 1 FROM "entitlements" WHERE "subscription_id" = ${subscriptionId} FOR UPDATE`;
}

// ---------------------------------------------------------------------------
// Persistência do evento em transação curta e separada (antes dos efeitos)
// ---------------------------------------------------------------------------
async function persistirEvento(
  evento: EventoExternoValidado,
  recurso_id: string,
  tipo_evento: string,
  deps: DependenciasPagamentos,
): Promise<webhook_events> {
  const executarTransacao = executar(deps);
  try {
    return await executarTransacao(async (tx) =>
      tx.webhook_events.create({
        data: {
          provedor: evento.provedor,
          recurso_id,
          tipo_evento,
          status: "recebido",
          payload: evento.payload,
        },
      }),
    );
  } catch (erro) {
    if (isUniqueConflict(erro)) {
      const existente = await executarTransacao(async (tx) =>
        tx.webhook_events.findUnique({
          where: {
            provedor_recurso_id_tipo_evento: { provedor: evento.provedor, recurso_id, tipo_evento },
          },
        }),
      );
      if (existente) return existente;
    }
    throw erro;
  }
}

// Fallback de falha em transação separada, para os casos em que a transação
// de efeitos abortou antes de persistir a falha (ex.: a própria persistência
// da falha falhou, ou houve serialização/rollback). `updateMany` com `where`
// condicional:
//  - `status: { not: "processado" }` → jamais sobrescreve um evento já
//    `processado` (a falha de um evento já concluído não o reabre);
//  - `tentativas: { lt: MAX_TENTATIVAS }` → jamais permite a 5ª tentativa
//    (1 inicial + 3 retries);
//  - `updateMany` (não `update`) → não lança P2025 em corrida quando o
//    `where` não encontra linha (apenas afeta 0 registros).
// Best-effort: nunca mascara o erro original.
async function registrarFalha(
  eventoId: string,
  erro: unknown,
  deps: DependenciasPagamentos,
): Promise<void> {
  const executarTransacao = executar(deps);
  try {
    await executarTransacao(async (tx) =>
      tx.webhook_events.updateMany({
        where: { id: eventoId, status: { not: "processado" }, tentativas: { lt: MAX_TENTATIVAS } },
        data: {
          status: "falhou",
          tentativas: { increment: 1 },
          ultimo_erro: sanitizarErro(erro),
        },
      }),
    );
  } catch {
    // best-effort: ignora qualquer erro de persistência da falha (updateMany
    // não lança P2025; o `where` já impede sobrescrever processado / 5ª tentativa)
  }
}

// ---------------------------------------------------------------------------
// Validações de produto na INTENÇÃO de compra (snapshot é fonte de verdade)
// ---------------------------------------------------------------------------
function validarCompatibilidadeProduto(
  produto: { tipo: "assinatura" | "venda_unica"; preco_mensal_cents: number | null; preco_anual_cents: number | null; preco_unico_cents: number | null },
  compra: { periodicidade: PurchasePeriodicidade | null; valor_cents: number },
): void {
  if (produto.tipo === "assinatura") {
    if (!compra.periodicidade) throw new DomainError("assinatura exige periodicidade");
    const preco = compra.periodicidade === "mensal" ? produto.preco_mensal_cents : produto.preco_anual_cents;
    if (preco == null) throw new DomainError("preço de assinatura não configurado");
    if (compra.valor_cents !== preco) throw new DomainError("valor não confere com o preço do produto");
  } else {
    if (compra.periodicidade) throw new DomainError("venda única não admite periodicidade");
    if (produto.preco_unico_cents == null) throw new DomainError("preço de venda única não configurado");
    if (compra.valor_cents !== produto.preco_unico_cents) throw new DomainError("valor não confere com o preço da venda única");
  }
}

// ---------------------------------------------------------------------------
// Compra pendente (intenção de checkout) — sem conceder acesso
// ---------------------------------------------------------------------------
export async function criarCompraPendente(
  dados: DadosCompraPendente,
  deps: DependenciasPagamentos = {},
): Promise<purchases> {
  const user_id = validarTexto(dados.user_id, "user_id");
  const product_id = validarTexto(dados.product_id, "product_id");
  validarValor(dados.valor_cents);

  return executar(deps)(async (tx) => {
    const produto = await tx.products.findUnique({ where: { id: product_id } });
    if (!produto) throw new DomainError("produto não encontrado");
    if (produto.status !== "ativo") throw new DomainError("produto inativo");
    validarCompatibilidadeProduto(produto, {
      periodicidade: dados.periodicidade ?? null,
      valor_cents: dados.valor_cents,
    });

    // P6/R9: bloquear intenção duplicada de venda única já aprovada
    if (produto.tipo === "venda_unica") {
      const duplicada = await tx.purchases.findFirst({
        where: { user_id, product_id, tipo: "checkout", status: "aprovado", subscription_id: null },
      });
      if (duplicada) throw new DomainError("já existe uma compra aprovada para este produto de venda única");
    }

    return tx.purchases.create({
      data: {
        user_id,
        product_id,
        entitlement_id: null,
        subscription_id: null,
        mp_payment_id: null,
        tipo: "checkout",
        periodicidade: dados.periodicidade ?? null,
        status: "pendente",
        valor_cents: dados.valor_cents,
        coupon_id: dados.coupon_id ?? null,
      },
    });
  });
}

// ---------------------------------------------------------------------------
// Registro de assinatura vinculada a uma compra pendente
// ---------------------------------------------------------------------------
export async function registrarAssinatura(
  dados: DadosAssinatura,
  deps: DependenciasPagamentos = {},
): Promise<subscriptions> {
  const user_id = validarTexto(dados.user_id, "user_id");
  const product_id = validarTexto(dados.product_id, "product_id");
  const purchase_id = validarTexto(dados.purchase_id, "purchase_id");
  const mp_subscription_id = validarTexto(dados.mp_subscription_id, "mp_subscription_id");

  return executar(deps)(async (tx) => {
    await lockCompra(tx, purchase_id);
    const compra = await tx.purchases.findUnique({
      where: { id: purchase_id },
      include: { product: true },
    });
    if (!compra) throw new DomainError("compra não encontrada");
    if (compra.status !== "pendente") throw new DomainError("compra deve estar pendente");
    if (compra.user_id !== user_id) throw new DomainError("compra não pertence ao usuário");
    if (compra.product_id !== product_id) throw new DomainError("compra não pertence ao produto");
    // Não sobrescrever vínculo já existente
    if (compra.subscription_id) throw new DomainError("compra já possui subscription_id vinculada");
    const produto = compra.product;
    if (!produto || produto.tipo !== "assinatura") throw new DomainError("produto não é assinatura");
    if (compra.periodicidade !== dados.periodicidade) throw new DomainError("periodicidade não confere com a compra");

    // Não transferir/reanimar assinatura existente
    const existente = await tx.subscriptions.findUnique({ where: { mp_subscription_id } });
    if (existente) throw new DomainError("assinatura já registrada para este mp_subscription_id");

    // Primeira contratação: acesso_ate = agora. Somente a primeira aprovação
    // (em aprovarAssinatura) concede o período de 30/365 dias. O DTO não
    // informa data arbitrária; o serviço é a fonte do acesso_ate.
    const assinatura = await tx.subscriptions.create({
      data: {
        user_id,
        product_id,
        periodicidade: dados.periodicidade,
        mp_subscription_id,
        status: "ativa",
        acesso_ate: agora(deps),
      },
    });
    await tx.purchases.update({ where: { id: purchase_id }, data: { subscription_id: assinatura.id } });
    return assinatura;
  });
}

// ---------------------------------------------------------------------------
// Aprovação de compra (máquina de estados + concessão de acesso)
// ---------------------------------------------------------------------------
async function aprovarCompra(
  tx: Transacao,
  evento: EventoExternoValidado,
  deps: DependenciasPagamentos,
): Promise<{ compra: purchases; entitlement: entitlements | null }> {
  if (!evento.compra_id) throw new DomainError("compra_id é obrigatório para aprovar o pagamento");
  await lockCompra(tx, evento.compra_id);
  const compra = await tx.purchases.findUnique({
    where: { id: evento.compra_id },
    include: { product: true },
  });
  if (!compra) throw new DomainError("compra não encontrada");

  // Conversão pendente somente uma vez; não reativar recusada/reembolsada
  if (compra.status === "aprovado") {
    const entitlement = compra.entitlement_id
      ? await tx.entitlements.findUnique({ where: { id: compra.entitlement_id } })
      : null;
    return { compra, entitlement };
  }
  if (compra.status === "recusado" || compra.status === "reembolsado") {
    return { compra, entitlement: null };
  }
  if (compra.status !== "pendente") throw new DomainError(`status de compra inesperado: ${compra.status}`);

  const produto = compra.product;
  if (!produto) throw new DomainError("produto não encontrado");

  // Integridade: mp_payment_id não pode divergir do recurso do evento
  if (compra.mp_payment_id && compra.mp_payment_id !== evento.recurso_id) {
    throw new DomainError("mp_payment_id da compra diverge do recurso do evento");
  }

  // Decisão pelo tipo do produto (snapshot da purchase é fonte de verdade;
  // não se revalida preço/ativo do produto na aprovação).
  if (produto.tipo === "assinatura") return aprovarAssinatura(tx, compra, evento, deps);
  return aprovarVendaUnica(tx, compra, evento);
}

async function aprovarVendaUnica(
  tx: Transacao,
  compra: purchases,
  evento: EventoExternoValidado,
): Promise<{ compra: purchases; entitlement: entitlements }> {
  const entitlement = await tx.entitlements.create({
    data: {
      user_id: compra.user_id,
      product_id: compra.product_id,
      origem: "pagamento",
      acesso_ate: null,
    },
  });
  const compraAtualizada = await tx.purchases.update({
    where: { id: compra.id },
    data: {
      status: "aprovado",
      entitlement_id: entitlement.id,
      mp_payment_id: evento.recurso_id,
    },
  });
  return { compra: compraAtualizada, entitlement };
}

async function aprovarAssinatura(
  tx: Transacao,
  compra: purchases,
  evento: EventoExternoValidado,
  deps: DependenciasPagamentos,
): Promise<{ compra: purchases; entitlement: entitlements }> {
  if (!compra.subscription_id) throw new DomainError("compra de assinatura exige subscription_id");
  if (!evento.subscription_id) throw new DomainError("evento de assinatura exige subscription_id");
  if (evento.subscription_id !== compra.subscription_id) {
    throw new DomainError("subscription_id do evento não confere com a compra");
  }
  await lockAssinatura(tx, compra.subscription_id);
  const assinatura = await tx.subscriptions.findUnique({ where: { id: compra.subscription_id } });
  if (!assinatura) throw new DomainError("assinatura não encontrada");
  if (assinatura.user_id !== compra.user_id) throw new DomainError("assinatura não pertence ao comprador");
  if (assinatura.product_id !== compra.product_id) throw new DomainError("assinatura não pertence ao produto da compra");
  if (assinatura.periodicidade !== compra.periodicidade) {
    throw new DomainError("periodicidade da assinatura não confere com a compra");
  }

  await lockEntitlementPorSubscription(tx, assinatura.id);
  const existente = await tx.entitlements.findFirst({ where: { subscription_id: assinatura.id } });

  const agoraMs = agora(deps).getTime();
  const base = Math.max(
    agoraMs,
    assinatura.acesso_ate.getTime(),
    existente?.acesso_ate ? existente.acesso_ate.getTime() : 0,
  );
  const dias = compra.periodicidade === "mensal" ? 30 : 365;
  const acesso_ate = new Date(base + dias * 24 * 60 * 60 * 1000);

  let entitlement: entitlements;
  if (existente) {
    // Não reativar/estender assinatura cancelada
    entitlement =
      assinatura.status === "cancelada"
        ? existente
        : await tx.entitlements.update({ where: { id: existente.id }, data: { acesso_ate } });
  } else {
    entitlement = await tx.entitlements.create({
      data: {
        user_id: compra.user_id,
        product_id: compra.product_id,
        subscription_id: assinatura.id,
        origem: "pagamento",
        acesso_ate,
      },
    });
  }

  const compraAtualizada = await tx.purchases.update({
    where: { id: compra.id },
    data: {
      status: "aprovado",
      entitlement_id: entitlement.id,
      mp_payment_id: evento.recurso_id,
    },
  });

  // Pagamento não reativa cancelada; pausada mantém-se pausada; expirada/ativa → ativa
  if (assinatura.status !== "cancelada") {
    const novoStatus: SubscriptionStatus = assinatura.status === "pausada" ? "pausada" : "ativa";
    await tx.subscriptions.update({
      where: { id: assinatura.id },
      data: { acesso_ate, status: novoStatus },
    });
  }
  return { compra: compraAtualizada, entitlement };
}

async function recusarCompra(
  tx: Transacao,
  evento: EventoExternoValidado,
): Promise<{ compra: purchases; entitlement: entitlements | null }> {
  if (!evento.compra_id) throw new DomainError("compra_id é obrigatório para recusar");
  await lockCompra(tx, evento.compra_id);
  const compra = await tx.purchases.findUnique({ where: { id: evento.compra_id } });
  if (!compra) throw new DomainError("compra não encontrada");
  if (compra.status === "pendente") {
    const atualizada = await tx.purchases.update({
      where: { id: compra.id },
      data: { status: "recusado", mp_payment_id: evento.recurso_id },
    });
    return { compra: atualizada, entitlement: null };
  }
  return { compra, entitlement: null };
}

async function processarRecibo(
  tx: Transacao,
  evento: EventoExternoValidado,
  deps: DependenciasPagamentos,
): Promise<{ compra: purchases; entitlement: entitlements | null }> {
  if (!evento.compra_id) throw new DomainError("compra_id é obrigatório para reembolso");
  await lockCompra(tx, evento.compra_id);
  const compra = await tx.purchases.findUnique({
    where: { id: evento.compra_id },
    include: { product: true },
  });
  if (!compra) throw new DomainError("compra não encontrada");

  // Refund de pendente deve falhar reprocessável
  if (compra.status === "pendente") {
    throw new DomainError("não é possível reembolsar uma compra pendente");
  }
  // Recusada: não vira reembolsada nem cancela assinatura (mantém estado)
  if (compra.status === "recusado") {
    return { compra, entitlement: null };
  }
  if (compra.status === "reembolsado") {
    const entitlement = compra.entitlement_id
      ? await tx.entitlements.findUnique({ where: { id: compra.entitlement_id } })
      : null;
    return { compra, entitlement };
  }

  // status aprovado — decide pelo TIPO DO PRODUTO (não pela presença de subscription_id)
  const produto = compra.product;
  if (!produto) throw new DomainError("produto não encontrado");

  if (produto.tipo === "assinatura") {
    // Se o evento traz subscription_id, ele deve bater com o da compra;
    // divergência é erro sem mutação. Caso contrário, usa o vínculo da compra.
    if (evento.subscription_id && evento.subscription_id !== compra.subscription_id) {
      throw new DomainError("evento.subscription_id diverge da compra");
    }
    const subscription_id = compra.subscription_id;
    if (!subscription_id) throw new DomainError("compra de assinatura exige subscription_id");
    await lockAssinatura(tx, subscription_id);
    const assinatura = await tx.subscriptions.findUnique({ where: { id: subscription_id } });
    if (!assinatura) throw new DomainError("assinatura não encontrada");
    if (assinatura.user_id !== compra.user_id) throw new DomainError("assinatura não pertence ao comprador");
    if (assinatura.product_id !== compra.product_id) throw new DomainError("assinatura não pertence ao produto da compra");
    await tx.subscriptions.update({
      where: { id: subscription_id },
      data: { status: "cancelada", cancelada_em: agora(deps) },
    });
    const atualizada = await tx.purchases.update({
      where: { id: compra.id },
      data: { status: "reembolsado" },
    });
    const entitlement = compra.entitlement_id
      ? await tx.entitlements.findUnique({ where: { id: compra.entitlement_id } })
      : null;
    return { compra: atualizada, entitlement };
  }

  // venda única: remove o entitlement (revoga acesso permanente)
  if (compra.entitlement_id) {
    await tx.entitlements.delete({ where: { id: compra.entitlement_id } });
  }
  const atualizada = await tx.purchases.update({
    where: { id: compra.id },
    data: { status: "reembolsado", entitlement_id: null },
  });
  return { compra: atualizada, entitlement: null };
}

async function atualizarEstadoAssinatura(
  tx: Transacao,
  evento: EventoExternoValidado,
  status: SubscriptionStatus,
  deps: DependenciasPagamentos,
): Promise<{ compra: purchases | null; entitlement: entitlements | null }> {
  if (!evento.subscription_id) throw new DomainError("subscription_id é obrigatório");
  await lockAssinatura(tx, evento.subscription_id);
  const assinatura = await tx.subscriptions.findUnique({ where: { id: evento.subscription_id } });
  if (!assinatura) throw new DomainError("assinatura não encontrada");
  // Não reativar cancelada nem limpar cancelada_em
  if (assinatura.status === "cancelada") return { compra: null, entitlement: null };
  const data: Prisma.subscriptionsUpdateInput = { status };
  if (status === "cancelada") data.cancelada_em = agora(deps);
  await tx.subscriptions.update({ where: { id: assinatura.id }, data });
  return { compra: null, entitlement: null };
}

async function aplicarEfeitos(
  tx: Transacao,
  evento: EventoExternoValidado,
  deps: DependenciasPagamentos,
): Promise<{ compra: purchases | null; entitlement: entitlements | null }> {
  switch (evento.tipo_evento) {
    case "payment.approved":
      return aprovarCompra(tx, evento, deps);
    case "payment.refused":
      return recusarCompra(tx, evento);
    case "refund":
      return processarRecibo(tx, evento, deps);
    case "subscription.cancelled":
      return atualizarEstadoAssinatura(tx, evento, "cancelada", deps);
    case "subscription.paused":
      return atualizarEstadoAssinatura(tx, evento, "pausada", deps);
    case "subscription.updated":
      if (!evento.subscription_status) {
        throw new DomainError("subscription.updated exige subscription_status");
      }
      return atualizarEstadoAssinatura(tx, evento, evento.subscription_status, deps);
    default:
      throw new DomainError(`tipo de evento não suportado: ${evento.tipo_evento}`);
  }
}

// ---------------------------------------------------------------------------
// Processamento de evento externo (idempotente + retry persistido)
// ---------------------------------------------------------------------------
export async function processarEventoExternoValidado(
  evento: EventoExternoValidado,
  deps: DependenciasPagamentos = {},
): Promise<ResultadoEvento> {
  const recurso_id = validarTexto(evento.recurso_id, "recurso_id");
  const tipo_evento = validarTexto(evento.tipo_evento, "tipo_evento");
  const executarTransacao = executar(deps);

  // 1. Persistir evento em transação curta e separada (recupera em caso de race)
  const eventoPersistido = await persistirEvento(evento, recurso_id, tipo_evento, deps);

  // 2. Evento já processado = no-op duplicado terminal
  if (eventoPersistido.status === "processado") {
    return { duplicado: true, evento: eventoPersistido, compra: null, entitlement: null };
  }

  // 3. Limite de tentativas atingido: não reprocessar
  if (eventoPersistido.tentativas >= MAX_TENTATIVAS) {
    return { duplicado: true, evento: eventoPersistido, compra: null, entitlement: null };
  }

  // 4. Efeitos em transação com locks explícitos
  type ResultadoInterno =
    | { tipo: "ok"; resultado: ResultadoEvento }
    | { tipo: "duplicado"; resultado: ResultadoEvento }
    | { tipo: "falha"; erro: unknown };

  let interno: ResultadoInterno;
  try {
    interno = await executarTransacao(async (tx) => {
      await lockEvento(tx, eventoPersistido.id);
      const ev = await tx.webhook_events.findUnique({ where: { id: eventoPersistido.id } });
      if (!ev) throw new DomainError("evento não encontrado");
      // Reavalia após o lock: terminal ou limite já atingido (nunca 5ª tentativa)
      if (ev.status === "processado") {
        return { tipo: "duplicado", resultado: { duplicado: true, evento: ev, compra: null, entitlement: null } };
      }
      if (ev.tentativas >= MAX_TENTATIVAS) {
        return { tipo: "duplicado", resultado: { duplicado: true, evento: ev, compra: null, entitlement: null } };
      }
      try {
        const efeitos = await aplicarEfeitos(tx, evento, deps);
        // Sucesso: marca processado E conta a tentativa (1 inicial + reprocessamentos).
        // `updateMany` com `where` condicional (status != processado) evita P2025
        // em corrida; re-leitura obtém a linha para o resultado (updateMany não
        // a retorna). Sob o lock, o `where` sempre casa exatamente 1 linha.
        await tx.webhook_events.updateMany({
          where: { id: ev.id, status: { not: "processado" } },
          data: { status: "processado", processado_em: agora(deps), tentativas: { increment: 1 } },
        });
        const processado = await tx.webhook_events.findUnique({ where: { id: ev.id } });
        if (!processado) throw new DomainError("evento não encontrado após processar");
        return {
          tipo: "ok",
          resultado: { duplicado: false, evento: processado, compra: efeitos.compra, entitlement: efeitos.entitlement },
        };
      } catch (erroEfe) {
        // Falha persistida DENTRO da transação que retém o lock (não solta antes
        // de commitar). `updateMany` com `where` condicional evita P2025 em
        // corrida e impede a 5ª tentativa (`tentativas: { lt: MAX_TENTATIVAS }`).
        // O erro só é propagado APÓS o commit da falha — jamais antes de
        // persistir a falha de domínio.
        await tx.webhook_events.updateMany({
          where: { id: ev.id, status: { not: "processado" }, tentativas: { lt: MAX_TENTATIVAS } },
          data: {
            status: "falhou",
            tentativas: { increment: 1 },
            ultimo_erro: sanitizarErro(erroEfe),
          },
        });
        return { tipo: "falha", erro: erroEfe };
      }
    });
  } catch (erro) {
    // Transação abortou antes de persistir a falha (ex.: erro no update de falha):
    // fallback condicional, sem P2025, sem sobrescrever processado.
    await registrarFalha(eventoPersistido.id, erro, deps);
    throw erro;
  }

  if (interno.tipo === "falha") {
    throw interno.erro; // falha já persistida; propaga para a rota responder 500
  }
  return interno.resultado;
}

// ---------------------------------------------------------------------------
// Expiração de assinaturas (domínio puro; sem job/rota)
// ---------------------------------------------------------------------------
export async function marcarAssinaturasExpiradas(
  now: Date,
  deps: DependenciasPagamentos = {},
): Promise<{ count: number }> {
  const resultado = await executar(deps)(async (tx) =>
    tx.subscriptions.updateMany({
      where: { status: { in: ["ativa", "pausada"] }, acesso_ate: { lt: now } },
      data: { status: "expirada" },
    }),
  );
  return { count: resultado.count };
}

export async function cancelarAssinatura(
  subscription_id: string,
  deps: DependenciasPagamentos = {},
): Promise<subscriptions> {
  const id = validarTexto(subscription_id, "subscription_id");
  return executar(deps)(async (tx) =>
    tx.subscriptions.update({
      where: { id },
      data: { status: "cancelada", cancelada_em: agora(deps) },
    }),
  );
}
