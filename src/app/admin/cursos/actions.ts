// Server Actions do admin de CONTEÚDO — rotas finas (AGENTS.md §6).
//
// Cada action: requireRole('admin') → parse do FormData → chamada ao serviço
// (TODA a regra de negócio vive em src/services/conteudo — C1/C6, ordens,
// erros) → resposta (estado serializável p/ useActionState, revalidatePath ou
// redirect). Nenhuma regra duplicada aqui; erros `ErroConteudo` viram estado
// `{ code, mensagem, campo? }` que a UI apenas renderiza.
"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireRole } from "@/lib/auth";
import {
  atualizarCurso,
  criarCurso,
  excluirCurso,
} from "@/services/conteudo/cursos";
import { ErroConteudo } from "@/services/conteudo/erros";
import {
  atualizarModulo,
  criarModulo,
  excluirModulo,
  reordenarModulos,
} from "@/services/conteudo/modulos";

/** Erro serializável exibido pela UI (shape do ErroConteudo, sem a instância). */
export interface ErroAdmin {
  code: string;
  mensagem: string;
  campo?: string;
}

export interface EstadoAdmin {
  erro?: ErroAdmin;
  /** true quando a ação teve sucesso sem redirect (ex.: módulos — re-render da página). */
  ok?: boolean;
}

function parseErroConteudo(erro: unknown): EstadoAdmin {
  if (erro instanceof ErroConteudo) {
    return {
      erro: {
        code: erro.code,
        mensagem: erro.mensagem,
        campo: erro.campo,
      },
    };
  }
  console.error("[admin] erro inesperado do service", erro);
  return {
    erro: { code: "erro_interno", mensagem: "algo deu errado, tente novamente" },
  };
}

/** Gate de role: lança NEXT_REDIRECT para /login quando não-autenticado/não-admin. */
async function exigirAdmin(): Promise<void> {
  try {
    await requireRole("admin");
  } catch {
    redirect("/login");
  }
}

// ---------------------------------------------------------------------------
// Cursos (US-03 — SPEC-conteudo §3.1)
// ---------------------------------------------------------------------------

export async function criarCursoAction(
  _prevState: EstadoAdmin,
  formData: FormData,
): Promise<EstadoAdmin> {
  await exigirAdmin();

  // Parse (checkbox: presença = "on").
  const nome = String(formData.get("nome") ?? "");
  const descricao = String(formData.get("descricao") ?? "");
  const slugBruto = String(formData.get("slug") ?? "");
  const incluido_assinatura = formData.get("incluido_assinatura") === "on";

  try {
    await criarCurso({
      nome,
      descricao,
      // Slug vazio → auto-gerado pelo serviço (gerarSlug); não enviar undefined
      // é o sinal de "ausente" no contrato do serviço.
      slug: slugBruto.trim() !== "" ? slugBruto.trim() : undefined,
      incluido_assinatura,
    });
  } catch (erro) {
    return parseErroConteudo(erro);
  }

  redirect("/admin/cursos");
}

export async function atualizarCursoAction(
  _prevState: EstadoAdmin,
  formData: FormData,
): Promise<EstadoAdmin> {
  await exigirAdmin();

  const id = String(formData.get("id") ?? "");
  const nome = String(formData.get("nome") ?? "");
  const descricao = String(formData.get("descricao") ?? "");
  const slugBruto = String(formData.get("slug") ?? "");
  const incluido_assinatura = formData.get("incluido_assinatura") === "on";

  try {
    await atualizarCurso(id, {
      nome,
      descricao,
      slug: slugBruto.trim() !== "" ? slugBruto.trim() : undefined,
      incluido_assinatura,
    });
  } catch (erro) {
    return parseErroConteudo(erro);
  }

  redirect("/admin/cursos");
}

export async function excluirCursoAction(
  _prevState: EstadoAdmin,
  formData: FormData,
): Promise<EstadoAdmin> {
  await exigirAdmin();

  // C6: o nome digitado é validado NO SERVIÇO (excluirCurso compara com o nome
  // real e lança `confirmacao_necessaria`) — a UI apenas envia o que foi digitado.
  const id = String(formData.get("id") ?? "");
  const confirmacaoNome = String(formData.get("confirmacao_nome") ?? "");

  try {
    await excluirCurso(id, confirmacaoNome);
  } catch (erro) {
    return parseErroConteudo(erro);
  }

  redirect("/admin/cursos");
}

// ---------------------------------------------------------------------------
// Módulos (US-04 — SPEC-conteudo §3.2)
// ---------------------------------------------------------------------------

export async function criarModuloAction(
  _prevState: EstadoAdmin,
  formData: FormData,
): Promise<EstadoAdmin> {
  await exigirAdmin();

  const curso_id = String(formData.get("curso_id") ?? "");
  const nome = String(formData.get("nome") ?? "");

  try {
    await criarModulo({ curso_id, nome });
  } catch (erro) {
    return parseErroConteudo(erro);
  }

  // Sem redirect: a página de edição do curso re-renderiza com os dados novos.
  revalidatePath(`/admin/cursos/${curso_id}`);
  return { ok: true };
}

export async function renomearModuloAction(
  _prevState: EstadoAdmin,
  formData: FormData,
): Promise<EstadoAdmin> {
  await exigirAdmin();

  const id = String(formData.get("modulo_id") ?? "");
  const nome = String(formData.get("nome") ?? "");

  try {
    await atualizarModulo(id, { nome });
  } catch (erro) {
    return parseErroConteudo(erro);
  }

  const curso_id = String(formData.get("curso_id") ?? "");
  revalidatePath(`/admin/cursos/${curso_id}`);
  return { ok: true };
}

export async function excluirModuloAction(
  _prevState: EstadoAdmin,
  formData: FormData,
): Promise<EstadoAdmin> {
  await exigirAdmin();

  const id = String(formData.get("modulo_id") ?? "");
  const curso_id = String(formData.get("curso_id") ?? "");

  try {
    // Cascata de materiais é responsabilidade do banco (onDelete: Cascade) —
    // ver decisão D-S2-3e; o aviso na UI é informativo.
    await excluirModulo(id);
  } catch (erro) {
    return parseErroConteudo(erro);
  }

  revalidatePath(`/admin/cursos/${curso_id}`);
  return { ok: true };
}

export async function reordenarModulosAction(
  _prevState: EstadoAdmin,
  formData: FormData,
): Promise<EstadoAdmin> {
  await exigirAdmin();

  const curso_id = String(formData.get("curso_id") ?? "");
  // A ordem da LISTA é a nova ordem: cada input `modulo_id` na sequência desejada.
  const ordemIds = formData
    .getAll("modulo_id")
    .map((v) => String(v))
    .filter((v) => v !== "");

  try {
    // Serviço valida lista completa/duplicados/ids de outro curso ANTES da
    // transação (D-S2-3b); ordem final 1..n.
    await reordenarModulos(curso_id, ordemIds);
  } catch (erro) {
    return parseErroConteudo(erro);
  }

  revalidatePath(`/admin/cursos/${curso_id}`);
  return { ok: true };
}
