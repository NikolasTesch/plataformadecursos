import { createHmac } from "node:crypto";

import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/db", () => ({ db: {} }));
vi.mock("@/services/video", async () => {
  const atual = await vi.importActual<typeof import("@/services/video")>("@/services/video");
  return { ...atual, processarWebhookVideo: vi.fn(async () => false) };
});

import { POST, validarAssinaturaVideo } from "@/app/api/webhooks/video/route";

const segredo = "segredo-webhook";
const corpo = JSON.stringify({ VideoGuid: "guid-1", VideoLibraryId: "123", Status: 4 });

function assinatura(valor = corpo, chave = segredo): string {
  return createHmac("sha256", chave).update(Buffer.from(valor)).digest("hex");
}

function request(
  body = corpo,
  overrides: Record<string, string> = {},
): Request {
  return new Request("http://localhost/api/webhooks/video", {
    method: "POST",
    body: Buffer.from(body),
    headers: {
      "X-BunnyStream-Signature-Version": "v1",
      "X-BunnyStream-Signature-Algorithm": "hmac-sha256",
      "X-BunnyStream-Signature": assinatura(body),
      ...overrides,
    },
  });
}

afterEach(() => vi.unstubAllEnvs());

describe("POST /api/webhooks/video", () => {
  it("aceita somente o vetor hexadecimal minúsculo correto", () => {
    const bytes = Buffer.from("corpo bruto");
    const correta = createHmac("sha256", segredo).update(bytes).digest("hex");
    expect(validarAssinaturaVideo(bytes, correta, segredo)).toBe(true);
    expect(validarAssinaturaVideo(bytes, correta.toUpperCase(), segredo)).toBe(false);
    expect(validarAssinaturaVideo(bytes, `${correta}0`, segredo)).toBe(false);
    expect(validarAssinaturaVideo(bytes, `${correta.slice(0, 63)}0`, segredo)).toBe(false);
    expect(validarAssinaturaVideo(bytes, assinatura("corpo bruto", "outro"), segredo)).toBe(false);
  });

  it("rejeita headers ausentes e secret ausente", async () => {
    vi.stubEnv("BUNNY_WEBHOOK_SECRET", segredo);
    vi.stubEnv("BUNNY_LIBRARY_ID", "123");
    expect((await POST(request(corpo, { "X-BunnyStream-Signature-Algorithm": "" }))).status).toBe(401);

    vi.stubEnv("BUNNY_WEBHOOK_SECRET", "");
    expect((await POST(request())).status).toBe(401);
  });

  it("valida library no payload e rejeita payload inválido", async () => {
    vi.stubEnv("BUNNY_WEBHOOK_SECRET", segredo);
    vi.stubEnv("BUNNY_LIBRARY_ID", "123");
    expect((await POST(request(corpo, { "X-BunnyStream-Signature": assinatura(corpo).toUpperCase() }))).status).toBe(401);
    expect((await POST(request(corpo.replace('"123"', '"999"')))).status).toBe(401);
    expect((await POST(request(JSON.stringify({ VideoGuid: "guid-1", Status: 4 })))).status).toBe(400);
  });

  it("responde 204 ao payload autenticado", async () => {
    vi.stubEnv("BUNNY_WEBHOOK_SECRET", segredo);
    vi.stubEnv("BUNNY_LIBRARY_ID", "123");
    expect((await POST(request())).status).toBe(204);
  });
});
