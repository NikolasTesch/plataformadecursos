// src/lib/storage — Storage de arquivos (driver pattern: Cloudflare R2 | stub local)
//
// Infra (AGENTS.md §6): consumida por src/services/conteudo, nunca por rotas.
//
// Driver pattern (decisão do plano S2, todo 5): a lib expõe uma interface mínima
// `StorageDriver` com dois contratos — presigned upload (upload direto do cliente,
// bytes NUNCA passam pelo servidor da aplicação) e signed URL de leitura com
// validade de 10 minutos (C5). A seleção do driver acontece na factory
// `criarStorage()` lendo `STORAGE_DRIVER` + presença das variáveis R2_*:
//
//   STORAGE_DRIVER=r2      → driver real (exige R2_BUCKET/ACCESS_KEY/SECRET + endpoint;
//                            ausência de credenciais é erro claro, não fallback silencioso)
//   STORAGE_DRIVER=stub    → driver stub (dev/CI, override explícito mesmo com credenciais)
//   (não definido)         → credenciais R2 presentes ? r2 : stub (fallback documentado,
//                            decisão 3 do plano — sem credenciais, nunca quebra o dev)
//
// C3 (SPEC-conteudo.md:47,99): validação de PDF por MAGIC BYTES (%PDF- nos primeiros
// 1024 bytes, ISO 32000-1) e limite de 100MB. Como o upload é presigned direct, o
// servidor nunca recebe os bytes — a validação de magic bytes é uma função pura
// exportada (`validarArquivoPdf`/`validarUploadPdf`) para o chamador executar no
// cliente/rota ANTES de pedir o presign; o limite de tamanho é reforçado também no
// driver, no momento do presign (rejeita size > 100MB).
//
// C5 (SPEC-conteudo.md:49,101): a signed URL expira em exatamente 10 min (600s) e
// SÓ pode ser emitida após o gating aprovar o acesso (R7/R12) — contrato do chamador
// (todo 7/9 implementam o gating; esta lib apenas documenta o contrato no método).
import { GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";

/** Limite de tamanho de PDF (C3): 100MB. */
export const MAX_PDF_BYTES = 100 * 1024 * 1024;

/** Validade da URL assinada (C5): 600s = 10 minutos, exatamente. */
export const URL_ASSINADA_TTL_SECONDS = 600;

/** Magic bytes do PDF (C3): o cabeçalho `%PDF-` precisa aparecer nos primeiros 1024 bytes (ISO 32000-1). */
const PDF_MAGIC = "%PDF-";
const PDF_MAGIC_SCAN_BYTES = 1024;

/** Base das URLs deriváveis do stub (sem credenciais). A rota /stub-storage/{key} é documental —
 *  o upload/leitura reais em modo stub persistem no disco local (ver StubStorageDriver). */
const STUB_BASE_URL = "http://127.0.0.1:3000/stub-storage";

export type ErroStorageCode =
  | "ARQUIVO_NAO_PDF"
  | "ARQUIVO_GRANDE_DEMAIS"
  | "STORAGE_NAO_CONFIGURADO";

/** Erro tipado do storage — sem `any`, sem @ts-ignore. */
export class ErroStorage extends Error {
  constructor(
    message: string,
    readonly code: ErroStorageCode,
  ) {
    super(message);
    this.name = "ErroStorage";
  }
}

/**
 * C3 — validação por magic bytes (nunca por extensão).
 * Verifica se o cabeçalho `%PDF-` aparece nos primeiros 1024 bytes do buffer
 * (ISO 32000-1: o header deve estar dentro dessa janela). Função pura, sem I/O.
 */
export function validarArquivoPdf(buffer: Uint8Array): boolean {
  const janela = Math.min(buffer.length, PDF_MAGIC_SCAN_BYTES);
  for (let i = 0; i + PDF_MAGIC.length <= janela; i++) {
    let bateu = true;
    for (let j = 0; j < PDF_MAGIC.length; j++) {
      if (buffer[i + j] !== PDF_MAGIC.charCodeAt(j)) {
        bateu = false;
        break;
      }
    }
    if (bateu) return true;
  }
  return false;
}

/**
 * C3 — validação completa de upload de PDF: magic bytes + limite de 100MB.
 * Lança ErroStorage tipado (ARQUIVO_NAO_PDF | ARQUIVO_GRANDE_DEMAIS) quando inválido.
 */
export function validarUploadPdf(buffer: Uint8Array, size: number): void {
  if (size > MAX_PDF_BYTES) {
    throw new ErroStorage(
      `Arquivo excede o limite de ${MAX_PDF_BYTES / (1024 * 1024)}MB (C3).`,
      "ARQUIVO_GRANDE_DEMAIS",
    );
  }
  if (!validarArquivoPdf(buffer)) {
    throw new ErroStorage(
      "Arquivo não é um PDF válido (magic bytes %PDF- ausentes — C3).",
      "ARQUIVO_NAO_PDF",
    );
  }
}

/** Contrato mínimo do storage — consumido por services (upload presigned + signed URL de leitura). */
export type StorageDriver = {
  /**
   * URL pré-assinada para upload DIRETO do cliente (PutObject no R2 — bytes nunca
   * passam pelo servidor da aplicação). Rejeita size > 100MB (C3).
   */
  createPresignedUpload(params: {
    key: string;
    mimeType: string;
    size: number;
  }): Promise<{ uploadUrl: string; key: string }>;

  /**
   * URL assinada de leitura válida por exatamente 10 min (C5, 600s).
   * CONTRATO DO CHAMADOR (C5): só pode ser emitida após o gating aprovar o acesso
   * (R7/R12) — a lib não faz o gating, o chamador é responsável por chamar este
   * método apenas para materiais autorizados.
   */
  createSignedUrl(key: string): Promise<string>;

  /** Lê bytes no servidor para processamento pós-upload (ex.: indexação PDF). */
  lerArquivo?: (key: string) => Promise<Uint8Array>;
};

/**
 * Driver real: Cloudflare R2 via @aws-sdk/client-s3 (S3-compatible).
 * Endpoint derivado de R2_ENDPOINT ou `https://<R2_ACCOUNT_ID>.r2.cloudflarestorage.com`;
 * region "auto"; forcePathStyle obrigatório (R2 não tem virtual-host style).
 */
export class R2StorageDriver implements StorageDriver {
  private readonly client: S3Client;
  private readonly bucket: string;

  constructor() {
    const accessKeyId = process.env.R2_ACCESS_KEY_ID;
    const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
    const bucket = process.env.R2_BUCKET;
    if (!accessKeyId || !secretAccessKey || !bucket) {
      throw new ErroStorage(
        "R2 não configurado: defina R2_BUCKET, R2_ACCESS_KEY_ID e R2_SECRET_ACCESS_KEY (ou use STORAGE_DRIVER=stub para dev/CI).",
        "STORAGE_NAO_CONFIGURADO",
      );
    }
    const endpoint =
      process.env.R2_ENDPOINT ??
      (process.env.R2_ACCOUNT_ID
        ? `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`
        : undefined);
    if (!endpoint) {
      throw new ErroStorage(
        "R2 sem endpoint: defina R2_ENDPOINT ou R2_ACCOUNT_ID (deriva https://<accountid>.r2.cloudflarestorage.com).",
        "STORAGE_NAO_CONFIGURADO",
      );
    }
    this.bucket = bucket;
    this.client = new S3Client({
      region: "auto",
      endpoint,
      credentials: { accessKeyId, secretAccessKey },
      forcePathStyle: true,
    });
  }

  async createPresignedUpload(params: {
    key: string;
    mimeType: string;
    size: number;
  }): Promise<{ uploadUrl: string; key: string }> {
    if (params.size > MAX_PDF_BYTES) {
      throw new ErroStorage(
        `Arquivo excede o limite de ${MAX_PDF_BYTES / (1024 * 1024)}MB (C3).`,
        "ARQUIVO_GRANDE_DEMAIS",
      );
    }
    const uploadUrl = await getSignedUrl(
      this.client,
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: params.key,
        ContentType: params.mimeType,
      }),
      { expiresIn: URL_ASSINADA_TTL_SECONDS },
    );
    return { uploadUrl, key: params.key };
  }

  async createSignedUrl(key: string): Promise<string> {
    // C5: 600s exatos. Gating é responsabilidade do chamador (R7/R12) — ver contrato no tipo.
    return getSignedUrl(
      this.client,
      new GetObjectCommand({ Bucket: this.bucket, Key: key }),
      { expiresIn: URL_ASSINADA_TTL_SECONDS },
    );
  }

  async lerArquivo(key: string): Promise<Uint8Array> {
    const resposta = await this.client.send(
      new GetObjectCommand({ Bucket: this.bucket, Key: key }),
    );
    if (!resposta.Body) throw new Error("objeto do storage sem corpo");
    return resposta.Body.transformToByteArray();
  }
}

/**
 * Driver stub (STORAGE_DRIVER=stub — default quando não há credenciais R2, decisão 3
 * do plano S2): dev/CI sem credenciais. URLs deriváveis (http://127.0.0.1:3000/stub-storage/{key})
 * e registro/bytes persistidos em disco local (tmpdir/concursfoco-stub-storage) para
 * inspeção e para os fluxos de dev/E2E que precisam de um "objeto" de fato.
 */
export class StubStorageDriver implements StorageDriver {
  constructor(
    /** Diretório local onde o stub persiste (testes injetam um dir temporário). */
    private readonly dir: string = join(tmpdir(), "concursfoco-stub-storage"),
  ) {}

  async createPresignedUpload(params: {
    key: string;
    mimeType: string;
    size: number;
  }): Promise<{ uploadUrl: string; key: string }> {
    if (params.size > MAX_PDF_BYTES) {
      throw new ErroStorage(
        `Arquivo excede o limite de ${MAX_PDF_BYTES / (1024 * 1024)}MB (C3).`,
        "ARQUIVO_GRANDE_DEMAIS",
      );
    }
    // Registro local do "objeto" (simula o objeto criado no R2; bytes reais só
    // chegam via salvarArquivo — presigned direct não entrega bytes ao servidor).
    const caminhoRegistro = join(this.dir, `${params.key}.json`);
    await mkdir(dirname(caminhoRegistro), { recursive: true });
    await writeFile(
      caminhoRegistro,
      JSON.stringify({ key: params.key, mimeType: params.mimeType, size: params.size, criadoEm: new Date().toISOString() }),
      "utf8",
    );
    return { uploadUrl: `${STUB_BASE_URL}/${params.key}`, key: params.key };
  }

  async createSignedUrl(key: string): Promise<string> {
    // Modo stub: a "assinatura" é a própria URL derivável (sem credenciais não há
    // assinatura a calcular; o endpoint local não exige autenticação).
    return `${STUB_BASE_URL}/${key}`;
  }

  /**
   * EXTENSÃO do stub (fora do contrato StorageDriver — só existe nesta classe):
   * persiste bytes de um arquivo em disco local para dev/E2E que precisam do
   * conteúdo de fato (ex.: extração de texto no upload, todo 11). Retorna o
   * caminho absoluto do arquivo escrito.
   */
  async salvarArquivo(key: string, buffer: Uint8Array): Promise<string> {
    const caminho = join(this.dir, key);
    await mkdir(dirname(caminho), { recursive: true });
    await writeFile(caminho, buffer);
    return caminho;
  }

  async lerArquivo(key: string): Promise<Uint8Array> {
    return readFile(join(this.dir, key));
  }
}

/**
 * Factory de drivers (decisão 3 do plano S2):
 *  - STORAGE_DRIVER=r2   → R2 (credenciais ausentes = ErroStorage claro, nunca fallback silencioso);
 *  - STORAGE_DRIVER=stub → stub (override explícito);
 *  - não definido        → credenciais R2 presentes ? r2 : stub (fallback documentado).
 */
export function criarStorage(): StorageDriver {
  const driver = process.env.STORAGE_DRIVER;
  const temCredenciaisR2 = Boolean(
    process.env.R2_BUCKET && process.env.R2_ACCESS_KEY_ID && process.env.R2_SECRET_ACCESS_KEY,
  );
  if (driver === "r2") return new R2StorageDriver();
  if (driver === "stub" || !temCredenciaisR2) return new StubStorageDriver();
  return new R2StorageDriver();
}

// Singleton lazy (criado no primeiro uso para respeitar env definido em runtime —
// padrão do projeto, ver src/lib/db.ts). Evita múltiplos clientes S3 no hot-reload.
let instanciaStorage: StorageDriver | undefined;

/** Acesso ao driver único da aplicação (criado sob demanda com o env vigente). */
export function getStorage(): StorageDriver {
  if (!instanciaStorage) instanciaStorage = criarStorage();
  return instanciaStorage;
}
