// Cliente server-side do Bunny Stream — S5, SPEC-video.md §3.1.
// O cliente só cria o vídeo e devolve credenciais TUS; a API key nunca sai daqui.
import { createHash } from "node:crypto";

const BUNNY_API_BASE = "https://video.bunnycdn.com";
const BUNNY_PLAYER_BASE = "https://player.mediadelivery.net";
const TUS_ENDPOINT = `${BUNNY_API_BASE}/tusupload`;
const TUS_TTL_SECONDS = 24 * 60 * 60;
const EMBED_TOKEN_TTL_SECONDS = 5 * 60;

export interface CredenciaisTus {
  endpoint: string;
  videoId: string;
  libraryId: string;
  expiresAt: number;
  headers: {
    AuthorizationSignature: string;
    AuthorizationExpire: string;
    LibraryId: string;
    VideoId: string;
  };
}

export interface VideoBunnyCriado {
  videoId: string;
  tus: CredenciaisTus;
}

export interface EmbedVideoGerado {
  url: string;
  token: string;
  expiresAt: number;
}

function configuracaoBunny(): { libraryId: string; apiKey: string } {
  const libraryId = process.env.BUNNY_LIBRARY_ID?.trim();
  const apiKey = process.env.BUNNY_API_KEY?.trim();
  if (!libraryId || !apiKey) {
    throw new Error("Bunny Stream não configurado: defina BUNNY_LIBRARY_ID e BUNNY_API_KEY");
  }
  return { libraryId, apiKey };
}

function emitirCredenciaisTus(
  libraryId: string,
  apiKey: string,
  videoId: string,
  agoraUnix = Math.floor(Date.now() / 1000),
): CredenciaisTus {
  const expiresAt = agoraUnix + TUS_TTL_SECONDS;
  const assinatura = createHash("sha256")
    .update(`${libraryId}${apiKey}${expiresAt}${videoId}`)
    .digest("hex");

  return {
    endpoint: TUS_ENDPOINT,
    videoId,
    libraryId,
    expiresAt,
    headers: {
      AuthorizationSignature: assinatura,
      AuthorizationExpire: String(expiresAt),
      LibraryId: libraryId,
      VideoId: videoId,
    },
  };
}

/** Emite credenciais TUS para um vídeo já criado, sem criar outro objeto Bunny. */
export function renovarCredenciaisTusBunny(
  videoId: string,
  agoraUnix = Math.floor(Date.now() / 1000),
): CredenciaisTus {
  const { libraryId, apiKey } = configuracaoBunny();
  const id = videoId.trim();
  if (!id) throw new Error("o identificador do vídeo é obrigatório");
  return emitirCredenciaisTus(libraryId, apiKey, id, agoraUnix);
}

/**
 * Gera um Embed View Token após o caller já ter aplicado gating.
 * A chave de segurança da biblioteca nunca é incluída no retorno.
 */
export function gerarUrlEmbedVideo(
  videoId: string,
  agoraUnix = Math.floor(Date.now() / 1000),
): EmbedVideoGerado {
  const libraryId = process.env.BUNNY_LIBRARY_ID?.trim();
  const tokenSecurityKey = process.env.BUNNY_TOKEN_SECURITY_KEY?.trim();
  if (!libraryId || !tokenSecurityKey) {
    throw new Error("Embed Token Bunny não configurado: defina BUNNY_LIBRARY_ID e BUNNY_TOKEN_SECURITY_KEY");
  }
  const id = videoId.trim();
  if (!id) throw new Error("o identificador do vídeo é obrigatório");

  const expiresAt = agoraUnix + EMBED_TOKEN_TTL_SECONDS;
  const token = createHash("sha256")
    .update(`${tokenSecurityKey}${id}${expiresAt}`)
    .digest("hex");
  const url = `${BUNNY_PLAYER_BASE}/embed/${encodeURIComponent(libraryId)}/${encodeURIComponent(id)}?token=${token}&expires=${expiresAt}`;
  return { url, token, expiresAt };
}

function obterGuid(body: unknown): string | null {
  if (typeof body !== "object" || body === null || !("guid" in body)) return null;
  const guid = body.guid;
  return typeof guid === "string" && guid.trim() !== "" ? guid : null;
}

/** Cria um vídeo vazio no Bunny para o upload direto via TUS. */
export async function criarVideoBunny(titulo: string): Promise<VideoBunnyCriado> {
  const title = titulo.trim();
  if (!title) throw new Error("o título do vídeo é obrigatório");

  const { libraryId, apiKey } = configuracaoBunny();
  const resposta = await fetch(`${BUNNY_API_BASE}/library/${libraryId}/videos`, {
    method: "POST",
    headers: { AccessKey: apiKey, "Content-Type": "application/json" },
    body: JSON.stringify({ title }),
  });

  if (!resposta.ok) throw new Error(`Bunny Stream recusou a criação do vídeo (${resposta.status})`);

  let body: unknown;
  try {
    body = await resposta.json();
  } catch {
    throw new Error("Bunny Stream devolveu uma resposta inválida ao criar o vídeo");
  }
  const videoId = obterGuid(body);
  if (!videoId) throw new Error("Bunny Stream não devolveu o identificador do vídeo");

  return { videoId, tus: emitirCredenciaisTus(libraryId, apiKey, videoId) };
}
