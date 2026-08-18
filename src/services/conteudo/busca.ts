// Serviço de busca — US-21 (SPEC-conteudo §3.7, linhas 77-81).
//
// `buscar({ q, tipo?, cursoId?, userId })` procura materiais por termo em
// `titulo` (ILIKE) OU `conteudo_busca` (texto puro lowercased de texto/resumo e
// de PDF extraído — S2-1/todo 11; o índice GIN trigram do S2-1 acelera o
// ILIKE '%q%' no Postgres). Filtros opcionais: `tipo` (MaterialTipo) e
// `cursoId` (via módulo → course_id).
//
// DECISÃO de implementação (2026-08-15, notepad s2-conteudo/decisions.md):
// o gating R1-R4 NÃO é re-aplicável por linha de forma barata com mocks
// (podeAcessarMaterial é puro e barato em memória, mas a consulta de
// entitlements por material seria N+1). Em vez disso: a consulta traz TODOS os
// materiais publicados candidatos (R5 — rascunho nunca entra) com o curso
// incluído, os entitlements ativos do usuário vêm em UMA segunda consulta, e o
// gating é aplicado POR LINHA em JS com a MESMA função `podeAcessarMaterial`
// (fonte única de verdade). Resultado: apenas materiais acessíveis — bloqueados
// e rascunhos NUNCA vazam nos resultados (R1-R4/R5). Suficiente para a escala
// de dev; o motor R1-R12 do S3 pode otimizar.
//
// Relevância (SPEC §3.7/:80): match no título vem PRIMEIRO; dentro do grupo, a
// ordem do SQL (ordem asc) é mantida — `Array.prototype.sort` é estável no V8.
// Vídeo/questoes entram por título (conteudo_busca NULL — sem corpo indexado).
//
// Dependência de banco INJETÁVEL: produção chama sem `deps` (singleton
// @/lib/db); testes injetam fake tipado via `deps.db` (padrão D29).
import { db as dbPadrao } from "@/lib/db";
import type {
  courses,
  entitlements,
  materials,
  MaterialTipo,
  modules,
  products,
} from "@/generated/prisma/client";
import {
  podeAcessarMaterial,
  type EntitlementGating,
  type MotivoGating,
} from "@/services/gating";

import { erroValidacao } from "./erros";

/** Material do banco com o curso (via módulo) — shape retornado pela busca. */
export type MaterialBuscaDb = materials & {
  modulo: modules & { course: courses };
};

/** Entitlement do banco com o produto incluído — shape retornado pela busca. */
export type EntitlementBuscaDb = entitlements & { product: products };

/**
 * Resultado de UM material acessível. `motivoAcesso` vem do gating e NUNCA é
 * 'bloqueado' — apenas materiais permitidos entram nos resultados.
 */
export interface MaterialResultado {
  id: string;
  titulo: string;
  tipo: MaterialTipo;
  /** Slug do curso (navegação para /cursos/[slug]); opcional no shape. */
  slugCurso?: string;
  /** Nome do módulo do material (agrupamento na UI); opcional no shape. */
  moduloNome?: string;
  amostra: boolean;
  /** Motivo do gating: 'amostra' | 'assinatura' | 'venda_unica'. */
  motivoAcesso: MotivoGating;
}

export interface ResultadoBusca {
  resultados: MaterialResultado[];
  total: number;
}

export interface ParamsBuscar {
  /** Termo de busca (obrigatório; trimmed + lowercase antes do ILIKE). */
  q: string;
  /** Filtro opcional por tipo de material. */
  tipo?: MaterialTipo;
  /** Filtro opcional por curso (via módulo → course_id). */
  cursoId?: string;
  /** Usuário para o gating (entitlements ativos do usuário). */
  userId: string;
  usuario?: { id: string; bloqueado: boolean };
}

export interface DepsBusca {
  db?: DbBusca;
}

export interface DbBusca {
  users?: {
    findUnique: (args: { where: { id: string }; select: { id: true; bloqueado: true } }) => Promise<{ id: string; bloqueado: boolean } | null>;
  };
  materials: {
    findMany: (args: {
      where: {
        status: "publicado";
        OR: (
          | { titulo: { contains: string; mode: "insensitive" } }
          | { conteudo_busca: { contains: string; mode: "insensitive" } }
        )[];
        tipo?: MaterialTipo;
        modulo?: { course_id: string };
      };
      include: { modulo: { include: { course: true } } };
      orderBy: { ordem: "asc" };
    }) => Promise<MaterialBuscaDb[]>;
  };
  entitlements: {
    findMany: (args: {
      where: { user_id: string; product: { status: "ativo" } };
      include: { product: true };
    }) => Promise<EntitlementBuscaDb[]>;
  };
}

const TIPOS_MATERIAL: ReadonlySet<string> = new Set([
  "pdf",
  "texto",
  "video",
  "questoes",
  "resumo",
]);

/**
 * Valida e normaliza o termo de busca. DECISÃO (2026-08-15, notepad): q vazio →
 * erro de validação ("informe um termo de busca"), não lista vazia — o chamador
 * não deve sequer consultar o banco sem termo. Lowercase é redundante com o
 * ILIKE (case-insensitive) mas mantém consistência com o sort de relevância e
 * com `conteudo_busca` (que já é gravado lowercased).
 */
function validarTermo(q: unknown): string {
  const limpo = typeof q === "string" ? q.trim().toLowerCase() : "";
  if (limpo === "") {
    throw erroValidacao("q", "informe um termo de busca");
  }
  return limpo;
}

function validarTipo(tipo: unknown): MaterialTipo | undefined {
  if (tipo === undefined) return undefined;
  if (typeof tipo !== "string" || !TIPOS_MATERIAL.has(tipo)) {
    throw erroValidacao(
      "tipo",
      "informe um tipo válido de material (pdf, texto, video, questoes ou resumo)",
    );
  }
  return tipo as MaterialTipo;
}

function validarCursoId(cursoId: unknown): string | undefined {
  if (cursoId === undefined) return undefined;
  const limpo = typeof cursoId === "string" ? cursoId.trim() : "";
  return limpo === "" ? undefined : limpo;
}

/**
 * Monta o shape mínimo do gating a partir do entitlement do banco, filtrando
 * APENAS produtos ativos (D-G3 — checagem de produto ativo é do caller no
 * subset R1-R4; o motor completo do S3 incorpora a regra). O where da consulta
 * já filtra `product.status === 'ativo'`; o filtro aqui é o backstop em memória.
 */
function montarEntitlements(
  entitulamentos: EntitlementBuscaDb[],
): EntitlementGating[] {
  return entitulamentos
    .filter((e) => e.product.status === "ativo")
    .map((e) => ({
      id: e.id,
      origem: e.origem,
      acesso_ate: e.acesso_ate,
      product_id: e.product_id,
      product: { tipo: e.product.tipo, curso_id: e.product.curso_id },
    }));
}

/**
 * Busca materiais por termo (US-21) com gating R1-R4 aplicado aos resultados.
 *
 * Gating na consulta (sem vazamento): o WHERE já restringe a `publicado` (R5);
 * depois, cada linha passa por `podeAcessarMaterial` (amostra/assinatura/
 * venda_unica) — blocados e rascunhos somem antes do resultado.
 */
export async function buscar(
  params: ParamsBuscar,
  deps: DepsBusca = {},
): Promise<ResultadoBusca> {
  // Anotação com a interface estreita: o PrismaClient real a satisfaz
  // estruturalmente (mesma nota da decisão D29).
  const db: DbBusca = deps.db ?? dbPadrao;

  // 1. Validações puras (antes de tocar no banco).
  const q = validarTermo(params.q);
  const tipo = validarTipo(params.tipo);
  const cursoId = validarCursoId(params.cursoId);

  // 2. Consulta paralela: candidatos publicados + entitlements ativos do usuário.
  const [materiais, entitulamentos, usuarioDb] = await Promise.all([
    db.materials.findMany({
      where: {
        status: "publicado",
        OR: [
          { titulo: { contains: q, mode: "insensitive" } },
          { conteudo_busca: { contains: q, mode: "insensitive" } },
        ],
        ...(tipo !== undefined ? { tipo } : {}),
        ...(cursoId !== undefined ? { modulo: { course_id: cursoId } } : {}),
      },
      include: { modulo: { include: { course: true } } },
      orderBy: { ordem: "asc" },
    }),
    db.entitlements.findMany({
      where: { user_id: params.userId, product: { status: "ativo" } },
      include: { product: true },
    }),
    params.usuario === undefined && db.users
      ? db.users.findUnique({ where: { id: params.userId }, select: { id: true, bloqueado: true } })
      : Promise.resolve(undefined),
  ]);

  const entitlements = montarEntitlements(entitulamentos);
  const usuario = params.usuario ?? usuarioDb ?? undefined;

  // 3. Gating por linha com a MESMA função de leitura (fonte única de verdade).
  //    Só materiais permitidos viram resultado (R1-R4); `motivoAcesso` alimenta
  //    badges na UI (amostra/disponivel — SPEC-frontend).
  const acessiveis: MaterialResultado[] = [];
  for (const material of materiais) {
    const gating = podeAcessarMaterial({
      userId: params.userId,
      material: {
        id: material.id,
        status: material.status,
        amostra: material.amostra,
      },
      curso: {
        id: material.modulo.course.id,
        incluido_assinatura: material.modulo.course.incluido_assinatura,
      },
      entitlements,
      usuario,
    });
    if (gating.permitido) {
      acessiveis.push({
        id: material.id,
        titulo: material.titulo,
        tipo: material.tipo,
        slugCurso: material.modulo.course.slug,
        moduloNome: material.modulo.nome,
        amostra: material.amostra,
        motivoAcesso: gating.motivo,
      });
    }
  }

  // 4. Relevância (SPEC §3.7/:80): match no título primeiro. `q` já é lowercase;
  //    o SQL já ordenou por ordem asc — o sort estável preserva a ordem do banco
  //    DENTRO de cada grupo (título → conteúdo).
  acessiveis.sort((a, b) => {
    const rankA = a.titulo.toLowerCase().includes(q) ? 0 : 1;
    const rankB = b.titulo.toLowerCase().includes(q) ? 0 : 1;
    return rankA - rankB;
  });

  return { resultados: acessiveis, total: acessiveis.length };
}
