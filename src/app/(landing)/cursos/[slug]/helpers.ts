// Helpers PURAS da sales page /cursos/[slug] (US-44) — C9, C10 e preço.
//
// Toda a regra de NEGÓCIO da página vive aqui (funções puras, testáveis);
// a página (page.tsx) só busca dados e renderiza. Separação em arquivo
// próprio para os testes unitários importarem sem tocar no Next/banco.
//
// R12/C9 (SPEC-conteudo §4/:105): a grade pública NUNCA entrega conteúdo —
// `montarGradeCurso` constrói um shape NOVO com apenas { id, titulo, tipo,
// amostra, moduloNome } a partir dos materiais publicados. Mesmo que o
// caller passe objetos "gordos" (com conteudo_html/arquivo_key), o output
// só contém os campos seguros — a página ainda seleciona APENAS esses
// campos no Prisma (defesa em profundidade: select restrito + shape novo).
//
// C10 (SPEC-conteudo §4/:106): curso sem nenhum material publicado não tem
// página pública. `condicaoCursoVisivel` devolve null nesse caso (página →
// notFound()). Courses NÃO tem status próprio (decisão D-S2-2/todo 2: a
// visibilidade é material-driven) — "rascunho" de curso = zero materiais
// publicados.
import type { MaterialTipo } from "@/generated/prisma/client";

/** Campos públicos de um curso para a sales page (todos do model courses). */
export interface CursoSales {
  slug: string;
  nome: string;
  descricao: string | null;
  imagem_url: string | null;
  incluido_assinatura: boolean;
}

/** Material como entra na grade — os únicos campos buscados no Prisma. */
export interface MaterialGrade {
  id: string;
  titulo: string;
  tipo: MaterialTipo;
  amostra: boolean;
}

/** Módulo (nome + materiais publicados) como entra na grade. Campo `materials`
 * espelha a relação Prisma — a página repassa o include sem mapear. */
export interface ModuloGrade {
  id: string;
  nome: string;
  materials: MaterialGrade[];
}

/** Item da grade pública (C9) — shape NOVO, sem nenhum campo de conteúdo. */
export interface ItemGradeCurso {
  id: string;
  titulo: string;
  tipo: MaterialTipo;
  amostra: boolean;
  moduloNome: string;
}

export interface ModuloGradeCurso {
  id: string;
  nome: string;
  materiais: ItemGradeCurso[];
}

/**
 * Monta a grade resumida do curso (C9): módulos com títulos e TIPOS dos
 * materiais publicados — nunca conteúdo (R12). O `id` entra no shape (não é
 * conteúdo) porque a amostra (R4) precisa do link para a página do material.
 *
 * Entrada: módulos com seus materiais PUBLICADOS apenas (filtro feito na
 * query da página). Saída: objetos novos com só os campos seguros.
 */
export function montarGradeCurso(modulos: ModuloGrade[]): ModuloGradeCurso[] {
  return modulos.map((modulo) => ({
    id: modulo.id,
    nome: modulo.nome,
    materiais: modulo.materials.map((material) => ({
      id: material.id,
      titulo: material.titulo,
      tipo: material.tipo,
      amostra: material.amostra,
      moduloNome: modulo.nome,
    })),
  }));
}

/**
 * C10 — curso publicamente visível? Devolve o curso quando ele tem ≥1
 * material publicado; null caso contrário (a página responde 404).
 *
 * "Rascunho de curso" não existe como status próprio (decisão do todo 2:
 * visibilidade é material-driven) — zero publicados É o curso rascunho.
 */
export function condicaoCursoVisivel(
  curso: CursoSales,
  totalPublicados: number,
): CursoSales | null {
  return totalPublicados >= 1 ? curso : null;
}

/**
 * Formata centavos como preço pt-BR (R$ 99,90 / R$ 1.234,56). Determinística
 * (sem depender do spacing de moeda do ICU): grupo de milhares com ponto e
 * centavos sempre com 2 dígitos. Valores negativos/fracionados são truncados.
 */
export function formatarPreco(cents: number): string {
  const absoluto = Math.abs(Math.trunc(cents));
  const reais = Math.floor(absoluto / 100);
  const centavos = absoluto % 100;
  const reaisFormatados = new Intl.NumberFormat("pt-BR").format(reais);
  return `R$ ${reaisFormatados},${String(centavos).padStart(2, "0")}`;
}

export interface ParamsBadgePreco {
  incluido_assinatura: boolean;
  produto_venda_unica_ativo: boolean;
  /**
   * Preço da venda única — o schema do S1 NÃO tem campo de preço para
   * `products.tipo = venda_unica` (só preco_mensal_cents/preco_anual_cents,
   * de assinatura — modelo-de-dados.md:147-151). O campo chega no S6
   * (SPEC-pagamentos). Em S2 sempre null → a página mostra o CTA "Comprar"
   * sem preço (decisão 2026-08-15, notepad).
   */
  preco_venda_unica_cents: number | null;
}

/**
 * Badge de preço da sales page (US-44): preço da venda única quando o
 * produto ativo existir e tiver preço; senão "Incluído na assinatura" quando
 * o curso fizer parte da assinatura; senão nada.
 */
export function obterBadgePreco(params: ParamsBadgePreco): string | null {
  if (
    params.produto_venda_unica_ativo &&
    params.preco_venda_unica_cents !== null
  ) {
    return formatarPreco(params.preco_venda_unica_cents);
  }
  if (params.incluido_assinatura) return "Incluído na assinatura";
  return null;
}
