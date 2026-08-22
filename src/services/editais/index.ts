// Serviço de editais — administração MANUAL (US-25 / SPEC-trilhas §3.1).
//
// Escopo S7.1: criação/edição de edital e disciplinas (com peso), publicação,
// e vinculação de materiais a disciplinas. NÃO inclui scraping, seguir concurso
// ou alertas (S7.2 / SPEC-editais). O versionamento (T3 / D-T1) é implementado
// aqui: alterações que afetam o plano em um edital já PUBLICADO incrementam
// `editals.versao` (republicar cria nova versão); alunos que ativaram antes
// conservam `user_trilhas.versao_ativacao` (congela na ativação — S7.1).
//
// RBAC (admin) é responsabilidade do futuro chamador (rota/Server Action); este
// serviço valida invariantes de dados e regras de domínio (ex.: peso ≥ 1,
// disciplina única por edital, material 0..1 disciplina por edital — T1).
//
// Dependência de banco INJETÁVEL: produção chama sem `deps` (singleton
// @/lib/db, via cast conforme padrão D29 de src/services/auth); testes injetam
// fake tipado via `deps.db`.
import { db as dbPadrao } from "@/lib/db";
import type {
  editals,
  edital_disciplines,
  material_edital,
  materials,
  EditalStatus,
} from "@/generated/prisma/client";

import { ErroEdital, erroValidacaoEdital } from "./erros";

export interface DbEditais {
  editals: {
    findUnique(args: { where: { id: string } }): Promise<editals | null>;
    findMany(args: {
      where?: { status?: EditalStatus };
      orderBy?: { publicada_em?: "desc" | "asc" };
    }): Promise<editals[]>;
    create(args: {
      data: {
        nome: string;
        banca: string;
        data_prova: Date | null;
        status: EditalStatus;
        versao: number;
        publicada_em: Date | null;
      };
    }): Promise<editals>;
    update(args: {
      where: { id: string };
      data: {
        nome?: string;
        banca?: string;
        data_prova?: Date | null;
        status?: EditalStatus;
        publicada_em?: Date | null;
        versao?: number | { increment: number };
      };
    }): Promise<editals>;
  };
  edital_disciplines: {
    findUnique(args: { where: { id: string } }): Promise<edital_disciplines | null>;
    findMany(args: {
      where: { edital_id: string };
      orderBy?: { peso: "desc" };
    }): Promise<edital_disciplines[]>;
    create(args: {
      data: { edital_id: string; nome: string; peso: number };
    }): Promise<edital_disciplines>;
    update(args: {
      where: { id: string };
      data: { nome?: string; peso?: number };
    }): Promise<edital_disciplines>;
    delete(args: { where: { id: string } }): Promise<edital_disciplines>;
    count(args: { where: { edital_id: string; nome: string } }): Promise<number>;
  };
  material_edital: {
    findUnique(args: {
      where: { material_id_edital_id: { material_id: string; edital_id: string } };
    }): Promise<material_edital | null>;
    findMany(args: { where: { edital_id: string } }): Promise<material_edital[]>;
    create(args: {
      data: { material_id: string; edital_id: string; disciplina_id: string | null };
    }): Promise<material_edital>;
    delete(args: {
      where: { material_id_edital_id: { material_id: string; edital_id: string } };
    }): Promise<material_edital>;
  };
  materials: {
    findUnique(args: { where: { id: string } }): Promise<materials | null>;
  };
}

export interface DepsEditais {
  db?: DbEditais;
}

export interface DadosCriarEdital {
  nome: string;
  banca: string;
  data_prova?: Date | null;
  status?: EditalStatus;
}

export interface DadosAtualizarEdital {
  nome?: string;
  banca?: string;
  data_prova?: Date | null;
}

export interface DadosDisciplina {
  nome: string;
  peso: number;
}

const MAX_NOME = 200;
const MAX_BANCA = 100;

function validarNome(nome: unknown, campo: string): string {
  const limpo = typeof nome === "string" ? nome.trim() : "";
  if (limpo === "") throw erroValidacaoEdital(campo, "informe o nome do edital");
  if (limpo.length > MAX_NOME) {
    throw erroValidacaoEdital(campo, `o nome deve ter no máximo ${MAX_NOME} caracteres`);
  }
  return limpo;
}

function validarBanca(banca: unknown): string {
  const limpo = typeof banca === "string" ? banca.trim() : "";
  if (limpo === "") throw erroValidacaoEdital("banca", "informe a banca do edital");
  if (limpo.length > MAX_BANCA) {
    throw erroValidacaoEdital("banca", `a banca deve ter no máximo ${MAX_BANCA} caracteres`);
  }
  return limpo;
}

function validarPeso(peso: unknown): number {
  if (typeof peso !== "number" || !Number.isInteger(peso) || peso < 1) {
    throw erroValidacaoEdital("peso", "o peso da disciplina deve ser um inteiro ≥ 1");
  }
  return peso;
}

function validarDataProva(data: unknown): Date | null {
  if (data === undefined || data === null) return null;
  if (!(data instanceof Date) || Number.isNaN(data.getTime())) {
    throw erroValidacaoEdital("data_prova", "data da prova inválida");
  }
  return data;
}

function erroEditalNaoEncontrado(): ErroEdital {
  return new ErroEdital({ code: "nao_encontrado", mensagem: "edital não encontrado" });
}

function erroDisciplinaNaoEncontrada(): ErroEdital {
  return new ErroEdital({ code: "nao_encontrado", mensagem: "disciplina não encontrada" });
}

/**
 * Incrementa `versao` UMA única vez quando o edital já está publicado
 * (republicar — D-T1). Usa `increment: 1` atômico do Prisma para evitar
 * perda de incremento sob concorrência (menor isolamento que o Prisma suporta).
 */
async function republicarSePublicado(
  db: DbEditais,
  edital: editals,
): Promise<void> {
  if (edital.status === "publicado") {
    await db.editals.update({
      where: { id: edital.id },
      data: { versao: { increment: 1 } },
    });
  }
}

export async function criarEdital(
  dados: DadosCriarEdital,
  deps: DepsEditais = {},
): Promise<editals> {
  const db: DbEditais = deps.db ?? (dbPadrao as unknown as DbEditais);
  const nome = validarNome(dados.nome, "nome");
  const banca = validarBanca(dados.banca);
  const data_prova = validarDataProva(dados.data_prova);
  const status = dados.status ?? "rascunho";
  return db.editals.create({
    data: {
      nome,
      banca,
      data_prova,
      status,
      versao: 1,
      publicada_em: null,
    },
  });
}

export async function atualizarEdital(
  id: string,
  dados: DadosAtualizarEdital,
  deps: DepsEditais = {},
): Promise<editals> {
  const db: DbEditais = deps.db ?? (dbPadrao as unknown as DbEditais);
  const edital = await db.editals.findUnique({ where: { id } });
  if (!edital) throw erroEditalNaoEncontrado();

  const nome = dados.nome !== undefined ? validarNome(dados.nome, "nome") : undefined;
  const banca = dados.banca !== undefined ? validarBanca(dados.banca) : undefined;
  const data_prova =
    dados.data_prova !== undefined ? validarDataProva(dados.data_prova) : undefined;

  if (nome === undefined && banca === undefined && data_prova === undefined) {
    return edital; // no-op
  }
  return db.editals.update({
    where: { id },
    data: { ...(nome !== undefined ? { nome } : {}), ...(banca !== undefined ? { banca } : {}), ...(data_prova !== undefined ? { data_prova } : {}) },
  });
}

export async function publicarEdital(
  id: string,
  deps: DepsEditais = {},
): Promise<editals> {
  const db: DbEditais = deps.db ?? (dbPadrao as unknown as DbEditais);
  const edital = await db.editals.findUnique({ where: { id } });
  if (!edital) throw erroEditalNaoEncontrado();
  if (edital.status === "publicado") return edital; // já publicado → no-op idempotente
  return db.editals.update({
    where: { id },
    data: { status: "publicado", publicada_em: new Date() },
  });
}

export async function despublicarEdital(
  id: string,
  deps: DepsEditais = {},
): Promise<editals> {
  const db: DbEditais = deps.db ?? (dbPadrao as unknown as DbEditais);
  const edital = await db.editals.findUnique({ where: { id } });
  if (!edital) throw erroEditalNaoEncontrado();
  if (edital.status === "rascunho") return edital; // já rascunho → no-op
  // publicada_em é MANTIDO (histórico de publicações anteriores).
  return db.editals.update({ where: { id }, data: { status: "rascunho" } });
}

export async function obterEdital(
  id: string,
  deps: DepsEditais = {},
): Promise<editals | null> {
  const db: DbEditais = deps.db ?? (dbPadrao as unknown as DbEditais);
  return db.editals.findUnique({ where: { id } });
}

/** Listagem do admin: todos os status, ordenada pela publicação mais recente. */
export async function listarEditais(
  deps: DepsEditais = {},
): Promise<editals[]> {
  const db: DbEditais = deps.db ?? (dbPadrao as unknown as DbEditais);
  return db.editals.findMany({ orderBy: { publicada_em: "desc" } });
}

/** Listagem do aluno (trilhas): somente editais publicados. */
export async function listarEditaisPublicados(
  deps: DepsEditais = {},
): Promise<editals[]> {
  const db: DbEditais = deps.db ?? (dbPadrao as unknown as DbEditais);
  return db.editals.findMany({
    where: { status: "publicado" },
    orderBy: { publicada_em: "desc" },
  });
}

export async function adicionarDisciplina(
  editalId: string,
  dados: DadosDisciplina,
  deps: DepsEditais = {},
): Promise<edital_disciplines> {
  const db: DbEditais = deps.db ?? (dbPadrao as unknown as DbEditais);
  const edital = await db.editals.findUnique({ where: { id: editalId } });
  if (!edital) throw erroEditalNaoEncontrado();
  const nome = validarNome(dados.nome, "nome");
  const peso = validarPeso(dados.peso);

  const existentes = await db.edital_disciplines.count({
    where: { edital_id: editalId, nome },
  });
  if (existentes > 0) {
    throw new ErroEdital({
      code: "regra_negocio",
      campo: "nome",
      mensagem: "já existe uma disciplina com este nome neste edital",
    });
  }

  const criada = await db.edital_disciplines.create({
    data: { edital_id: editalId, nome, peso },
  });
  // Alteração de plano em edital publicado → nova versão (D-T1).
  await republicarSePublicado(db, edital);
  return criada;
}

export async function atualizarDisciplina(
  disciplinaId: string,
  dados: Partial<DadosDisciplina>,
  deps: DepsEditais = {},
): Promise<edital_disciplines> {
  const db: DbEditais = deps.db ?? (dbPadrao as unknown as DbEditais);
  const disciplina = await db.edital_disciplines.findUnique({ where: { id: disciplinaId } });
  if (!disciplina) throw erroDisciplinaNaoEncontrada();

  const nome = dados.nome !== undefined ? validarNome(dados.nome, "nome") : undefined;
  const peso = dados.peso !== undefined ? validarPeso(dados.peso) : undefined;

  if (nome === undefined && peso === undefined) return disciplina; // no-op

  if (nome !== undefined && nome !== disciplina.nome) {
    const conflito = await db.edital_disciplines.count({
      where: { edital_id: disciplina.edital_id, nome },
    });
    if (conflito > 0) {
      throw new ErroEdital({
        code: "regra_negocio",
        campo: "nome",
        mensagem: "já existe uma disciplina com este nome neste edital",
      });
    }
  }

  const atualizada = await db.edital_disciplines.update({
    where: { id: disciplinaId },
    data: { ...(nome !== undefined ? { nome } : {}), ...(peso !== undefined ? { peso } : {}) },
  });
  // Alteração de plano em edital publicado → nova versão (D-T1).
  const edital = await db.editals.findUnique({ where: { id: disciplina.edital_id } });
  if (edital) await republicarSePublicado(db, edital);
  return atualizada;
}

export async function removerDisciplina(
  disciplinaId: string,
  deps: DepsEditais = {},
): Promise<void> {
  const db: DbEditais = deps.db ?? (dbPadrao as unknown as DbEditais);
  const disciplina = await db.edital_disciplines.findUnique({ where: { id: disciplinaId } });
  if (!disciplina) throw erroDisciplinaNaoEncontrada();
  await db.edital_disciplines.delete({ where: { id: disciplinaId } });
  const edital = await db.editals.findUnique({ where: { id: disciplina.edital_id } });
  if (edital) await republicarSePublicado(db, edital);
}

export async function listarDisciplinas(
  editalId: string,
  deps: DepsEditais = {},
): Promise<edital_disciplines[]> {
  const db: DbEditais = deps.db ?? (dbPadrao as unknown as DbEditais);
  return db.edital_disciplines.findMany({
    where: { edital_id: editalId },
    orderBy: { peso: "desc" },
  });
}

/**
 * Vincula um material a 0..1 disciplina do edital (T1). `disciplina_id: null`
 * desvincula da disciplina mantendo o material no edital (0 disciplinas).
 * O material deve existir; se `disciplina_id` informado, deve pertencer ao edital.
 */
export async function vincularMaterial(
  editalId: string,
  materialId: string,
  disciplinaId: string | null,
  deps: DepsEditais = {},
): Promise<material_edital> {
  const db: DbEditais = deps.db ?? (dbPadrao as unknown as DbEditais);
  const edital = await db.editals.findUnique({ where: { id: editalId } });
  if (!edital) throw erroEditalNaoEncontrado();

  const material = await db.materials.findUnique({ where: { id: materialId } });
  if (!material) {
    throw new ErroEdital({ code: "nao_encontrado", campo: "material_id", mensagem: "material não encontrado" });
  }
  if (disciplinaId !== null) {
    const disciplina = await db.edital_disciplines.findUnique({ where: { id: disciplinaId } });
    if (!disciplina || disciplina.edital_id !== editalId) {
      throw new ErroEdital({
        code: "regra_negocio",
        campo: "disciplina_id",
        mensagem: "a disciplina não pertence a este edital",
      });
    }
  }

  const vinculo = await db.material_edital.create({
    data: { material_id: materialId, edital_id: editalId, disciplina_id: disciplinaId },
  });
  await republicarSePublicado(db, edital);
  return vinculo;
}

export async function desvincularMaterial(
  editalId: string,
  materialId: string,
  deps: DepsEditais = {},
): Promise<void> {
  const db: DbEditais = deps.db ?? (dbPadrao as unknown as DbEditais);
  const edital = await db.editals.findUnique({ where: { id: editalId } });
  if (!edital) throw erroEditalNaoEncontrado();
  await db.material_edital.delete({
    where: { material_id_edital_id: { material_id: materialId, edital_id: editalId } },
  });
  await republicarSePublicado(db, edital);
}

export async function listarMateriaisEdital(
  editalId: string,
  deps: DepsEditais = {},
): Promise<material_edital[]> {
  const db: DbEditais = deps.db ?? (dbPadrao as unknown as DbEditais);
  return db.material_edital.findMany({ where: { edital_id: editalId } });
}
