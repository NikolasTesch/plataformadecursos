// Cliente server-side do Mercado Pago — S6.2, SPEC-pagamentos.md v0.7.
//
// Server-only por convenção: lê MP_ACCESS_TOKEN/MP_WEBHOOK_SECRET do ambiente e
// NUNCA os exporta. Usa fetch + node:crypto; não instala SDK/dependência.
// Cobrança: venda única via Checkout Pro (/checkout/preferences) e assinatura
// recorrente via Subscriptions/preapproval (/preapproval). Pix fica restrito à
// venda única (P9/P19). Webhook valida HMAC-SHA256 sobre o manifesto oficial.
import { createHmac, timingSafeEqual } from "node:crypto";

const MP_API_BASE = "https://api.mercadopago.com";

export class ErroMercadoPago extends Error {
  readonly status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = "ErroMercadoPago";
    this.status = status;
  }
}

function token(): string {
  const t = process.env.MP_ACCESS_TOKEN?.trim();
  if (!t) throw new Error("Mercado Pago não configurado: defina MP_ACCESS_TOKEN");
  return t;
}

async function chamarMP<T>(method: string, path: string, body?: unknown): Promise<T> {
  const resposta = await fetch(`${MP_API_BASE}${path}`, {
    method,
    headers: { Authorization: `Bearer ${token()}`, "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!resposta.ok) {
    throw new ErroMercadoPago(`Mercado Pago recusou ${method} ${path} (${resposta.status})`, resposta.status);
  }
  return (await resposta.json()) as T;
}

function reais(cents: number): number {
  return Number((cents / 100).toFixed(2));
}

function extrairInitPoint(res: { init_point?: unknown; sandbox_init_point?: unknown }): string {
  const candidato = typeof res.init_point === "string" ? res.init_point : res.sandbox_init_point;
  if (typeof candidato !== "string" || !/^https?:\/\//.test(candidato)) {
    throw new Error("Mercado Pago não devolveu init_point válido");
  }
  return candidato;
}

// ---------------------------------------------------------------------------
// Venda única — Checkout Pro (cartão + Pix, exclusivo deste fluxo)
// ---------------------------------------------------------------------------
export interface DadosPreferenciaVendaUnica {
  external_reference: string; // purchases.id
  valor_cents: number;
  descricao: string;
  notification_url?: string;
  back_urls?: { success?: string; failure?: string; pending?: string };
}

export interface PreferenciaCriada {
  id: string;
  init_point: string;
}

export async function criarPreferenciaVendaUnica(dados: DadosPreferenciaVendaUnica): Promise<PreferenciaCriada> {
  const corpo = {
    items: [
      {
        title: dados.descricao,
        currency_id: "BRL",
        quantity: 1,
        unit_price: reais(dados.valor_cents),
      },
    ],
    external_reference: dados.external_reference,
    notification_url: dados.notification_url,
    back_urls: dados.back_urls,
    auto_return: dados.back_urls ? "all" : undefined,
  };
  const res = await chamarMP<{ id?: unknown; init_point?: unknown; sandbox_init_point?: unknown }>(
    "POST",
    "/checkout/preferences",
    corpo,
  );
  if (typeof res.id !== "string" || res.id.trim() === "") {
    throw new Error("Mercado Pago não devolveu preference id válido");
  }
  return { id: res.id, init_point: extrairInitPoint(res) };
}

// ---------------------------------------------------------------------------
// Assinatura recorrente — Subscriptions/preapproval (mensal ou anual)
// ---------------------------------------------------------------------------
export type PeriodicidadeMP = "mensal" | "anual";

export interface DadosPreapproval {
  external_reference: string; // purchases.id
  payer_email: string;
  reason: string;
  back_url?: string;
  valor_cents: number;
  periodicidade: PeriodicidadeMP;
}

export async function criarAssinaturaPreapproval(dados: DadosPreapproval): Promise<PreferenciaCriada> {
  const corpo = {
    external_reference: dados.external_reference,
    payer_email: dados.payer_email,
    reason: dados.reason,
    back_url: dados.back_url,
    status: "pending",
    auto_recurring: {
      frequency: 1,
      frequency_type: dados.periodicidade === "anual" ? "years" : "months",
      currency_id: "BRL",
      transaction_amount: reais(dados.valor_cents),
    },
  };
  const res = await chamarMP<{ id?: unknown; init_point?: unknown; sandbox_init_point?: unknown }>(
    "POST",
    "/preapproval",
    corpo,
  );
  if (typeof res.id !== "string" || res.id.trim() === "") {
    throw new Error("Mercado Pago não devolveu preapproval id válido");
  }
  return { id: res.id, init_point: extrairInitPoint(res) };
}

// ---------------------------------------------------------------------------
// Consulta server-side do recurso (nunca confia no corpo da notificação)
// ---------------------------------------------------------------------------
export interface PagamentoMP {
  id: string | number;
  status: string;
  external_reference: string | null;
  [chave: string]: unknown;
}

export interface PreapprovalMP {
  id: string;
  status: string;
  external_reference: string | null;
  [chave: string]: unknown;
}

export interface AuthorizedPaymentMP {
  id: string | number;
  status: string;
  external_reference: string | null;
  preapproval_id: string | null;
  [chave: string]: unknown;
}

export async function consultarPagamentoMP(id: string): Promise<PagamentoMP> {
  return chamarMP<PagamentoMP>("GET", `/v1/payments/${encodeURIComponent(id)}`);
}

export async function consultarPreapprovalMP(id: string): Promise<PreapprovalMP> {
  return chamarMP<PreapprovalMP>("GET", `/preapproval/${encodeURIComponent(id)}`);
}

export async function consultarAuthorizedPaymentMP(id: string): Promise<AuthorizedPaymentMP> {
  return chamarMP<AuthorizedPaymentMP>("GET", `/authorized_payments/${encodeURIComponent(id)}`);
}

// ---------------------------------------------------------------------------
// Validação HMAC do webhook (manifesto oficial MP v1)
// ---------------------------------------------------------------------------

/** Extrai ts/v1 do header x-signature. Retorna null se ausente/mal formado. */
export function extrairTsV1(xSignature: string | null): { ts: string; v1: string } | null {
  if (!xSignature) return null;
  const ts = xSignature.match(/ts=([^,]+)/)?.[1];
  const v1 = xSignature.match(/v1=([^,]+)/)?.[1];
  if (!ts || !v1) return null;
  return { ts, v1 };
}

export interface ParametrosAssinaturaMP {
  recursoId: string;
  ts: string;
  v1: string;
  xRequestId: string | null;
  secret: string | undefined;
}

/**
 * Valida a assinatura HMAC-SHA256 do Mercado Pago.
 * Manifesto: `id:{data.id lower-case};request-id:{x-request-id};ts:{ts};`
 * Comparação timing-safe; nunca vaza o segredo.
 */
export function validarAssinaturaMercadoPago(params: ParametrosAssinaturaMP): boolean {
  const { recursoId, ts, v1, xRequestId, secret } = params;
  if (!secret || !v1 || !ts || !recursoId) return false;
  const manifesto = `id:${recursoId.toLowerCase()};request-id:${xRequestId ?? ""};ts:${ts};`;
  const esperada = createHmac("sha256", secret).update(manifesto).digest();
  let candidata: Buffer;
  try {
    candidata = Buffer.from(v1, "hex");
  } catch {
    return false;
  }
  return candidata.length === esperada.length && timingSafeEqual(esperada, candidata);
}
