// Serviço de vídeo — S5, SPEC-video.md §3.1 e R11.
// Webhooks só atualizam materiais existentes; upload é iniciado por action admin.
import { db as dbPadrao } from "@/lib/db";
import {
  criarVideoBunny,
  renovarCredenciaisTusBunny,
  type CredenciaisTus,
  type VideoBunnyCriado,
} from "@/lib/video";
import type { materials, VideoStatus } from "@/generated/prisma/client";
import { invalidarPorCurso } from "@/services/gating";

import { ErroConteudo, erroValidacao } from "@/services/conteudo/erros";

export interface VideoWebhookPayload {
  VideoGuid: string;
  VideoLibraryId: string;
  Status: number;
}

export interface DadosUploadVideo {
  materialId: string;
  fileName: string;
  mimeType: string;
  size: number;
}

export interface DbVideo {
  materials: {
    findUnique: (args: {
      where: { id: string } | { video_provider_id: string };
    }) => Promise<materials | null>;
    updateMany: (args: {
      where: { id: string; tipo: "video"; status?: "rascunho"; video_status?: "processando" };
      data: {
        video_provider_id?: string;
        video_status: VideoStatus;
        video_erro: string | null;
      };
    }) => Promise<{ count: number }>;
  };
  modules: {
    findUnique: (args: { where: { id: string } }) => Promise<{ course_id: string } | null>;
  };
}

export interface DepsVideo {
  db?: DbVideo;
  invalidarCurso?: (courseId: string) => void;
  criarVideo?: (titulo: string) => Promise<VideoBunnyCriado>;
  renovarTus?: (videoId: string) => CredenciaisTus;
}

const ERRO_VIDEO = "não foi possível processar o vídeo no Bunny Stream";
const MAX_VIDEO_BYTES = 2 * 1024 * 1024 * 1024;
const FORMATOS_VIDEO: Readonly<Record<string, readonly string[]>> = {
  mp4: ["video/mp4"],
  mov: ["video/quicktime", "video/mov"],
  mkv: ["video/x-matroska", "video/mkv"],
  avi: ["video/x-msvideo", "video/avi"],
};

/** Converte os status Bunny conhecidos para o estado persistido no material. */
export function mapearStatusBunny(status: number): VideoStatus | null {
  if ([0, 1, 2, 4, 6, 7].includes(status)) return "processando";
  if (status === 3) return "pronto";
  if ([5, 8].includes(status)) return "erro";
  return null;
}

/** Valida o contrato mínimo do callback e normaliza o id da library para comparação. */
export function validarPayloadVideo(input: unknown): VideoWebhookPayload | null {
  if (typeof input !== "object" || input === null) return null;
  if (!("VideoGuid" in input) || !("VideoLibraryId" in input) || !("Status" in input)) return null;
  const payload = input as {
    VideoGuid?: unknown;
    VideoLibraryId?: unknown;
    Status?: unknown;
  };
  const libraryId = payload.VideoLibraryId;
  if (typeof payload.VideoGuid !== "string" || payload.VideoGuid.trim() === "") return null;
  if (
    (typeof libraryId !== "string" && typeof libraryId !== "number") ||
    String(libraryId).trim() === "" ||
    (typeof libraryId === "number" && (!Number.isSafeInteger(libraryId) || libraryId < 0))
  ) return null;
  if (typeof payload.Status !== "number" || !Number.isInteger(payload.Status)) return null;
  return {
    VideoGuid: payload.VideoGuid,
    VideoLibraryId: String(libraryId),
    Status: payload.Status,
  };
}

function erroMaterialNaoEncontrado(): ErroConteudo {
  return new ErroConteudo({ code: "nao_encontrado", mensagem: "material não encontrado" });
}

/** Valida extensão, MIME e tamanho antes de criar qualquer vídeo no Bunny. */
export function validarMetadadosUploadVideo(dados: Omit<DadosUploadVideo, "materialId">): void {
  const extensao = dados.fileName.trim().toLowerCase().split(".").pop() ?? "";
  const mimesPermitidos = FORMATOS_VIDEO[extensao];
  if (!mimesPermitidos || !mimesPermitidos.includes(dados.mimeType.trim().toLowerCase())) {
    throw erroValidacao("arquivo", "formato de vídeo inválido; use mp4, mov, mkv ou avi com MIME compatível");
  }
  if (!Number.isSafeInteger(dados.size) || dados.size < 0 || dados.size > MAX_VIDEO_BYTES) {
    throw erroValidacao("size", "o vídeo deve ter no máximo 2GB");
  }
}

/** Inicia upload direto no Bunny e persiste somente GUID + processando. */
export async function iniciarUploadVideo(
  dados: DadosUploadVideo,
  deps: DepsVideo = {},
): Promise<CredenciaisTus> {
  validarMetadadosUploadVideo(dados);
  const db = deps.db ?? dbPadrao;
  const material = await db.materials.findUnique({ where: { id: dados.materialId } });
  if (!material) throw erroMaterialNaoEncontrado();
  if (material.tipo !== "video") {
    throw erroValidacao("materialId", "o material informado não é um vídeo");
  }
  if (material.status === "publicado") {
    throw new ErroConteudo({
      code: "regra_negocio",
      campo: "status",
      mensagem: "despublique o material antes de enviar um novo vídeo",
    });
  }

  if (material.video_provider_id && material.video_status === "processando") {
    return (deps.renovarTus ?? renovarCredenciaisTusBunny)(material.video_provider_id);
  }

  const video = await (deps.criarVideo ?? criarVideoBunny)(material.titulo);
  const atualizado = await db.materials.updateMany({
    where: { id: material.id, status: "rascunho", tipo: "video" },
    data: { video_provider_id: video.videoId, video_status: "processando", video_erro: null },
  });
  if (atualizado.count !== 1) {
    throw new ErroConteudo({
      code: "regra_negocio",
      campo: "status",
      mensagem: "o vídeo não pôde ser iniciado porque o material deixou de ser rascunho",
    });
  }
  return video.tus;
}

/** Processa callback Bunny idempotentemente e invalida o gating após mudança terminal. */
export async function processarWebhookVideo(
  payload: VideoWebhookPayload,
  deps: DepsVideo = {},
): Promise<boolean> {
  const db = deps.db ?? dbPadrao;
  const novoStatus = mapearStatusBunny(payload.Status);
  if (novoStatus === null) return false;

  const material = await db.materials.findUnique({
    where: { video_provider_id: payload.VideoGuid },
  });
  if (!material || material.tipo !== "video" || material.video_status !== "processando") return false;
  if (novoStatus === "processando") return false;

  const data =
    novoStatus === "pronto"
      ? { video_status: novoStatus, video_erro: null }
      : { video_status: novoStatus, video_erro: ERRO_VIDEO };
  const atualizado = await db.materials.updateMany({
    where: { id: material.id, tipo: "video", video_status: "processando" },
    data,
  });
  if (atualizado.count !== 1) return false;

  const modulo = await db.modules.findUnique({ where: { id: material.module_id } });
  if (modulo) (deps.invalidarCurso ?? invalidarPorCurso)(modulo.course_id);
  return true;
}
