// Favoritas S4.4 (US-38/Q7): estado independente de attempts e do banco de erros.
import { db as dbPadrao } from "@/lib/db";
import { podeAcessarMaterial, type EntitlementGating } from "@/services/gating";

export type Favorite = { user_id: string; question_id: string; criado_em: Date };
type Question = { id: string; material_id: string };
type Material = { id: string; module_id: string; status: "rascunho" | "publicado"; amostra: boolean; tipo?: string; video_status?: "processando" | "pronto" | "erro" | null };
type Module = { id: string; course_id: string };
type Course = { id: string; incluido_assinatura: boolean };

export interface DbFavoritas {
  questions: { findUnique(args: { where: { id: string } }): Promise<Question | null> };
  materials: { findUnique(args: { where: { id: string } }): Promise<Material | null> };
  modules: { findUnique(args: { where: { id: string } }): Promise<Module | null> };
  courses: { findUnique(args: { where: { id: string } }): Promise<Course | null> };
  entitlements: { findMany(args: { where: { user_id: string }; include: { product: boolean } }): Promise<Array<EntitlementGating & { product: NonNullable<EntitlementGating["product"]> }>> };
  favorites: {
    upsert(args: { where: { user_id_question_id: { user_id: string; question_id: string } }; create: { user_id: string; question_id: string }; update: Record<string, never> }): Promise<Favorite>;
    deleteMany(args: { where: { user_id: string; question_id: string } }): Promise<{ count: number }>;
    findMany(args: { where: { user_id: string }; orderBy: { criado_em: "desc" } }): Promise<Favorite[]>;
  };
}

export interface DepsFavoritas { db?: DbFavoritas; agora?: Date }

export class ErroFavorita extends Error {
  constructor(public readonly code: "questao_nao_encontrada" | "material_nao_encontrado" | "acesso_negado") {
    super(code);
    this.name = "ErroFavorita";
  }
}

const db = dbPadrao as unknown as DbFavoritas;

async function validarAcesso(userId: string, questionId: string, banco: DbFavoritas, agora?: Date): Promise<Question> {
  const question = await banco.questions.findUnique({ where: { id: questionId } });
  if (!question) throw new ErroFavorita("questao_nao_encontrada");
  const material = await banco.materials.findUnique({ where: { id: question.material_id } });
  const modulo = material && await banco.modules.findUnique({ where: { id: material.module_id } });
  const curso = modulo && await banco.courses.findUnique({ where: { id: modulo.course_id } });
  if (!material || !modulo || !curso) throw new ErroFavorita("material_nao_encontrado");
  const entitlements = await banco.entitlements.findMany({ where: { user_id: userId }, include: { product: true } });
  if (!podeAcessarMaterial({ userId, material, curso, entitlements }, { agora }).permitido) throw new ErroFavorita("acesso_negado");
  return question;
}

export async function marcarFavorita(userId: string, questionId: string, deps: DepsFavoritas = {}): Promise<Favorite> {
  const banco = deps.db ?? db;
  await validarAcesso(userId, questionId, banco, deps.agora);
  return banco.favorites.upsert({
    where: { user_id_question_id: { user_id: userId, question_id: questionId } },
    create: { user_id: userId, question_id: questionId },
    update: {},
  });
}

export async function desmarcarFavorita(userId: string, questionId: string, deps: DepsFavoritas = {}): Promise<{ count: number }> {
  return (deps.db ?? db).favorites.deleteMany({ where: { user_id: userId, question_id: questionId } });
}

/** Lista somente favoritas pertencentes ao usuário; não consulta nem altera attempts/erros. */
export async function listarFavoritas(userId: string, deps: DepsFavoritas = {}): Promise<Favorite[]> {
  const banco = deps.db ?? db;
  const favoritas = await banco.favorites.findMany({ where: { user_id: userId }, orderBy: { criado_em: "desc" } });
  const acessiveis: Favorite[] = [];
  for (const favorita of favoritas) {
    try {
      await validarAcesso(userId, favorita.question_id, banco, deps.agora);
      acessiveis.push(favorita);
    } catch (erro) {
      if (!(erro instanceof ErroFavorita) || erro.code === "questao_nao_encontrada" || erro.code === "material_nao_encontrado") throw erro;
    }
  }
  return acessiveis;
}

export const marcar = marcarFavorita;
export const desmarcar = desmarcarFavorita;
