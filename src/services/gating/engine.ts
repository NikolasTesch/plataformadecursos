// Motor puro: não consulta banco, não emite conteúdo e falha fechado.

import type { CursoGating, EntitlementGating, MaterialGating } from "./index";

export interface UsuarioGating {
  id: string;
  bloqueado: boolean;
}

export interface AssinaturaGating {
  ativa: boolean;
  acesso_ate?: Date | null;
}

export interface EntradaAvaliacao {
  userId: string;
  material: MaterialGating;
  curso: CursoGating;
  entitlements: readonly EntitlementGating[];
  usuario?: UsuarioGating;
  assinatura?: AssinaturaGating | boolean;
}

export interface ResultadoGating {
  permitido: boolean;
  motivo: "amostra" | "assinatura" | "venda_unica" | "bloqueado";
  regraId: "R1" | "R2" | "R3" | "R4" | "R5" | "R7" | "R11" | "R12";
}

function avaliarEntitlements(
  curso: CursoGating,
  entitlements: readonly EntitlementGating[],
  assinatura: EntradaAvaliacao["assinatura"],
  agora: Date,
): ResultadoGating | null {
  const assinaturaEntitlement = entitlements.some((entitlement: EntitlementGating) => {
    const produto = entitlement.product;
    if (!produto || produto.tipo !== "assinatura" || produto.status === "inativo") return false;
    if (entitlement.acesso_ate === null || !Number.isFinite(entitlement.acesso_ate.getTime())) return false;
    return entitlement.acesso_ate.getTime() >= agora.getTime();
  });
  const assinaturaInformada = assinatura === undefined
    ? assinaturaEntitlement
    : typeof assinatura === "boolean"
      ? assinatura
      : assinatura.ativa
        && assinatura.acesso_ate instanceof Date
        && Number.isFinite(assinatura.acesso_ate.getTime())
        && assinatura.acesso_ate.getTime() >= agora.getTime();
  if (curso.incluido_assinatura && assinaturaInformada) return { permitido: true, motivo: "assinatura", regraId: "R2" };

  const venda = entitlements.some((entitlement) => {
    const produto = entitlement.product;
    return produto?.tipo === "venda_unica" && produto.status !== "inativo" && produto.curso_id === curso.id;
  });
  if (venda) return { permitido: true, motivo: "venda_unica", regraId: "R3" };
  return null;
}

export function avaliarAcesso(input: EntradaAvaliacao, agora = new Date()): ResultadoGating {
  const { material, curso } = input;
  const negar = (regraId: ResultadoGating["regraId"] = "R12"): ResultadoGating => ({ permitido: false, motivo: "bloqueado", regraId });

  if (input.usuario?.bloqueado === true) return negar("R12");
  if (!material || !curso || material.status !== "publicado") return negar("R5");
  const videoIncompleto =
    material.tipo === "video" ||
    (material.video_status !== undefined && material.video_status !== null);
  if (videoIncompleto && material.video_status !== "pronto") return negar("R11");
  if (material.amostra === true) return { permitido: true, motivo: "amostra", regraId: "R4" };

  return avaliarEntitlements(curso, input.entitlements, input.assinatura, agora) ?? negar("R1");
}

export interface EntradaAvaliacaoCurso {
  userId: string;
  curso: CursoGating;
  entitlements: readonly EntitlementGating[];
  usuario?: UsuarioGating;
  assinatura?: AssinaturaGating | boolean;
}

/** Gating curso-cêntrico (Q4): reutiliza o motor de entitlement sem material sintético. */
export function avaliarAcessoCurso(input: EntradaAvaliacaoCurso, agora = new Date()): ResultadoGating {
  const negar = (regraId: ResultadoGating["regraId"] = "R12"): ResultadoGating => ({ permitido: false, motivo: "bloqueado", regraId });
  if (input.usuario?.bloqueado === true) return negar("R12");
  return avaliarEntitlements(input.curso, input.entitlements, input.assinatura, agora) ?? negar("R1");
}
