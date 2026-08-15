// Testes unitários dos helpers puros da sales page /cursos/[slug] (US-44).
//
// Cobre as regras que a página NÃO pode errar:
// - R12/C9 (SPEC-conteudo §4/:105): montarGradeCurso devolve UM SHAPE NOVO com
//   apenas { id, titulo, tipo, amostra, moduloNome } — mesmo que a entrada
//   traga objetos "gordos" (conteudo_html/arquivo_key), nada disso vaza.
// - C10 (SPEC-conteudo §4/:106): condicaoCursoVisivel devolve null quando o
//   curso não tem material publicado (a página responde 404).
// - Preço: formatarPreco pt-BR (R$ 99,90) e obterBadgePreco (venda única →
//   preço; senão "Incluído na assinatura"; senão nada).
//
// Helpers são funções puras — sem mock de banco/Next.
import { describe, expect, it } from "vitest";
import type { MaterialTipo } from "@/generated/prisma/client";

import {
  condicaoCursoVisivel,
  formatarPreco,
  montarGradeCurso,
  obterBadgePreco,
  type CursoSales,
  type MaterialGrade,
  type ModuloGrade,
} from "@/app/(landing)/cursos/[slug]/helpers";

function cursoFake(overrides: Partial<CursoSales> = {}): CursoSales {
  return {
    slug: "curso-demo",
    nome: "Curso Demo",
    descricao: null,
    imagem_url: null,
    incluido_assinatura: false,
    ...overrides,
  };
}

/** Material "gordo" com campos de conteúdo (como existiriam no Prisma). */
type MaterialFat = MaterialGrade & {
  conteudo_html?: string;
  arquivo_key?: string;
  conteudo_busca?: string;
};

function materialVazado(overrides: Partial<MaterialFat> = {}): MaterialFat {
  return {
    id: "material-uuid-1",
    titulo: "Aula 1",
    tipo: "texto" as MaterialTipo,
    amostra: false,
    conteudo_html: "<h1>SEGREDO do material</h1><p>Conteúdo pago.</p>",
    arquivo_key: "materials/curso1/material1.pdf",
    conteudo_busca: "segregado do material conteudo pago",
    ...overrides,
  };
}

function moduloFake(overrides: Partial<ModuloGrade> = {}): ModuloGrade {
  return {
    id: "modulo-uuid-1",
    nome: "Módulo 1",
    materials: [],
    ...overrides,
  };
}

describe("montarGradeCurso (C9/R12 — grade sem conteúdo)", () => {
  it("devolve apenas { id, titulo, tipo, amostra, moduloNome } — sem campos de conteúdo", () => {
    const modulo = moduloFake({ materials: [materialVazado()] });
    const grade = montarGradeCurso([modulo]);

    expect(grade).toHaveLength(1);
    expect(grade[0].nome).toBe("Módulo 1");
    expect(grade[0].materiais).toHaveLength(1);
    // Shape exato: nada além dos campos seguros (C9).
    expect(Object.keys(grade[0].materiais[0]).sort()).toEqual([
      "amostra",
      "id",
      "moduloNome",
      "tipo",
      "titulo",
    ]);
    expect(grade[0].materiais[0]).toEqual({
      id: "material-uuid-1",
      titulo: "Aula 1",
      tipo: "texto",
      amostra: false,
      moduloNome: "Módulo 1",
    });
  });

  it("R12: nenhum campo de conteúdo sobrevive no serializado da grade", () => {
    const grade = montarGradeCurso([
      moduloFake({
        materials: [
          materialVazado(),
          materialVazado({
            id: "material-uuid-2",
            titulo: "PDF de apoio",
            tipo: "pdf",
            arquivo_key: "materials/curso1/material2.pdf",
          }),
        ],
      }),
    ]);

    const serializado = JSON.stringify(grade);
    expect(serializado).not.toContain("conteudo_html");
    expect(serializado).not.toContain("arquivo_key");
    expect(serializado).not.toContain("conteudo_busca");
    expect(serializado).not.toContain("SEGREDO do material");
    expect(serializado).not.toContain("Conteúdo pago");
    // Os campos seguros estão lá.
    expect(serializado).toContain("Aula 1");
    expect(serializado).toContain("PDF de apoio");
  });

  it("preserva a ordem de módulos e materiais (R6: ordem crescente)", () => {
    const grade = montarGradeCurso([
      moduloFake({
        id: "mod-1",
        nome: "Módulo A",
        materials: [
          materialVazado({ id: "m1", titulo: "Primeiro" }),
          materialVazado({ id: "m2", titulo: "Segundo" }),
        ],
      }),
      moduloFake({ id: "mod-2", nome: "Módulo B", materials: [] }),
    ]);

    expect(grade.map((m) => m.nome)).toEqual(["Módulo A", "Módulo B"]);
    expect(grade[0].materiais.map((m) => m.titulo)).toEqual([
      "Primeiro",
      "Segundo",
    ]);
  });

  it("espalha o nome do módulo em cada item (shape achatado p/ render)", () => {
    const grade = montarGradeCurso([
      moduloFake({ nome: "Introdução", materials: [materialVazado()] }),
    ]);
    expect(grade[0].materiais[0].moduloNome).toBe("Introdução");
  });

  it("lista vazia → grade vazia", () => {
    expect(montarGradeCurso([])).toEqual([]);
    expect(montarGradeCurso([moduloFake()])).toEqual([
      { id: "modulo-uuid-1", nome: "Módulo 1", materiais: [] },
    ]);
  });

  it("amostra e tipo são preservados (grade precisa deles p/ badge e ícone)", () => {
    const grade = montarGradeCurso([
      moduloFake({
        materials: [
          materialVazado({ amostra: true }),
          materialVazado({ id: "m2", tipo: "resumo" }),
        ],
      }),
    ]);
    expect(grade[0].materiais[0].amostra).toBe(true);
    expect(grade[0].materiais[1].tipo).toBe("resumo");
  });
});

describe("condicaoCursoVisivel (C10 — 404 para curso sem material publicado)", () => {
  it("curso SEM material publicado → null (rascunho/vazio não tem página)", () => {
    expect(condicaoCursoVisivel(cursoFake(), 0)).toBeNull();
  });

  it("curso com 1+ material publicado → devolve o curso (visível)", () => {
    const curso = cursoFake({ slug: "direito-constitucional" });
    expect(condicaoCursoVisivel(curso, 1)).toBe(curso);
    expect(condicaoCursoVisivel(curso, 12)).toBe(curso);
  });
});

describe("formatarPreco (pt-BR a partir de centavos)", () => {
  it("formata centavos como R$ com vírgula", () => {
    expect(formatarPreco(9990)).toBe("R$ 99,90");
    expect(formatarPreco(1500)).toBe("R$ 15,00");
    expect(formatarPreco(5)).toBe("R$ 0,05");
    expect(formatarPreco(0)).toBe("R$ 0,00");
  });

  it("agrupa milhares com ponto", () => {
    expect(formatarPreco(123456)).toBe("R$ 1.234,56");
    expect(formatarPreco(100000000)).toBe("R$ 1.000.000,00");
  });
});

describe("obterBadgePreco (badge da sales page — US-44)", () => {
  it("venda única ativa COM preço → mostra o preço (prioridade máxima)", () => {
    expect(
      obterBadgePreco({
        incluido_assinatura: true, // assinatura não rouba a cena da venda única
        produto_venda_unica_ativo: true,
        preco_venda_unica_cents: 4990,
      }),
    ).toBe("R$ 49,90");
  });

  it("venda única ativa SEM preço (schema S2 não tem o campo — S6 define) → nada", () => {
    expect(
      obterBadgePreco({
        incluido_assinatura: false,
        produto_venda_unica_ativo: true,
        preco_venda_unica_cents: null,
      }),
    ).toBeNull();
  });

  it("incluído na assinatura → badge 'Incluído na assinatura'", () => {
    expect(
      obterBadgePreco({
        incluido_assinatura: true,
        produto_venda_unica_ativo: false,
        preco_venda_unica_cents: null,
      }),
    ).toBe("Incluído na assinatura");
  });

  it("nem venda única nem assinatura → sem badge", () => {
    expect(
      obterBadgePreco({
        incluido_assinatura: false,
        produto_venda_unica_ativo: false,
        preco_venda_unica_cents: null,
      }),
    ).toBeNull();
  });
});
