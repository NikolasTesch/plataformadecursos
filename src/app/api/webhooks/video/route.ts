// POST /api/webhooks/video — callback autenticado do Bunny Stream.
import { createHmac, timingSafeEqual } from "node:crypto";

import { processarWebhookVideo, validarPayloadVideo } from "@/services/video";

function assinaturaValida(
  corpo: Uint8Array,
  recebida: string | null,
  segredo: string | undefined,
): boolean {
  if (!recebida || !segredo || !/^[0-9a-f]{64}$/.test(recebida)) return false;
  const esperada = createHmac("sha256", segredo).update(corpo).digest();
  const candidata = Buffer.from(recebida, "hex");
  return candidata.length === esperada.length && timingSafeEqual(esperada, candidata);
}

export function validarAssinaturaVideo(
  corpo: Uint8Array,
  recebida: string | null,
  segredo = process.env.BUNNY_WEBHOOK_SECRET,
): boolean {
  return assinaturaValida(corpo, recebida, segredo);
}

export async function POST(request: Request): Promise<Response> {
  const versao = request.headers.get("X-BunnyStream-Signature-Version");
  const algoritmo = request.headers.get("X-BunnyStream-Signature-Algorithm");
  if (versao !== "v1" || algoritmo !== "hmac-sha256") return new Response(null, { status: 401 });

  const corpo = Buffer.from(await request.arrayBuffer());
  if (!validarAssinaturaVideo(corpo, request.headers.get("X-BunnyStream-Signature"))) {
    return new Response(null, { status: 401 });
  }

  let entrada: unknown;
  try {
    entrada = JSON.parse(corpo.toString("utf8")) as unknown;
  } catch {
    return new Response(null, { status: 400 });
  }
  const payload = validarPayloadVideo(entrada);
  if (!payload) return new Response(null, { status: 400 });
  if (payload.VideoLibraryId !== process.env.BUNNY_LIBRARY_ID?.trim()) {
    return new Response(null, { status: 401 });
  }

  await processarWebhookVideo(payload);
  return new Response(null, { status: 204 });
}
