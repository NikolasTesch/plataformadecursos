import { describe, expect, it, vi } from "vitest";
import PDFDocument from "pdfkit";
import type { materials } from "@/generated/prisma/client";

import {
  indexarPdfMaterial,
  type DbExtracaoPdf,
} from "@/services/conteudo/pdf-extracao";
import { publicarMaterial, type DbMateriais } from "@/services/conteudo/materiais";

function criarDb(material: {
  id: string;
  titulo: string;
  tipo: "pdf";
  arquivo_key: string;
  status: "rascunho";
}): {
  db: DbExtracaoPdf;
  dbPublicacao: DbMateriais;
  updateExtracao: ReturnType<typeof vi.fn>;
  updatePublicacao: ReturnType<typeof vi.fn>;
} {
  const updateExtracao = vi.fn<DbExtracaoPdf["materials"]["update"]>(async () => undefined);
  const materialCompleto: materials = {
    ...material,
    module_id: "mod-1",
    ordem: 1,
    publicado_em: null,
    amostra: false,
    conteudo_html: null,
    video_provider_id: null,
    video_status: null,
    video_erro: null,
    conteudo_busca: material.titulo.toLowerCase(),
    criado_em: new Date("2026-08-17T12:00:00Z"),
    atualizado_em: new Date("2026-08-17T12:00:00Z"),
  };
  const updatePublicacao = vi.fn<DbMateriais["materials"]["update"]>(async () => ({
    ...materialCompleto,
    status: "publicado",
    publicado_em: new Date("2026-08-17T12:00:00Z"),
  }));
  const db: DbExtracaoPdf = {
    materials: {
      findUnique: vi.fn<DbExtracaoPdf["materials"]["findUnique"]>(async () => material),
      update: updateExtracao,
    },
  };
  const dbPublicacao: DbMateriais = {
    materials: {
      findUnique: vi.fn<DbMateriais["materials"]["findUnique"]>(async () => materialCompleto),
      create: vi.fn<DbMateriais["materials"]["create"]>(),
      findMany: vi.fn<DbMateriais["materials"]["findMany"]>(),
      count: vi.fn<DbMateriais["materials"]["count"]>(),
      aggregate: vi.fn<DbMateriais["materials"]["aggregate"]>(),
      update: updatePublicacao,
      updateMany: vi.fn<DbMateriais["materials"]["updateMany"]>(async () => ({ count: 1 })),
    },
    modules: {
      findUnique: vi.fn<DbMateriais["modules"]["findUnique"]>(),
    },
  };

  return { db, dbPublicacao, updateExtracao, updatePublicacao };
}

function criarPdfDeTeste(): Promise<Uint8Array> {
  return new Promise((resolve, reject) => {
    const documento = new PDFDocument({ compress: false });
    const partes: Buffer[] = [];
    documento.on("data", (parte: Buffer) => partes.push(parte));
    documento.on("end", () => resolve(Buffer.concat(partes)));
    documento.on("error", reject);
    documento.text("Texto real do PDF para indexação");
    documento.end();
  });
}

describe("indexarPdfMaterial (US-21 / todo 11)", () => {
  it("Given PDF extraído, When finaliza o upload, Then persiste título e texto normalizado", async () => {
    const material = {
      id: "mat-pdf-1",
      titulo: "Aula 1",
      tipo: "pdf" as const,
      arquivo_key: "materials/curso-1/mat-pdf-1.pdf",
      status: "rascunho" as const,
    };
    const { db, updateExtracao } = criarDb(material);

    const resultado = await indexarPdfMaterial(material.id, material.arquivo_key, {
      db,
      lerArquivo: async () => new Uint8Array([37, 80, 68, 70, 45]),
      extrairTexto: async () => "  Princípios\n   constitucionais  ",
    });

    expect(resultado).toBe("indexado");
    expect(updateExtracao).toHaveBeenCalledWith({
      where: { id: material.id },
      data: { conteudo_busca: "aula 1 princípios constitucionais" },
    });
  });

  it("Given parser failure, When finaliza o upload, Then logs, returns failure and publication remains possible", async () => {
    const material = {
      id: "mat-pdf-2",
      titulo: "Aula 2",
      tipo: "pdf" as const,
      arquivo_key: "materials/curso-1/mat-pdf-2.pdf",
      status: "rascunho" as const,
    };
    const { db, dbPublicacao, updateExtracao, updatePublicacao } = criarDb(material);
    const log = vi.fn();

    const resultado = await indexarPdfMaterial(material.id, material.arquivo_key, {
      db,
      lerArquivo: async () => new Uint8Array([37, 80, 68, 70, 45]),
      extrairTexto: async () => {
        throw new Error("PDF corrompido");
      },
      log,
    });
    const publicado = await publicarMaterial(material.id, { db: dbPublicacao });

    expect(resultado).toBe("falhou");
    expect(log).toHaveBeenCalledWith({
      materialId: material.id,
      erro: "PDF corrompido",
    });
    expect(updateExtracao).not.toHaveBeenCalled();
    expect(publicado.status).toBe("publicado");
    expect(updatePublicacao).toHaveBeenCalled();
  });

  it("Given um PDF real, When usa o parser padrão, Then extrai o texto para a busca", async () => {
    const material = {
      id: "mat-pdf-real",
      titulo: "Aula real",
      tipo: "pdf" as const,
      arquivo_key: "materials/curso-1/mat-pdf-real.pdf",
      status: "rascunho" as const,
    };
    const { db, updateExtracao } = criarDb(material);

    const resultado = await indexarPdfMaterial(material.id, material.arquivo_key, {
      db,
      lerArquivo: criarPdfDeTeste,
    });

    expect(resultado).toBe("indexado");
    expect(updateExtracao.mock.calls[0]?.[0].data.conteudo_busca).toContain(
      "texto real do pdf para indexação",
    );
  });
});
