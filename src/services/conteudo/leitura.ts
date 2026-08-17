// Leitura de material — todo 9 do plano s2-conteudo.
//
// Resolve o ACESSO a um material para a página de leitura (`/app/cursos/[slug]/
// materiais/[id]`) e para a impressão PDF (US-41): gating MÍNIMO (subset
// R1-R4, src/services/gating) avaliado ANTES de qualquer conteúdo (R12) e URL
// assinada (C5 — storage) emitida SOMENTE no ramo permitido.
//
// Arquitetura (D-L1): TUDO entra como DADO (material/curso/entitlements) e a
// URL assinada é INJETADA via `deps.criarUrlAssinada` (default:
// getStorage().createSignedUrl). Assim a decisão é testável SEM banco e SEM
// mock de rota: os testes unitários provam o contrato C5 (URL só quando
// permitido) diretamente na lógica — a página/rota não chamam storage de
// outra forma (é o único ponto de emissão).
//
// O caller (página/rota) monta os shapes a partir do Prisma e passa a sessão
// já verificada (auth() + verificarSessaoValida, padrão S1). `sessaoValida`
// entra como dado por defesa em profundidade: sessão inválida → nunca conteúdo.
import { getStorage } from "@/lib/storage";
import {
  podeAcessarMaterial,
  type CursoGating,
  type EntitlementGating,
  type MotivoGating,
  type ResultadoGating,
  type TipoProduto,
} from "@/services/gating";

// ---------------------------------------------------------------------------
// Tipos
// ---------------------------------------------------------------------------

export type TipoMaterialLeitura = "pdf" | "texto" | "resumo" | "video" | "questoes";

/** Shape mínimo do material para leitura (satisfeito estruturalmente pela row Prisma). */
export interface MaterialLeitura {
  id: string;
  titulo: string;
  tipo: TipoMaterialLeitura;
  status: "rascunho" | "publicado";
  amostra: boolean;
  conteudo_html: string | null;
  arquivo_key: string | null;
}

/** Contexto completo da decisão de leitura (tudo como DADO — D-G2). */
export interface ContextoLeituraMaterial {
  userId: string;
  sessaoValida: boolean;
  material: MaterialLeitura | null;
  curso: CursoGating | null;
  entitlements: EntitlementGating[];
}

/** Estado da decisão (D-L2): tríade usada pelas rotas e testada em unidade. */
export type EstadoLeituraMaterial = "conteudo" | "bloqueado" | "nao_encontrado";

export type ResultadoLeituraMaterial =
  | { estado: "nao_encontrado" }
  | { estado: "bloqueado"; motivo: MotivoGating }
  | {
      estado: "conteudo";
      material: MaterialLeitura;
      motivo: MotivoGating;
      /** C5: URL assinada (10 min) — SOMENTE quando tipo pdf tem arquivo_key; senão null. */
      urlPdf: string | null;
    };

export interface DepsLeituraMaterial {
  /** Relógio injetável (mesmo padrão do gating) — determinismo em testes. */
  agora?: Date;
  /** Emissor da URL assinada (C5). Default: storage real. Testes injetam spy. */
  criarUrlAssinada?: (chave: string) => Promise<string>;
}

/** Linha de entitlement vinda do Prisma (findMany com include product) — D-G3. */
export interface LinhaEntitlementGating {
  id: string;
  origem: EntitlementGating["origem"];
  acesso_ate: Date | null;
  product_id: string;
  product: {
    tipo: TipoProduto;
    curso_id: string | null;
    status: "ativo" | "inativo";
  } | null;
}

/**
 * Monta o shape `EntitlementGating[]` a partir das linhas do Prisma (D-G3):
 * entitlements com product AUSENTE ou product `inativo` são descartados —
 * o subset R1-R4 exige produto ativo para conceder (checagem do S3 completa
 * o resto). `origem` pagamento|trial|admin: todas contam igual.
 */
export function montarEntitlementsGating(linhas: LinhaEntitlementGating[]): EntitlementGating[] {
  const resultado: EntitlementGating[] = [];
  for (const linha of linhas) {
    if (linha.product === null || linha.product.status !== "ativo") continue;
    resultado.push({
      id: linha.id,
      origem: linha.origem,
      acesso_ate: linha.acesso_ate,
      product_id: linha.product_id,
      product: { tipo: linha.product.tipo, curso_id: linha.product.curso_id },
    });
  }
  return resultado;
}

// ---------------------------------------------------------------------------
// Decisão pura (função exportada para testes unitários)
// ---------------------------------------------------------------------------

export interface ParametrosResolverAcesso {
  sessaoValida: boolean;
  material: MaterialLeitura | null;
  /** Resultado do gating (null quando não há material/curso para avaliar). */
  resultadoGating: ResultadoGating | null;
}

/**
 * DECISÃO PURA do estado de leitura (D-L2) — testável sem banco/rota:
 *
 *   sessão inválida        → "nao_encontrado"  (defesa em profundidade: nunca
 *                                                 conteúdo sem sessão válida)
 *   material/curso ausente → "nao_encontrado"  (404)
 *   gating NEGADO          → "bloqueado"       (R12 — caller não envia conteúdo)
 *   gating APROVADO        → "conteudo"        (único caminho que emite URL C5)
 */
export function resolverAcessoMaterial(
  params: ParametrosResolverAcesso,
): EstadoLeituraMaterial {
  if (!params.sessaoValida) return "nao_encontrado";
  if (params.material === null || params.resultadoGating === null) return "nao_encontrado";
  return params.resultadoGating.permitido ? "conteudo" : "bloqueado";
}

/** Roda o gating mínimo quando material+curso existem; senão null. */
export function resolverGatingMaterial(
  ctx: Pick<ContextoLeituraMaterial, "userId" | "material" | "curso" | "entitlements">,
  deps: { agora?: Date } = {},
): ResultadoGating | null {
  const { material, curso } = ctx;
  if (material === null || curso === null) return null;
  return podeAcessarMaterial(
    {
      userId: ctx.userId,
      material,
      curso,
      entitlements: ctx.entitlements,
    },
    { agora: deps.agora },
  );
}

// ---------------------------------------------------------------------------
// Resolução completa (usada pela página de leitura)
// ---------------------------------------------------------------------------

/**
 * Resolve o acesso e prepara o conteúdo para renderização.
 *
 * Ordem (R12/C5 — gating ANTES de tudo):
 *   1. gating mínimo (resolverGatingMaterial);
 *   2. decisão pura (resolverAcessoMaterial);
 *   3. "nao_encontrado" → 404; "bloqueado" → card de bloqueio (sem conteúdo);
 *   4. "conteudo" → SOMENTE AQUI, e apenas para tipo pdf com arquivo_key,
 *      emite a URL assinada via `deps.criarUrlAssinada` (C5 — 10 min).
 *
 * A página de leitura chama esta função e renderiza conforme o resultado —
 * ela é o ÚNICO ponto que emite URL de conteúdo (C5 testado em unidade).
 */
export async function resolverLeituraMaterial(
  ctx: ContextoLeituraMaterial,
  deps: DepsLeituraMaterial = {},
): Promise<ResultadoLeituraMaterial> {
  const resultadoGating = resolverGatingMaterial(ctx, deps);
  const estado = resolverAcessoMaterial({
    sessaoValida: ctx.sessaoValida,
    material: ctx.material,
    resultadoGating,
  });

  if (estado === "nao_encontrado") return { estado: "nao_encontrado" };

  const motivo = resultadoGating?.motivo ?? "bloqueado";
  if (estado === "bloqueado") return { estado: "bloqueado", motivo };

  // estado === "conteudo" — material garantidamente presente.
  const material = ctx.material;
  if (material === null) return { estado: "nao_encontrado" };

  // C5: URL assinada SOMENTE no ramo permitido, e só para PDF com arquivo.
  const criarUrlAssinada =
    deps.criarUrlAssinada ?? ((chave: string) => getStorage().createSignedUrl(chave));
  let urlPdf: string | null = null;
  if (material.tipo === "pdf" && material.arquivo_key !== null) {
    urlPdf = await criarUrlAssinada(material.arquivo_key);
  }

  return { estado: "conteudo", material, motivo, urlPdf };
}
