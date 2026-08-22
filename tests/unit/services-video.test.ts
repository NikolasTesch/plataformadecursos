import { createHash } from "node:crypto";

import { afterEach, describe, expect, it, vi } from "vitest";
import type { materials } from "@/generated/prisma/client";

vi.mock("@/lib/db", () => ({ db: {} }));

import { validarAssinaturaVideo } from "@/app/api/webhooks/video/route";
import { gerarUrlEmbedVideo, renovarCredenciaisTusBunny } from "@/lib/video";
import {
  iniciarUploadVideo,
  mapearStatusBunny,
  processarWebhookVideo,
  validarMetadadosUploadVideo,
  type DbVideo,
} from "@/services/video";

function materialFake(overrides: Partial<materials> = {}): materials {
  const agora = new Date("2026-08-19T12:00:00Z");
  return {
    id: "material-video",
    module_id: "modulo-video",
    titulo: "Aula de vídeo",
    tipo: "video",
    ordem: 1,
    status: "rascunho",
    publicado_em: null,
    amostra: false,
    conteudo_html: null,
    arquivo_key: null,
    video_provider_id: "video-guid",
    video_status: "processando",
    video_erro: null,
    conteudo_busca: null,
    criado_em: agora,
    atualizado_em: agora,
    ...overrides,
  };
}

afterEach(() => vi.unstubAllEnvs());

describe("callbacks Bunny Stream", () => {
  it("mapeia status Bunny conhecidos e ignora desconhecidos", () => {
    expect([0, 1, 2, 6, 7].map(mapearStatusBunny)).toEqual([
      "processando",
      "processando",
      "processando",
      "processando",
      "processando",
    ]);
    expect(mapearStatusBunny(3)).toBe("pronto");
    expect(mapearStatusBunny(4)).toBe("processando");
    expect([5, 8].map(mapearStatusBunny)).toEqual(["erro", "erro"]);
    expect(mapearStatusBunny(99)).toBeNull();
  });

  it("aplica transição, limpa erro ao ficar pronto e não repete update idempotente", async () => {
    let material = materialFake();
    const findUnique = vi.fn(async () => material);
    const updateMany = vi.fn<DbVideo["materials"]["updateMany"]>(async ({ data }) => {
      material = { ...material, ...data };
      return { count: 1 };
    });
    const moduleFindUnique = vi.fn(async () => ({ course_id: "curso-video" }));
    const invalidarCurso = vi.fn();
    const db: DbVideo = {
      materials: { findUnique, updateMany },
      modules: { findUnique: moduleFindUnique },
    };

    await processarWebhookVideo({ VideoGuid: "video-guid", VideoLibraryId: "123", Status: 4 }, { db, invalidarCurso });
    await processarWebhookVideo(
      { VideoGuid: "video-guid", VideoLibraryId: "123", Status: 3 },
      { db, invalidarCurso },
    );
    await processarWebhookVideo({ VideoGuid: "video-guid", VideoLibraryId: "123", Status: 5 }, { db, invalidarCurso });

    expect(updateMany).toHaveBeenCalledTimes(1);
    expect(updateMany).toHaveBeenCalledWith({
      where: { id: "material-video", tipo: "video", video_status: "processando" },
      data: { video_status: "pronto", video_erro: null },
    });
    expect(invalidarCurso).toHaveBeenCalledWith("curso-video");
  });

  it("valida metadados antes de chamar o Bunny", () => {
    expect(() => validarMetadadosUploadVideo({ fileName: "a.txt", mimeType: "text/plain", size: 1 })).toThrow();
    expect(() => validarMetadadosUploadVideo({ fileName: "a.mp4", mimeType: "video/quicktime", size: 1 })).toThrow();
    expect(() => validarMetadadosUploadVideo({ fileName: "a.mp4", mimeType: "video/mp4", size: 2 * 1024 * 1024 * 1024 + 1 })).toThrow();
    expect(() => validarMetadadosUploadVideo({ fileName: "a.MP4", mimeType: "video/mp4", size: 2 })).not.toThrow();
  });

  it("perde a disputa terminal → não invalida gating nem faz write incondicional", async () => {
    const material = materialFake();
    const updateMany = vi.fn<DbVideo["materials"]["updateMany"]>(async () => ({ count: 0 }));
    const invalidarCurso = vi.fn();
    const db: DbVideo = {
      materials: { findUnique: vi.fn(async () => material), updateMany },
      modules: { findUnique: vi.fn(async () => ({ course_id: "curso-video" })) },
    };

    const mudou = await processarWebhookVideo(
      { VideoGuid: "video-guid", VideoLibraryId: "123", Status: 3 },
      { db, invalidarCurso },
    );

    expect(mudou).toBe(false);
    expect(updateMany).toHaveBeenCalledWith({
      where: { id: "material-video", tipo: "video", video_status: "processando" },
      data: { video_status: "pronto", video_erro: null },
    });
    expect(invalidarCurso).not.toHaveBeenCalled();
  });

  it("persiste GUID/processando e devolve somente credenciais TUS", async () => {
    const material = materialFake({ video_provider_id: null, video_status: null });
    const updateMany = vi.fn<DbVideo["materials"]["updateMany"]>(async () => ({ count: 1 }));
    const db: DbVideo = {
      materials: { findUnique: vi.fn(async () => material), updateMany },
      modules: { findUnique: vi.fn(async () => null) },
    };
    const criarVideo = vi.fn(async () => ({
      videoId: "novo-guid",
      tus: {
        endpoint: "https://video.bunnycdn.com/tusupload",
        videoId: "novo-guid",
        libraryId: "123",
        expiresAt: 1,
        headers: {
          AuthorizationSignature: "sig",
          AuthorizationExpire: "1",
          LibraryId: "123",
          VideoId: "novo-guid",
        },
      },
    }));

    const tus = await iniciarUploadVideo(
      { materialId: "material-video", fileName: "a.mp4", mimeType: "video/mp4", size: 10 },
      { db, criarVideo },
    );

    expect(criarVideo).toHaveBeenCalledWith("Aula de vídeo");
    expect(updateMany).toHaveBeenCalledWith({
      where: { id: "material-video", status: "rascunho", tipo: "video" },
      data: { video_provider_id: "novo-guid", video_status: "processando", video_erro: null },
    });
    expect(tus.videoId).toBe("novo-guid");
  });

  it("renova TUS para GUID processando sem criar vídeo nem alterar material", async () => {
    const material = materialFake({ video_provider_id: "guid-existente", video_status: "processando" });
    const updateMany = vi.fn<DbVideo["materials"]["updateMany"]>(async () => ({ count: 1 }));
    const renovarTus = vi.fn(() => ({
      endpoint: "https://video.bunnycdn.com/tusupload",
      videoId: "guid-existente",
      libraryId: "123",
      expiresAt: 1,
      headers: {
        AuthorizationSignature: "sig",
        AuthorizationExpire: "1",
        LibraryId: "123",
        VideoId: "guid-existente",
      },
    }));
    const criarVideo = vi.fn(async () => {
      throw new Error("não deveria criar outro vídeo");
    });
    const db: DbVideo = {
      materials: { findUnique: vi.fn(async () => material), updateMany },
      modules: { findUnique: vi.fn(async () => null) },
    };

    const tus = await iniciarUploadVideo(
      { materialId: "material-video", fileName: "a.mp4", mimeType: "video/mp4", size: 10 },
      { db, renovarTus, criarVideo },
    );

    expect(renovarTus).toHaveBeenCalledWith("guid-existente");
    expect(criarVideo).not.toHaveBeenCalled();
    expect(updateMany).not.toHaveBeenCalled();
    expect(JSON.stringify(tus)).not.toContain("api-key");
  });

  it("não reinicia upload de vídeo publicado", async () => {
    const material = materialFake({ status: "publicado", video_status: "pronto" });
    const criarVideo = vi.fn(async () => {
      throw new Error("não deveria chamar Bunny");
    });
    const db: DbVideo = {
      materials: { findUnique: vi.fn(async () => material), updateMany: vi.fn(async () => ({ count: 0 })) },
      modules: { findUnique: vi.fn(async () => null) },
    };

    await expect(
      iniciarUploadVideo(
        { materialId: "material-video", fileName: "a.mp4", mimeType: "video/mp4", size: 10 },
        { db, criarVideo },
      ),
    ).rejects.toMatchObject({ code: "regra_negocio" });
    expect(criarVideo).not.toHaveBeenCalled();
  });

  it("upload perde a disputa de rascunho → não aceita GUID sem CAS", async () => {
    const material = materialFake({ video_provider_id: null, video_status: null });
    const updateMany = vi.fn<DbVideo["materials"]["updateMany"]>(async () => ({ count: 0 }));
    const criarVideo = vi.fn(async () => ({
      videoId: "guid-disputado",
      tus: {
        endpoint: "https://video.bunnycdn.com/tusupload",
        videoId: "guid-disputado",
        libraryId: "123",
        expiresAt: 1,
        headers: {
          AuthorizationSignature: "sig",
          AuthorizationExpire: "1",
          LibraryId: "123",
          VideoId: "guid-disputado",
        },
      },
    }));
    const db: DbVideo = {
      materials: { findUnique: vi.fn(async () => material), updateMany },
      modules: { findUnique: vi.fn(async () => null) },
    };

    await expect(
      iniciarUploadVideo(
        { materialId: "material-video", fileName: "a.mp4", mimeType: "video/mp4", size: 10 },
        { db, criarVideo },
      ),
    ).rejects.toMatchObject({ code: "regra_negocio" });
    expect(updateMany).toHaveBeenCalledWith({
      where: { id: "material-video", status: "rascunho", tipo: "video" },
      data: { video_provider_id: "guid-disputado", video_status: "processando", video_erro: null },
    });
  });

  it("registra uma mensagem segura quando o Bunny informa erro", async () => {
    const material = materialFake();
    const updateMany = vi.fn<DbVideo["materials"]["updateMany"]>(async () => ({ count: 1 }));
    const db: DbVideo = {
      materials: { findUnique: vi.fn(async () => material), updateMany },
      modules: { findUnique: vi.fn(async () => ({ course_id: "curso-video" })) },
    };

    await processarWebhookVideo(
      { VideoGuid: "video-guid", VideoLibraryId: "123", Status: 5 },
      { db },
    );

    expect(updateMany).toHaveBeenCalledWith({
      where: { id: "material-video", tipo: "video", video_status: "processando" },
      data: { video_status: "erro", video_erro: "não foi possível processar o vídeo no Bunny Stream" },
    });
  });

  it("registra erro seguro e não cria material para guid desconhecido", async () => {
    const updateMany = vi.fn<DbVideo["materials"]["updateMany"]>(async () => ({ count: 1 }));
    const findUnique = vi.fn(async () => null);
    const db: DbVideo = {
      materials: { findUnique, updateMany },
      modules: { findUnique: vi.fn(async () => null) },
    };

    await processarWebhookVideo(
      { VideoGuid: "outro-guid", VideoLibraryId: "123", Status: 5 },
      { db },
    );
    expect(updateMany).not.toHaveBeenCalled();
    expect(findUnique).toHaveBeenCalledWith({
      where: { video_provider_id: "outro-guid" },
    });
  });
});

describe("assinatura do webhook Bunny", () => {
  it("rejeita assinatura inválida", () => {
    vi.stubEnv("BUNNY_WEBHOOK_SECRET", "segredo-de-teste");
    expect(validarAssinaturaVideo(new TextEncoder().encode('{"Status":4}'), "assinatura-invalida")).toBe(false);
  });
});

describe("Embed View Token Bunny", () => {
  it("gera vetor SHA-256 e expiração de cinco minutos", () => {
    vi.stubEnv("BUNNY_LIBRARY_ID", "123");
    vi.stubEnv("BUNNY_TOKEN_SECURITY_KEY", "security-key");
    const gerado = gerarUrlEmbedVideo("video-guid", 1_700_000_000);
    const esperado = createHash("sha256").update("security-keyvideo-guid1700000300").digest("hex");
    expect(gerado.expiresAt).toBe(1_700_000_300);
    expect(gerado.token).toBe(esperado);
    expect(gerado.url).toBe(
      `https://player.mediadelivery.net/embed/123/video-guid?token=${gerado.token}&expires=1700000300`,
    );
    expect(gerado.url).not.toContain("security-key");
  });

  it("falha fechado sem chave explícita de segurança", () => {
    vi.stubEnv("BUNNY_LIBRARY_ID", "123");
    vi.stubEnv("BUNNY_TOKEN_SECURITY_KEY", "");
    expect(() => gerarUrlEmbedVideo("video-guid", 1_700_000_000)).toThrow();
  });
});

describe("credenciais TUS Bunny", () => {
  it("não inclui a API key no retorno de renovação", () => {
    vi.stubEnv("BUNNY_LIBRARY_ID", "123");
    vi.stubEnv("BUNNY_API_KEY", "api-key-super-secreta");
    const tus = renovarCredenciaisTusBunny("video-guid", 1_700_000_000);
    expect(JSON.stringify(tus)).not.toContain("api-key-super-secreta");
    expect(tus.videoId).toBe("video-guid");
  });
});
