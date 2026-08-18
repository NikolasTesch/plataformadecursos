// Fronteira estável do motor de gating. `podeAcessarMaterial` mantém o
// contrato S2; `avaliarAcesso` expõe o resultado enriquecido do S3.1.

import { avaliarAcesso, type EntradaAvaliacao, type ResultadoGating as ResultadoComRegra } from "./engine";
import { chaveCache, guardarCache, obterCache } from "./cache";

export type OrigemEntitlement = "pagamento" | "trial" | "admin";
export type TipoProduto = "assinatura" | "venda_unica";
export type StatusMaterial = "rascunho" | "publicado";

export interface ProdutoGating {
  tipo: TipoProduto;
  curso_id: string | null;
  status?: "ativo" | "inativo";
}
export interface EntitlementGating {
  id: string;
  origem: OrigemEntitlement;
  acesso_ate: Date | null;
  product_id: string;
  product?: ProdutoGating | null;
}
export interface MaterialGating {
  id: string;
  status: StatusMaterial;
  amostra: boolean;
  tipo?: string;
  video_status?: "processando" | "pronto" | "erro" | null;
}
export interface CursoGating { id: string; incluido_assinatura: boolean }
export type MotivoGating = "amostra" | "assinatura" | "venda_unica" | "bloqueado";
export interface ResultadoGating { permitido: boolean; motivo: MotivoGating }
export interface ParamsPodeAcessarMaterial {
  userId: string;
  material: MaterialGating;
  curso: CursoGating;
  entitlements: readonly EntitlementGating[];
  usuario?: EntradaAvaliacao["usuario"];
  assinatura?: EntradaAvaliacao["assinatura"];
}
export interface DepsGating { agora?: Date; usarCache?: boolean }

export type { EntradaAvaliacao, ResultadoComRegra };
export { invalidarGatingCache, invalidarPorUsuario, invalidarPorCurso, invalidarGlobal, limparCacheGating, GATING_CACHE_TTL_MS } from "./cache";
export { avaliarAcesso } from "./engine";

function contextoCache(input: ParamsPodeAcessarMaterial): string {
  return JSON.stringify({
    material: [input.material.status, input.material.amostra, input.material.video_status],
    curso: input.curso.incluido_assinatura,
    usuario: input.usuario?.bloqueado,
    assinatura: input.assinatura,
    entitlements: input.entitlements.map((item) => [item.id, item.acesso_ate?.getTime() ?? null, item.product?.tipo, item.product?.curso_id, item.product?.status]),
  });
}

function estadoCache(input: ParamsPodeAcessarMaterial, agora: Date): ResultadoComRegra | undefined {
  return obterCache(chaveCache(input.userId, input.material.id, input.curso.id, contextoCache(input)), input.userId, input.curso.id, agora.getTime());
}

export function podeAcessarMaterial(params: ParamsPodeAcessarMaterial, deps: DepsGating = {}): ResultadoGating {
  const agora = deps.agora ?? new Date();
  // Guardas de revogação são sempre reavaliadas, inclusive diante de cache.
  if (params.usuario?.bloqueado === true || params.material.status !== "publicado" || params.material.video_status === "erro") {
    return { permitido: false, motivo: "bloqueado" };
  }
  const usarCache = deps.usarCache ?? true;
  const cacheado = usarCache ? estadoCache(params, agora) : undefined;
  const resultado = cacheado ?? avaliarAcesso(params, agora);
  if (!cacheado && usarCache) guardarCache(chaveCache(params.userId, params.material.id, params.curso.id, contextoCache(params)), params.userId, params.curso.id, resultado, agora.getTime());
  return { permitido: resultado.permitido, motivo: resultado.motivo };
}
