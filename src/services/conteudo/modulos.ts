// Serviço de módulos — US-04 (SPEC-conteudo §3.2).
//
// Regras:
//   1. criarModulo: nome obrigatório; `ordem` DEFAULT = max(ordem)+1 do curso
//      (1-based, alinhado ao seed que cria o módulo "Introdução" com ordem 1).
//      Duplicata (course_id, ordem) é impossível pelo @@unique do schema; em
//      corrida o banco responde P2002 → erro validacao amigável (P2003 =
//      curso inexistente também é traduzido).
//   2. atualizarModulo: RENAME-ONLY — ordem muda exclusivamente via
//      reordenarModulos. Nome ausente = no-op (retorna o módulo atual).
//   3. reordenarModulos: ATÔMICO via `$transaction`. Exige TODOS os módulos
//      do curso (lista completa, sem duplicados, sem ids estranhos) — por
//      construção as ordens finais são 1..n sem lacunas. Dentro da transação
//      a reordenação é feita em DUAS fases (fase 1: ordens temporárias
//      negativas únicas; fase 2: ordens finais) para NÃO violar o
//      @@unique([course_id, ordem]) durante swaps (ex.: [1,2] → [2,1]).
//   4. excluirModulo: a cascata de materiais é GARANTIDA pelo banco
//      (prisma/schema.prisma — materials.modulo onDelete: Cascade); o serviço
//      só apaga o módulo e documenta a dependência.
//   5. listarModulos: ordenado por ordem (asc).
//
// Dependência de banco INJETÁVEL: produção chama sem `deps` (usa o singleton
// @/lib/db); testes injetam um fake tipado via `deps.db` (padrão auth/login).
import { db as dbPadrao } from "@/lib/db";
import type { modules } from "@/generated/prisma/client";

import { ErroConteudo, erroValidacao } from "./erros";

// Mensagens canônicas do domínio de módulos — locais ao serviço; o erros.ts
// compartilhado (todo 2) define o shape, não as mensagens específicas.
const MENSAGENS_MODULOS = {
  nomeObrigatorio: "informe o nome do módulo",
  nomeMaximo: "o nome do módulo deve ter no máximo 120 caracteres",
  cursoObrigatorio: "informe o curso do módulo",
  ordemDuplicada: "já existe um módulo com esta ordem neste curso",
  cursoInexistente: "curso não encontrado",
  moduloInexistente: "módulo não encontrado",
  idsDuplicados: "a lista de reordenação não pode conter módulos duplicados",
  idForaDoCurso:
    "a lista de reordenação contém um módulo que não pertence a este curso",
  listaIncompleta:
    "a lista de reordenação deve conter todos os módulos do curso",
} as const;

export interface DbModulos {
  modules: {
    aggregate: (args: {
      where: { course_id: string };
      _max: { ordem: true };
    }) => Promise<{ _max: { ordem: number | null } }>;
    create: (args: {
      data: { course_id: string; nome: string; ordem: number };
    }) => Promise<modules>;
    findUnique: (args: { where: { id: string } }) => Promise<modules | null>;
    findMany: (args: {
      where: { course_id: string };
      orderBy?: { ordem: "asc" };
    }) => Promise<modules[]>;
    update: (args: {
      where: { id: string };
      data: { nome?: string; ordem?: number };
    }) => Promise<modules>;
    delete: (args: { where: { id: string } }) => Promise<modules>;
  };
  $transaction: (
    fn: (tx: DbModulosTx) => Promise<unknown>,
  ) => Promise<unknown>;
}

/** Visão mínima do db dentro da transação — só o delegate de módulos. */
export type DbModulosTx = Pick<DbModulos, "modules">;

export interface DadosCriarModulo {
  curso_id: string;
  nome: string;
}

export interface DadosAtualizarModulo {
  nome?: string;
}

export interface DepsModulos {
  db?: DbModulos;
}

/** Db do serviço: injetado nos testes ou o singleton de produção. */
function obterDb(deps: DepsModulos): DbModulos {
  // O PrismaClient real (dbPadrao) implementa estruturalmente o contrato
  // mínimo `DbModulos`; a atribuição direta é rejeitada pelo overload de
  // `$transaction` (formas array + interativa no client gerado). A asserção
  // documenta esse acoplamento no limite — sem `any`/`@ts-ignore`.
  return deps.db ?? (dbPadrao as unknown as DbModulos);
}

/** Extrai o `code` do erro Prisma (P2002/P2003) sem depender de `any`. */
function codigoDeErroPrisma(e: unknown): string | undefined {
  if (typeof e !== "object" || e === null) return undefined;
  const code = (e as { code?: unknown }).code;
  return typeof code === "string" ? code : undefined;
}

function validarNome(nome: unknown): string {
  const limpo = typeof nome === "string" ? nome.trim() : "";
  if (limpo.length < 1) {
    throw erroValidacao("nome", MENSAGENS_MODULOS.nomeObrigatorio);
  }
  if (limpo.length > 120) {
    throw erroValidacao("nome", MENSAGENS_MODULOS.nomeMaximo);
  }
  return limpo;
}

function validarCursoId(cursoId: unknown): string {
  const limpo = typeof cursoId === "string" ? cursoId.trim() : "";
  if (limpo.length < 1) {
    throw erroValidacao("curso_id", MENSAGENS_MODULOS.cursoObrigatorio);
  }
  return limpo;
}

export async function criarModulo(
  dados: DadosCriarModulo,
  deps: DepsModulos = {},
): Promise<modules> {
  const db = obterDb(deps);
  const nome = validarNome(dados.nome);
  const cursoId = validarCursoId(dados.curso_id);

  // Ordem default = último + 1 (1-based, alinhado ao seed: "Introdução" = 1).
  const maximo = await db.modules.aggregate({
    where: { course_id: cursoId },
    _max: { ordem: true },
  });
  const ordem = (maximo._max.ordem ?? 0) + 1;

  try {
    return await db.modules.create({
      data: { course_id: cursoId, nome, ordem },
    });
  } catch (e) {
    // Corrida: alguém criou a mesma (course_id, ordem) entre o aggregate e o
    // create — o @@unique([course_id, ordem]) rejeita com P2002.
    if (codigoDeErroPrisma(e) === "P2002") {
      throw erroValidacao("ordem", MENSAGENS_MODULOS.ordemDuplicada);
    }
    // Curso inexistente → FK violation (P2003) no create.
    if (codigoDeErroPrisma(e) === "P2003") {
      throw erroValidacao("curso_id", MENSAGENS_MODULOS.cursoInexistente);
    }
    throw e;
  }
}

export async function atualizarModulo(
  id: string,
  dados: DadosAtualizarModulo,
  deps: DepsModulos = {},
): Promise<modules> {
  const db = obterDb(deps);

  const existente = await db.modules.findUnique({ where: { id } });
  if (!existente) {
    throw new ErroConteudo({
      code: "nao_encontrado",
      mensagem: MENSAGENS_MODULOS.moduloInexistente,
    });
  }

  // Rename-only: nome ausente = no-op (ordem só muda via reorder).
  if (dados.nome === undefined) return existente;
  const nome = validarNome(dados.nome);

  return db.modules.update({ where: { id }, data: { nome } });
}

export async function reordenarModulos(
  curso_id: string,
  ordemIds: string[],
  deps: DepsModulos = {},
): Promise<void> {
  const db = obterDb(deps);

  // Validação ANTES da transação — falha sem tocar no banco (zero updates).
  const modulosDoCurso = await db.modules.findMany({
    where: { course_id: curso_id },
  });
  const idsDoCurso = new Set(modulosDoCurso.map((m) => m.id));

  const vistos = new Set<string>();
  for (const id of ordemIds) {
    if (vistos.has(id)) {
      throw erroValidacao("ordemIds", MENSAGENS_MODULOS.idsDuplicados);
    }
    vistos.add(id);
    if (!idsDoCurso.has(id)) {
      throw erroValidacao("ordemIds", MENSAGENS_MODULOS.idForaDoCurso);
    }
  }
  // A lista precisa ser EXATAMENTE o conjunto do curso (sem lacunas por
  // construção: cada posição recebe uma ordem única 1..n).
  if (ordemIds.length !== modulosDoCurso.length) {
    throw erroValidacao("ordemIds", MENSAGENS_MODULOS.listaIncompleta);
  }

  // A transação É a garantia de atomicidade (rollback total em falha).
  await db.$transaction(async (tx) => {
    // Fase 1: ordens temporárias NEGATIVAS únicas — libera os valores-alvo
    // sem colidir com o @@unique([course_id, ordem]) durante swaps.
    for (let i = 0; i < ordemIds.length; i++) {
      await tx.modules.update({
        where: { id: ordemIds[i] },
        data: { ordem: -(i + 1) },
      });
    }
    // Fase 2: ordens finais = posição na lista (index + 1).
    for (let i = 0; i < ordemIds.length; i++) {
      await tx.modules.update({
        where: { id: ordemIds[i] },
        data: { ordem: i + 1 },
      });
    }
  });
}

export async function excluirModulo(
  id: string,
  deps: DepsModulos = {},
): Promise<void> {
  const db = obterDb(deps);

  const existente = await db.modules.findUnique({ where: { id } });
  if (!existente) {
    throw new ErroConteudo({
      code: "nao_encontrado",
      mensagem: MENSAGENS_MODULOS.moduloInexistente,
    });
  }

  // Materiais do módulo são removidos EM CASCATA pelo banco (materials.modulo
  // onDelete: Cascade — prisma/schema.prisma). O serviço documenta a
  // dependência e apenas apaga o módulo.
  await db.modules.delete({ where: { id } });
}

export async function listarModulos(
  curso_id: string,
  deps: DepsModulos = {},
): Promise<modules[]> {
  const db = obterDb(deps);

  return db.modules.findMany({
    where: { course_id: curso_id },
    orderBy: { ordem: "asc" },
  });
}
