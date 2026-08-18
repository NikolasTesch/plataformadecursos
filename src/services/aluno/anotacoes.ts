// Regras de negócio das anotações do aluno (US-15): toda consulta é limitada
// ao dono informado e o limite é validado antes de chegar ao Prisma.
import { db as dbPadrao } from "@/lib/db";
import { podeAcessarMaterial, type EntitlementGating } from "@/services/gating";

export const LIMITE_CONTEUDO_NOTA = 10_000;

export type Nota = {
  id: string;
  user_id: string;
  material_id: string;
  conteudo: string;
  criado_em: Date;
  atualizado_em: Date;
};

export interface DbAnotacoes {
  materials: {
    findUnique(args: { where: { id: string } }): Promise<MaterialAnotacao | null>;
  };
  modules: {
    findUnique(args: { where: { id: string } }): Promise<ModuloAnotacao | null>;
  };
  courses: {
    findUnique(args: { where: { id: string } }): Promise<CursoAnotacao | null>;
  };
  entitlements: {
    findMany(args: { where: { user_id: string }; include: { product: boolean } }): Promise<Array<EntitlementGating & { product: NonNullable<EntitlementGating["product"]> }>>;
  };
  notes: {
    create(args: { data: { user_id: string; material_id: string; conteudo: string } }): Promise<Nota>;
    updateMany(args: { where: { id: string; user_id: string }; data: { conteudo: string } }): Promise<{ count: number }>;
    deleteMany(args: { where: { id: string; user_id: string } }): Promise<{ count: number }>;
    findMany(args: { where: Record<string, unknown>; orderBy: { atualizado_em: "desc" } }): Promise<Nota[]>;
  };
}

export class ErroAnotacao extends Error {
  constructor(public readonly code: "conteudo_invalido" | "limite_excedido" | "material_nao_encontrado" | "acesso_negado") {
    super(code);
    this.name = "ErroAnotacao";
  }
}

const db = dbPadrao as unknown as DbAnotacoes;

function validar(userId: string, conteudo: string): void {
  if (!userId || typeof conteudo !== "string" || conteudo.trim() === "") {
    throw new ErroAnotacao("conteudo_invalido");
  }
  if (conteudo.length > LIMITE_CONTEUDO_NOTA) {
    throw new ErroAnotacao("limite_excedido");
  }
}

type MaterialAnotacao = {
  id: string;
  module_id: string;
  status: "rascunho" | "publicado";
  amostra: boolean;
  video_status?: "processando" | "pronto" | "erro" | null;
};
type ModuloAnotacao = { id: string; course_id: string };
type CursoAnotacao = { id: string; incluido_assinatura: boolean };

async function validarAcessoMaterial(userId: string, materialId: string, banco: DbAnotacoes): Promise<void> {
  const material = await banco.materials.findUnique({ where: { id: materialId } });
  if (!material) throw new ErroAnotacao("material_nao_encontrado");
  const modulo = await banco.modules.findUnique({ where: { id: material.module_id } });
  if (!modulo) throw new ErroAnotacao("material_nao_encontrado");
  const curso = await banco.courses.findUnique({ where: { id: modulo.course_id } });
  if (!curso) throw new ErroAnotacao("material_nao_encontrado");
  const entitlements = await banco.entitlements.findMany({ where: { user_id: userId }, include: { product: true } });
  if (!podeAcessarMaterial({ userId, material, curso, entitlements }).permitido) {
    throw new ErroAnotacao("acesso_negado");
  }
}

export async function criar(
  userId: string,
  materialId: string,
  conteudo: string,
  banco: DbAnotacoes = db,
): Promise<Nota> {
  validar(userId, conteudo);
  if (!materialId) throw new ErroAnotacao("conteudo_invalido");
  await validarAcessoMaterial(userId, materialId, banco);
  return banco.notes.create({ data: { user_id: userId, material_id: materialId, conteudo } });
}

export async function atualizar(
  userId: string,
  notaId: string,
  conteudo: string,
  banco: DbAnotacoes = db,
): Promise<Nota> {
  validar(userId, conteudo);
  if (!notaId) throw new ErroAnotacao("conteudo_invalido");
  const notasExistentes = await banco.notes.findMany({ where: { id: notaId, user_id: userId }, orderBy: { atualizado_em: "desc" } });
  const nota = notasExistentes[0];
  if (!nota) throw new ErroAnotacao("conteudo_invalido");
  await validarAcessoMaterial(userId, nota.material_id, banco);
  const resultado = await banco.notes.updateMany({ where: { id: notaId, user_id: userId }, data: { conteudo } });
  if (resultado.count === 0) throw new ErroAnotacao("conteudo_invalido");
  const notas = await banco.notes.findMany({ where: { id: notaId, user_id: userId }, orderBy: { atualizado_em: "desc" } });
  return notas[0];
}

export async function excluir(userId: string, notaId: string, banco: DbAnotacoes = db): Promise<void> {
  if (!userId || !notaId) throw new ErroAnotacao("conteudo_invalido");
  await banco.notes.deleteMany({ where: { id: notaId, user_id: userId } });
}

export async function listarPorMaterial(userId: string, materialId: string, banco: DbAnotacoes = db): Promise<Nota[]> {
  if (!userId || !materialId) return [];
  return banco.notes.findMany({ where: { user_id: userId, material_id: materialId }, orderBy: { atualizado_em: "desc" } });
}

export async function listarMateriaisComNota(userId: string, banco: DbAnotacoes = db): Promise<Nota[]> {
  if (!userId) return [];
  return banco.notes.findMany({ where: { user_id: userId }, orderBy: { atualizado_em: "desc" } });
}

export async function buscarPorTexto(userId: string, texto: string, banco: DbAnotacoes = db): Promise<Nota[]> {
  if (!userId || !texto.trim()) return listarMateriaisComNota(userId, banco);
  return banco.notes.findMany({
    where: { user_id: userId, conteudo: { contains: texto.trim(), mode: "insensitive" } },
    orderBy: { atualizado_em: "desc" },
  });
}
