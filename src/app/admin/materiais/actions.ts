// Server Actions do admin de MATERIAIS — rotas finas (AGENTS.md §6).
//
// Cada action: requireRole('admin') → parse do FormData → serviço
// (src/services/conteudo/materiais — TODAS as regras: estrutura por tipo,
// C2 amostra única, R11 vídeo erro, R5 despublicação, publicado_em) →
// resposta serializável / redirect. Nenhuma regra duplicada aqui.
//
// Presign de upload (PDF): a action gera a URL pré-assinada chamando o driver
// de storage (`getStorage().createPresignedUpload`) — fluxo documentado no
// README de src/lib/storage ("a rota chama createPresignedUpload"; os bytes
// nunca passam pelo servidor da aplicação). O cliente faz PUT direto na URL.
"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireRole } from "@/lib/auth";
import { getStorage } from "@/lib/storage";
import { ErroConteudo } from "@/services/conteudo/erros";
import {
  atualizarMaterial,
  criarMaterial,
  despublicarMaterial,
  publicarMaterial,
} from "@/services/conteudo/materiais";
import type { MaterialStatus, MaterialTipo, VideoStatus } from "@/generated/prisma/client";

/** Erro serializável exibido pela UI (shape do ErroConteudo, sem a instância). */
export interface ErroMaterial {
  code: string;
  mensagem: string;
  campo?: string;
}

export interface EstadoMaterial {
  erro?: ErroMaterial;
  ok?: boolean;
}

/** Resultado do presign: URL de upload direto + chave do arquivo. */
export interface PresignUpload {
  uploadUrl?: string;
  key?: string;
  erro?: string;
}

function parseErroConteudo(erro: unknown): EstadoMaterial {
  if (erro instanceof ErroConteudo) {
    return {
      erro: {
        code: erro.code,
        mensagem: erro.mensagem,
        campo: erro.campo,
      },
    };
  }
  console.error("[admin/materiais] erro inesperado do service", erro);
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

/** Campos comuns a todo material (parse + seleção de valores opcionais). */
interface CamposComuns {
  module_id: string;
  curso_id: string;
  titulo: string;
  tipo: string;
  status: string | undefined;
  amostra: boolean;
  ordem: number | undefined;
  conteudo_html: string | undefined;
  arquivo_key: string | undefined;
  video_provider_id: string | undefined;
  video_status: VideoStatus | undefined;
}

function parseCamposComuns(formData: FormData): CamposComuns {
  const ordemRaw = String(formData.get("ordem") ?? "").trim();
  const ordem =
    ordemRaw !== "" && Number.isInteger(Number(ordemRaw)) && Number(ordemRaw) >= 1
      ? Number(ordemRaw)
      : undefined;

  const statusRaw = String(formData.get("status") ?? "");
  const status =
    statusRaw === "rascunho" || statusRaw === "publicado" ? statusRaw : undefined;

  const videoStatusRaw = String(formData.get("video_status") ?? "");
  const video_status: VideoStatus | undefined =
    videoStatusRaw === "processando" ||
    videoStatusRaw === "pronto" ||
    videoStatusRaw === "erro"
      ? videoStatusRaw
      : undefined;

  return {
    module_id: String(formData.get("module_id") ?? ""),
    curso_id: String(formData.get("curso_id") ?? ""),
    titulo: String(formData.get("titulo") ?? ""),
    tipo: String(formData.get("tipo") ?? ""),
    status,
    amostra: formData.get("amostra") === "on",
    ordem,
    conteudo_html:
      formData.get("conteudo_html") !== null
        ? String(formData.get("conteudo_html") ?? "")
        : undefined,
    arquivo_key:
      formData.get("arquivo_key") !== null
        ? String(formData.get("arquivo_key") ?? "").trim()
        : undefined,
    video_provider_id:
      formData.get("video_provider_id") !== null
        ? String(formData.get("video_provider_id") ?? "").trim()
        : undefined,
    video_status,
  };
}

export async function criarMaterialAction(
  _prevState: EstadoMaterial,
  formData: FormData,
): Promise<EstadoMaterial> {
  await exigirAdmin();

  const c = parseCamposComuns(formData);
  const tipo = c.tipo as MaterialTipo;

  let material;
  try {
    material = await criarMaterial({
      module_id: c.module_id,
      titulo: c.titulo,
      tipo,
      // No create o select de status SEMPRE envia (default rascunho).
      status: c.status as MaterialStatus | undefined,
      amostra: c.amostra,
      ordem: c.ordem,
      conteudo_html:
        (tipo === "texto" || tipo === "resumo") ? c.conteudo_html : undefined,
      arquivo_key: tipo === "pdf" ? c.arquivo_key : undefined,
      video_provider_id: tipo === "video" ? c.video_provider_id : undefined,
      video_status: tipo === "video" ? c.video_status : undefined,
    });
  } catch (erro) {
    return parseErroConteudo(erro);
  }

  // A listagem rápida do curso (página de edição) precisa revalidar.
  revalidatePath(`/admin/cursos/${c.curso_id}`);
  revalidatePath("/admin/cursos/[id]");
  // Continua na edição do material (publicar, ajustar, etc.). FORA do
  // try/catch: redirect() lança NEXT_REDIRECT, que não pode ser engolido.
  redirect(`/admin/materiais/${material.id}`);
}

export async function atualizarMaterialAction(
  _prevState: EstadoMaterial,
  formData: FormData,
): Promise<EstadoMaterial> {
  await exigirAdmin();

  const id = String(formData.get("id") ?? "");
  const c = parseCamposComuns(formData);
  const tipo = c.tipo as MaterialTipo;

  try {
    await atualizarMaterial(id, {
      titulo: c.titulo,
      // Status só é enviado quando mudou (o form controla); assim um save
      // comum NUNCA despublica/publica por acidente (R5 é ação explícita).
      status: c.status as MaterialStatus | undefined,
      amostra: c.amostra,
      ordem: c.ordem,
      // Corpo do tipo ATIVO: o serviço ignora campos fora do tipo efetivo.
      conteudo_html:
        tipo === "texto" || tipo === "resumo" ? c.conteudo_html : undefined,
      arquivo_key: tipo === "pdf" ? c.arquivo_key : undefined,
      video_provider_id: tipo === "video" ? c.video_provider_id : undefined,
      video_status: tipo === "video" ? c.video_status : undefined,
    });
  } catch (erro) {
    return parseErroConteudo(erro);
  }

  revalidatePath(`/admin/materiais/${id}`);
  revalidatePath("/admin/cursos/[id]");
  return { ok: true };
}

export async function publicarMaterialAction(
  id: string,
): Promise<EstadoMaterial> {
  await exigirAdmin();

  try {
    // Transição rascunho→publicado: serviço define publicado_em = now e aplica
    // R11 (vídeo com status erro não publica — erro amigável retornado).
    await publicarMaterial(id);
  } catch (erro) {
    return parseErroConteudo(erro);
  }

  revalidatePath(`/admin/materiais/${id}`);
  revalidatePath("/admin/cursos/[id]");
  return { ok: true };
}

export async function despublicarMaterialAction(
  id: string,
): Promise<EstadoMaterial> {
  await exigirAdmin();

  try {
    // R5: efeito imediato — status → rascunho (publicado_em mantido no serviço).
    await despublicarMaterial(id);
  } catch (erro) {
    return parseErroConteudo(erro);
  }

  revalidatePath(`/admin/materiais/${id}`);
  revalidatePath("/admin/cursos/[id]");
  return { ok: true };
}

export async function criarPresignUploadAction(
  formData: FormData,
): Promise<PresignUpload> {
  await exigirAdmin();

  const key = String(formData.get("key") ?? "");
  const mimeType = String(formData.get("mimeType") ?? "application/pdf");
  const size = Number(formData.get("size") ?? "0");

  try {
    // C3: o driver rejeita size > 100MB no presign; a validação de magic bytes
    // (%PDF-) é feita pelo chamador ANTES (contrato documentado no storage).
    const { uploadUrl, key: chave } = await getStorage().createPresignedUpload({
      key,
      mimeType,
      size,
    });
    return { uploadUrl, key: chave };
  } catch (erro) {
    const mensagem =
      erro instanceof Error ? erro.message : "falha ao preparar o upload";
    console.error("[admin/materiais] falha no presign", erro);
    return { erro: mensagem };
  }
}
