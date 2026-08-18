// src/lib/pdf — Geração de PDF no servidor (impressão de material, US-41).
//
// Infra (AGENTS.md §6): consumida por src/services e por route handlers finos,
// nunca contém regra de negócio. A regra de GATING (R12) vive no chamador
// (rota de impressão) — esta lib apenas renderiza.
//
// DECISÕES (registradas em .omo/notepads/s2-conteudo/decisions.md, todo 9):
// - Lib: **pdfkit 0.19.1** (layout de texto com quebra de linha automática —
//   pdf-lib exigiria wrapping manual). A fonte padrão (Helvetica) suporta
//   acentos WinAnsi, mas NÃO símbolos (→, ≤, ½) nem todos os acentos do
//   conteúdo: **fonte embutida DejaVu Sans** (assets/ — licença Bitstream
//   Vera + domínio público, LICENSE-DEJAVU.txt) cobre o alfabeto completo.
// - `compress: false`: streams em texto puro (legíveis/debugáveis; o texto é
//   extraível pelos testes via ToUnicode CMap sem descomprimir). Documentos
//   pequenos e gerados por requisição — custo aceitável.
// - **C8 (SPEC-conteudo.md:61-64, US-41): NENHUM cache persistente** — o PDF é
//   gerado a cada requisição autorizada. (O único memo é o BUFFER das fontes,
//   assets estáticos — não é cache de PDF.)
// - C4: o HTML do material é sanitizado AQUI (whitelist) antes de virar texto
//   — defesa em profundidade além da sanitização na renderização.
// - Erros tipados (ErroPdf) — sem any/@ts-ignore.
import { readFileSync } from "node:fs";
import { join } from "node:path";

import PDFDocument from "pdfkit";

import { sanitizarHtml } from "@/lib/sanitize";

export type ErroPdfCode = "TITULO_VAZIO" | "FONTE_NAO_ENCONTRADA";

/** Erro tipado da geração de PDF — rotas respondem pelo `code`. */
export class ErroPdf extends Error {
  constructor(
    mensagem: string,
    readonly code: ErroPdfCode,
  ) {
    super(mensagem);
    this.name = "ErroPdf";
  }
}

/** Dados mínimos do material para a impressão (US-41). */
export interface DadosPdfMaterial {
  titulo: string;
  /** HTML cru do banco (tipo texto/resumo) — sanitizado DENTRO da função. */
  conteudoHtml: string | null;
}

export interface DadosPdfCertificado { nome: string; curso: string; data: Date; codigo: string; }

// ---------------------------------------------------------------------------
// Fontes embutidas (DejaVu Sans — Unicode completo, ver cabeçalho)
// ---------------------------------------------------------------------------

interface FontesPdf {
  sans: Buffer;
  bold: Buffer;
}

// Memo de ASSETS (bytes das fontes, imutáveis) — NÃO é cache de PDF (C8).
// `process.cwd()` = raiz do repo em dev E nas serverless functions da Vercel
// (o fonte é deployado junto) — padrão documentado para pdfkit + fontes.
let fontesCache: FontesPdf | undefined;

function obterFontes(): FontesPdf {
  if (fontesCache !== undefined) return fontesCache;
  const dir = join(process.cwd(), "src", "lib", "pdf", "assets");
  try {
    fontesCache = {
      sans: readFileSync(join(dir, "DejaVuSans.ttf")),
      bold: readFileSync(join(dir, "DejaVuSans-Bold.ttf")),
    };
  } catch {
    throw new ErroPdf(
      `fontes DejaVu não encontradas em ${dir} (instale dejavu-fonts-ttf e copie para assets/)`,
      "FONTE_NAO_ENCONTRADA",
    );
  }
  return fontesCache;
}

// ---------------------------------------------------------------------------
// HTML → texto puro (após sanitização C4)
// ---------------------------------------------------------------------------

const ENTIDADES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
};

/** Decodifica entidades HTML (nomeadas comuns + numéricas) — nunca lança. */
function decodificarEntidades(texto: string): string {
  return texto.replace(/&(#x[0-9a-fA-F]+|#[0-9]+|[a-zA-Z]+);/g, (inteira, corpo: string) => {
    if (corpo.startsWith("#x")) {
      const ponto = parseInt(corpo.slice(2), 16);
      return Number.isFinite(ponto) ? String.fromCodePoint(ponto) : inteira;
    }
    if (corpo.startsWith("#")) {
      const ponto = parseInt(corpo.slice(1), 10);
      return Number.isFinite(ponto) ? String.fromCodePoint(ponto) : inteira;
    }
    return ENTIDADES[corpo] ?? inteira;
  });
}

/**
 * Converte HTML sanitizado em texto puro para o PDF (layout simples, US-41).
 * Quebras de bloco (p, h1-h6, li, tr, blockquote, br) viram quebra de linha;
 * imagens viram "[alt]" (ou "[imagem]"); linhas em branco e espaços múltiplos
 * são colapsados. Função pura, exportada para testes.
 */
export function htmlParaTextoPuro(html: string): string {
  const comQuebras = html
    .replace(/<\/(p|h[1-6]|li|tr|blockquote|ul|ol|table|thead|tbody)>/gi, "\n")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<img\b[^>]*>/gi, (tag) => {
      const alt = tag.match(/alt="([^"]*)"/i);
      const descricao = alt?.[1]?.trim();
      return descricao ? `[${descricao}]` : "[imagem]";
    })
    .replace(/<[^>]+>/g, "");

  return decodificarEntidades(
    comQuebras
      .split("\n")
      .map((linha) => linha.replace(/\s+/g, " ").trim())
      .filter((linha) => linha.length > 0)
      .join("\n"),
  );
}

// ---------------------------------------------------------------------------
// Geração do PDF (US-41 — impressão de material texto/resumo)
// ---------------------------------------------------------------------------

/**
 * Gera o PDF de impressão de um material (texto/resumo) — US-41.
 *
 * Layout simples: título (DejaVu Bold 18) + corpo em texto puro (DejaVu 12),
 * A4 com margens de 48pt, quebra de linha automática do pdfkit.
 *
 * CONTRATOS:
 * - **R12/gating é do chamador**: a rota de impressão autoriza ANTES de chamar
 *   esta função — nunca chamar sem passar pelo gating.
 * - **C8: sem cache** — o PDF é regenerado a cada chamada autorizada.
 * - C4: `conteudoHtml` é sanitizado (whitelist) aqui antes de virar texto.
 * - Retorna um Buffer iniciado com "%PDF" (magic — testável diretamente).
 *
 * @throws ErroPdf (TITULO_VAZIO | FONTE_NAO_ENCONTRADA)
 */
export async function gerarPdfMaterial(dados: DadosPdfMaterial): Promise<Buffer> {
  const titulo = typeof dados.titulo === "string" ? dados.titulo.trim() : "";
  if (titulo.length === 0) {
    throw new ErroPdf("o título do material é obrigatório para gerar o PDF", "TITULO_VAZIO");
  }

  // C4 (defesa em profundidade): sanitiza o HTML do banco antes de extrair texto.
  const conteudo = htmlParaTextoPuro(sanitizarHtml(dados.conteudoHtml ?? ""));
  const corpo = conteudo.length > 0 ? conteudo : "(material sem conteúdo)";

  const { sans, bold } = obterFontes();

  return new Promise<Buffer>((resolve, reject) => {
    const doc = new PDFDocument({ size: "A4", margin: 48, compress: false });
    const pedacos: Buffer[] = [];
    doc.on("data", (pedaco: Buffer) => pedacos.push(pedaco));
    doc.on("end", () => resolve(Buffer.concat(pedacos)));
    doc.on("error", reject);

    doc.registerFont("DejaVuSans", sans);
    doc.registerFont("DejaVuSans-Bold", bold);

    doc.font("DejaVuSans-Bold").fontSize(18).text(titulo, { lineGap: 2 });
    doc.moveDown();
    doc.font("DejaVuSans").fontSize(12).text(corpo, { lineGap: 4 });

    doc.end();
  });
}

/** Gera o certificado mínimo, sem endereço, e-mail ou qualquer PII adicional. */
export async function gerarPdfCertificado(dados: DadosPdfCertificado): Promise<Buffer> {
  const nome = dados.nome.trim();
  const curso = dados.curso.trim();
  const codigo = dados.codigo.trim();
  if (!nome || !curso || !codigo) throw new ErroPdf("dados do certificado incompletos", "TITULO_VAZIO");
  const { sans, bold } = obterFontes();
  const data = dados.data.toLocaleDateString("pt-BR");
  return new Promise<Buffer>((resolve, reject) => {
    const doc = new PDFDocument({ size: "A4", margin: 64, compress: false });
    const pedacos: Buffer[] = [];
    doc.on("data", (pedaco: Buffer) => pedacos.push(pedaco));
    doc.on("end", () => resolve(Buffer.concat(pedacos)));
    doc.on("error", reject);
    doc.registerFont("DejaVuSans", sans).registerFont("DejaVuSans-Bold", bold);
    doc.font("DejaVuSans-Bold").fontSize(24).text("Certificado", { align: "center" });
    doc.moveDown(2).font("DejaVuSans").fontSize(16).text(nome, { align: "center" });
    doc.moveDown().fontSize(13).text(`Concluiu o curso: ${curso}`, { align: "center" });
    doc.moveDown().text(`Data: ${data}`, { align: "center" });
    doc.moveDown().fontSize(11).text(`Código: ${codigo}`, { align: "center" });
    doc.end();
  });
}
