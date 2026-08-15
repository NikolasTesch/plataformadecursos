// Testes unitários do storage (todo 5 — S2): driver pattern R2/stub + validação
// de PDF por magic bytes (C3) + signed URL de 10 min (C5).
//
// C3 (SPEC-conteudo.md:47,99): validação por MAGIC BYTES (nunca extensão), máx. 100MB.
// C5 (SPEC-conteudo.md:49,101): URL assinada expira em exatamente 600s e só é emitida
// após gating aprovado (contrato do chamador — testado no nível do contrato).
//
// Nenhum teste toca rede: getSignedUrl do SDK AWS calcula a assinatura localmente
// (SigV4 puro) e o stub não tem dependências externas.
import { describe, expect, it, vi, afterEach } from "vitest";
import { rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import {
  criarStorage,
  ErroStorage,
  getStorage,
  MAX_PDF_BYTES,
  R2StorageDriver,
  StubStorageDriver,
  URL_ASSINADA_TTL_SECONDS,
  validarArquivoPdf,
  validarUploadPdf,
} from "@/lib/storage";

/** Buffer com cabeçalho PDF real (magic bytes %PDF-). */
function bufferPdfValido(): Uint8Array {
  return new TextEncoder().encode("%PDF-1.7\n%\u00e2\u00e3\u00cf\u00d2\n1 0 obj\n<<>>\nendobj\n%%EOF");
}

/** Buffer de um "PDF falso" — conteúdo que NÃO começa com %PDF- (ex.: arquivo zip/qualquer). */
function bufferPdfFalso(): Uint8Array {
  return new TextEncoder().encode("PK\x03\x04 arquivo.zip disfarçado de PDF");
}

/** Buffer com %PDF- deslocado: prefixo antes do header (dentro dos 1024 bytes — ISO 32000). */
function bufferPdfComPrefix(prefixBytes: number): Uint8Array {
  const prefix = new Uint8Array(prefixBytes).fill(0x20); // espaços
  const header = new TextEncoder().encode("%PDF-1.7\n");
  const out = new Uint8Array(prefix.length + header.length);
  out.set(prefix, 0);
  out.set(header, prefix.length);
  return out;
}

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("validarArquivoPdf (C3 — magic bytes)", () => {
  it("aceita buffer com cabeçalho %PDF- no início", () => {
    expect(validarArquivoPdf(bufferPdfValido())).toBe(true);
  });

  it("aceita %PDF- dentro dos primeiros 1024 bytes (ISO 32000-1)", () => {
    expect(validarArquivoPdf(bufferPdfComPrefix(500))).toBe(true);
  });

  it("rejeita PDF falso — sem magic bytes, mesmo 'parecendo' arquivo", () => {
    // Nome/extensão não importam: sem %PDF- o conteúdo é rejeitado (C3).
    expect(validarArquivoPdf(bufferPdfFalso())).toBe(false);
  });

  it("rejeita %PDF sem o hífen do magic bytes (magic exato %PDF-)", () => {
    expect(validarArquivoPdf(new TextEncoder().encode("%PDFX-1.7\n"))).toBe(false);
  });

  it("rejeita %PDF- após os primeiros 1024 bytes", () => {
    expect(validarArquivoPdf(bufferPdfComPrefix(1025))).toBe(false);
  });

  it("rejeita buffer vazio", () => {
    expect(validarArquivoPdf(new Uint8Array(0))).toBe(false);
  });
});

describe("validarUploadPdf (C3 — magic bytes + limite 100MB)", () => {
  it("aceita PDF válido no limite exato de 100MB", () => {
    expect(() => validarUploadPdf(bufferPdfValido(), MAX_PDF_BYTES)).not.toThrow();
  });

  it("rejeita PDF falso mesmo minúsculo (magic bytes, não tamanho)", () => {
    expect(() => validarUploadPdf(bufferPdfFalso(), 100)).toThrowError(ErroStorage);
    try {
      validarUploadPdf(bufferPdfFalso(), 100);
    } catch (err) {
      expect(err).toBeInstanceOf(ErroStorage);
      expect((err as ErroStorage).code).toBe("ARQUIVO_NAO_PDF");
    }
  });

  it("rejeita arquivo >100MB mesmo com magic bytes válidos", () => {
    expect(() => validarUploadPdf(bufferPdfValido(), MAX_PDF_BYTES + 1)).toThrowError(ErroStorage);
    try {
      validarUploadPdf(bufferPdfValido(), MAX_PDF_BYTES + 1);
    } catch (err) {
      expect((err as ErroStorage).code).toBe("ARQUIVO_GRANDE_DEMAIS");
    }
  });
});

describe("StubStorageDriver (STORAGE_DRIVER=stub — sem credenciais)", () => {
  it("presign devolve uploadUrl não vazia e devolve a chave", async () => {
    const driver = new StubStorageDriver();
    const { uploadUrl, key } = await driver.createPresignedUpload({
      key: "materials/curso-1/material-1.pdf",
      mimeType: "application/pdf",
      size: 1024,
    });
    expect(uploadUrl.length).toBeGreaterThan(0);
    expect(key).toBe("materials/curso-1/material-1.pdf");
    expect(uploadUrl).toContain("/stub-storage/");
    expect(uploadUrl).toContain(key);
  });

  it("signed URL devolve URL derivável não vazia contendo a chave", async () => {
    const driver = new StubStorageDriver();
    const url = await driver.createSignedUrl("materials/curso-1/material-1.pdf");
    expect(url.length).toBeGreaterThan(0);
    expect(url).toContain("/stub-storage/materials/curso-1/material-1.pdf");
  });

  it("presign rejeita tamanho >100MB (C3 espelhado no stub)", async () => {
    const driver = new StubStorageDriver();
    await expect(
      driver.createPresignedUpload({ key: "materials/c1/m1.pdf", mimeType: "application/pdf", size: MAX_PDF_BYTES + 1 }),
    ).rejects.toThrowError(ErroStorage);
  });

  it("salvarArquivo persiste bytes no diretório local", async () => {
    const dir = join(tmpdir(), `concursfoco-stub-storage-test-${Date.now()}`);
    const driver = new StubStorageDriver(dir);
    try {
      const bytes = bufferPdfValido();
      const caminho = await driver.salvarArquivo("materials/c1/m1.pdf", bytes);
      expect(caminho).toBe(join(dir, "materials", "c1", "m1.pdf"));
      const lido = await import("node:fs/promises").then((fs) => fs.readFile(caminho));
      expect(new Uint8Array(lido)).toEqual(bytes);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it("funciona com zero variáveis de ambiente", async () => {
    // Garante que nem STORAGE_DRIVER nem R2_* existam no ambiente do teste.
    vi.stubEnv("STORAGE_DRIVER", "");
    vi.stubEnv("R2_BUCKET", "");
    vi.stubEnv("R2_ACCESS_KEY_ID", "");
    vi.stubEnv("R2_SECRET_ACCESS_KEY", "");
    const driver = criarStorage();
    expect(driver).toBeInstanceOf(StubStorageDriver);
    const { uploadUrl } = await driver.createPresignedUpload({
      key: "materials/c1/m1.pdf",
      mimeType: "application/pdf",
      size: 100,
    });
    const url = await driver.createSignedUrl("materials/c1/m1.pdf");
    expect(uploadUrl.length).toBeGreaterThan(0);
    expect(url.length).toBeGreaterThan(0);
  });
});

describe("criarStorage (factory — seleção do driver)", () => {
  it("sem STORAGE_DRIVER e sem credenciais R2 → stub (fallback documentado)", () => {
    vi.stubEnv("STORAGE_DRIVER", "");
    vi.stubEnv("R2_BUCKET", "");
    vi.stubEnv("R2_ACCESS_KEY_ID", "");
    vi.stubEnv("R2_SECRET_ACCESS_KEY", "");
    expect(criarStorage()).toBeInstanceOf(StubStorageDriver);
  });

  it("STORAGE_DRIVER=stub com credenciais presentes → stub (override explícito)", () => {
    vi.stubEnv("STORAGE_DRIVER", "stub");
    vi.stubEnv("R2_BUCKET", "bucket-de-teste");
    vi.stubEnv("R2_ACCESS_KEY_ID", "ak");
    vi.stubEnv("R2_SECRET_ACCESS_KEY", "sk");
    expect(criarStorage()).toBeInstanceOf(StubStorageDriver);
  });

  it("STORAGE_DRIVER=r2 sem credenciais → ErroStorage (erro claro, não fallback)", () => {
    vi.stubEnv("STORAGE_DRIVER", "r2");
    vi.stubEnv("R2_BUCKET", "");
    vi.stubEnv("R2_ACCESS_KEY_ID", "");
    vi.stubEnv("R2_SECRET_ACCESS_KEY", "");
    expect(() => criarStorage()).toThrowError(ErroStorage);
    try {
      criarStorage();
    } catch (err) {
      expect((err as ErroStorage).code).toBe("STORAGE_NAO_CONFIGURADO");
    }
  });

  it("STORAGE_DRIVER=r2 com credenciais + endpoint → driver R2", () => {
    vi.stubEnv("STORAGE_DRIVER", "r2");
    vi.stubEnv("R2_BUCKET", "bucket-de-teste");
    vi.stubEnv("R2_ACCESS_KEY_ID", "ak");
    vi.stubEnv("R2_SECRET_ACCESS_KEY", "sk");
    vi.stubEnv("R2_ENDPOINT", "https://acct123.r2.cloudflarestorage.com");
    expect(criarStorage()).toBeInstanceOf(R2StorageDriver);
  });

  it("sem STORAGE_DRIVER mas com credenciais R2 → r2 (auto-deteção)", () => {
    vi.stubEnv("STORAGE_DRIVER", "");
    vi.stubEnv("R2_BUCKET", "bucket-de-teste");
    vi.stubEnv("R2_ACCESS_KEY_ID", "ak");
    vi.stubEnv("R2_SECRET_ACCESS_KEY", "sk");
    vi.stubEnv("R2_ENDPOINT", "https://acct123.r2.cloudflarestorage.com");
    expect(criarStorage()).toBeInstanceOf(R2StorageDriver);
  });
});

describe("R2StorageDriver (contrato real — sem rede: assinatura SigV4 é local)", () => {
  function comCredenciais(): void {
    vi.stubEnv("R2_BUCKET", "bucket-de-teste");
    vi.stubEnv("R2_ACCESS_KEY_ID", "ak-teste");
    vi.stubEnv("R2_SECRET_ACCESS_KEY", "sk-teste");
    vi.stubEnv("R2_ENDPOINT", "https://acct123.r2.cloudflarestorage.com");
  }

  it("construtor sem credenciais → ErroStorage STORAGE_NAO_CONFIGURADO", () => {
    vi.stubEnv("R2_BUCKET", "");
    vi.stubEnv("R2_ACCESS_KEY_ID", "");
    vi.stubEnv("R2_SECRET_ACCESS_KEY", "");
    expect(() => new R2StorageDriver()).toThrowError(ErroStorage);
  });

  it("presign devolve URL assinada (X-Amz-Signature) com a chave", async () => {
    comCredenciais();
    const driver = new R2StorageDriver();
    const { uploadUrl, key } = await driver.createPresignedUpload({
      key: "materials/c1/m1.pdf",
      mimeType: "application/pdf",
      size: 1024,
    });
    expect(key).toBe("materials/c1/m1.pdf");
    expect(uploadUrl).toContain("X-Amz-Signature");
    // forcePathStyle: a chave aparece no path da URL (bucket + key), sem encoding.
    expect(new URL(uploadUrl).pathname).toContain("materials/c1/m1.pdf");
  });

  it("signed URL expira em exatamente 600s (C5 — 10 minutos)", async () => {
    comCredenciais();
    const driver = new R2StorageDriver();
    const url = await driver.createSignedUrl("materials/c1/m1.pdf");
    const expires = new URL(url).searchParams.get("X-Amz-Expires");
    expect(URL_ASSINADA_TTL_SECONDS).toBe(600);
    expect(expires).toBe("600");
  });

  it("presign rejeita size >100MB (C3)", async () => {
    comCredenciais();
    const driver = new R2StorageDriver();
    await expect(
      driver.createPresignedUpload({ key: "materials/c1/m1.pdf", mimeType: "application/pdf", size: MAX_PDF_BYTES + 1 }),
    ).rejects.toThrowError(ErroStorage);
  });
});

describe("getStorage (singleton lazy)", () => {
  it("retorna o mesmo driver em chamadas repetidas", () => {
    vi.stubEnv("STORAGE_DRIVER", "stub");
    expect(getStorage()).toBe(getStorage());
  });
});
