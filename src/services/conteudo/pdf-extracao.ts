import { PDFParse } from "pdf-parse";

import { db as dbPadrao } from "@/lib/db";
import type { MaterialTipo } from "@/generated/prisma/client";

export type ResultadoExtracaoPdf = "indexado" | "ignorado" | "falhou";

export interface DbExtracaoPdf {
  materials: {
    findUnique: (args: { where: { id: string } }) => Promise<{
      id: string;
      titulo: string;
      tipo: MaterialTipo;
      arquivo_key: string | null;
    } | null>;
    update: (args: {
      where: { id: string };
      data: { conteudo_busca: string };
    }) => Promise<unknown>;
  };
}

export interface DepsExtracaoPdf {
  db?: DbExtracaoPdf;
  lerArquivo?: (arquivoKey: string) => Promise<Uint8Array>;
  extrairTexto?: (bytes: Uint8Array) => Promise<string>;
  log?: (evento: { materialId: string; erro: string }) => void;
}

function normalizarTexto(texto: string): string {
  return texto.replace(/\s+/g, " ").trim().toLowerCase();
}

async function extrairTextoComPdfParse(bytes: Uint8Array): Promise<string> {
  const parser = new PDFParse({ data: bytes });
  try {
    const resultado = await parser.getText();
    return resultado.text;
  } finally {
    await parser.destroy();
  }
}

function registrarFalha(
  materialId: string,
  erro: unknown,
  log: (evento: { materialId: string; erro: string }) => void,
): void {
  log({
    materialId,
    erro: erro instanceof Error ? erro.message : "erro_desconhecido",
  });
}

/**
 * Indexa um PDF já persistido no storage. A falha é resultado degradado: o
 * título permanece pesquisável e o chamador pode publicar o material.
 */
export async function indexarPdfMaterial(
  materialId: string,
  arquivoKey: string,
  deps: DepsExtracaoPdf = {},
): Promise<ResultadoExtracaoPdf> {
  const db: DbExtracaoPdf = deps.db ?? dbPadrao;
  const lerArquivo = deps.lerArquivo;
  const extrairTexto = deps.extrairTexto ?? extrairTextoComPdfParse;
  const log = deps.log ?? ((evento) => console.warn("[conteudo/pdf] falha na extração", evento));

  if (!lerArquivo) return "ignorado";

  try {
    const material = await db.materials.findUnique({ where: { id: materialId } });
    if (
      material === null ||
      material.tipo !== "pdf" ||
      material.arquivo_key !== arquivoKey
    ) {
      return "ignorado";
    }

    const texto = normalizarTexto(await extrairTexto(await lerArquivo(arquivoKey)));
    const titulo = normalizarTexto(material.titulo);
    const conteudoBusca = [titulo, texto].filter((parte) => parte.length > 0).join(" ");

    await db.materials.update({
      where: { id: materialId },
      data: { conteudo_busca: conteudoBusca },
    });
    return "indexado";
  } catch (erro) {
    registrarFalha(materialId, erro, log);
    return "falhou";
  }
}
