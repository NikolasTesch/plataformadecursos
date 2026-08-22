// Resposta de questões S4.2: autorização, tentativa cumulativa e feedback Q1/Q3.
import { db as dbPadrao } from "@/lib/db";
import { podeAcessarMaterial, type EntitlementGating } from "@/services/gating";
import { sanitizarHtml } from "@/lib/sanitize";
import type { questions } from "@/generated/prisma/client";

type Material = { id: string; module_id: string; status: "rascunho" | "publicado"; amostra: boolean; tipo?: string; video_status?: "processando" | "pronto" | "erro" | null };
type Modulo = { id: string; course_id: string };
type Curso = { id: string; incluido_assinatura: boolean };
export type Attempt = { id: string; user_id: string; question_id: string; alternativa_escolhida: string; acerto: boolean; criado_em: Date };

export interface DbResposta {
  questions: {
    findUnique(args: { where: { id: string } }): Promise<questions | null>;
    findMany(args: { where: { material_id: string } }): Promise<questions[]>;
  };
  materials: { findUnique(args: { where: { id: string } }): Promise<Material | null> };
  modules: { findUnique(args: { where: { id: string } }): Promise<Modulo | null> };
  courses: { findUnique(args: { where: { id: string } }): Promise<Curso | null> };
  entitlements: { findMany(args: { where: { user_id: string }; include: { product: boolean } }): Promise<Array<EntitlementGating & { product: NonNullable<EntitlementGating["product"]> }>> };
  attempts: {
    create(args: { data: { user_id: string; question_id: string; alternativa_escolhida: string; acerto: boolean } }): Promise<Attempt>;
    findMany(args: { where: { user_id: string; question_id: { in: string[] } } }): Promise<Attempt[]>;
  };
}
export interface DepsResposta { db?: DbResposta; agora?: Date }

export class ErroResposta extends Error {
  constructor(public readonly code: "questao_nao_encontrada" | "material_nao_encontrado" | "acesso_negado" | "alternativa_invalida") {
    super(code);
    this.name = "ErroResposta";
  }
}

const db = dbPadrao as unknown as DbResposta;
const LETRAS = ["A", "B", "C", "D", "E"] as const;

async function questaoComAcesso(userId: string, questionId: string, banco: DbResposta): Promise<questions> {
  const question = await banco.questions.findUnique({ where: { id: questionId } });
  if (!question) throw new ErroResposta("questao_nao_encontrada");
  const material = await banco.materials.findUnique({ where: { id: question.material_id } });
  if (!material) throw new ErroResposta("material_nao_encontrado");
  const modulo = await banco.modules.findUnique({ where: { id: material.module_id } });
  if (!modulo) throw new ErroResposta("material_nao_encontrado");
  const curso = await banco.courses.findUnique({ where: { id: modulo.course_id } });
  if (!curso) throw new ErroResposta("material_nao_encontrado");
  const entitlements = await banco.entitlements.findMany({ where: { user_id: userId }, include: { product: true } });
  if (!podeAcessarMaterial({ userId, material, curso, entitlements }).permitido) throw new ErroResposta("acesso_negado");
  return question;
}

function alternativasDaQuestao(question: questions): Array<{ letra: string; texto: string }> {
  return Array.isArray(question.alternativas) ? question.alternativas as Array<{ letra: string; texto: string }> : [];
}

/** Retorna a questão para renderização sem gabarito (Q1). */
export async function obterQuestao(userId: string, questionId: string, deps: DepsResposta = {}) {
  const question = await questaoComAcesso(userId, questionId, deps.db ?? db);
  return { id: question.id, material_id: question.material_id, enunciado: question.enunciado, alternativas: alternativasDaQuestao(question), ordem: question.ordem };
}

export async function calcularTaxaAcerto(userId: string, materialId: string, deps: DepsResposta = {}): Promise<{ acertos: number; total: number; taxa: number }> {
  const banco = deps.db ?? db;
  const material = await banco.materials.findUnique({ where: { id: materialId } });
  if (!material) throw new ErroResposta("material_nao_encontrado");
  const questionIds = (await banco.questions.findMany({ where: { material_id: materialId } })).map(({ id }) => id);
  const tentativas = questionIds.length === 0 ? [] : await banco.attempts.findMany({ where: { user_id: userId, question_id: { in: questionIds } } });
  const acertos = tentativas.filter(({ acerto }) => acerto).length;
  return { acertos, total: tentativas.length, taxa: tentativas.length === 0 ? 0 : acertos / tentativas.length };
}

export async function responder(userId: string, questionId: string, alternativa: string, deps: DepsResposta = {}) {
  const banco = deps.db ?? db;
  const question = await questaoComAcesso(userId, questionId, banco);
  const escolhida = typeof alternativa === "string" ? alternativa.trim().toUpperCase() : "";
  const opcoes = alternativasDaQuestao(question).map(({ letra }) => letra);
  if (!LETRAS.includes(escolhida as typeof LETRAS[number]) || !opcoes.includes(escolhida)) throw new ErroResposta("alternativa_invalida");
  const acerto = escolhida === question.gabarito;
  const tentativa = await banco.attempts.create({ data: { user_id: userId, question_id: questionId, alternativa_escolhida: escolhida, acerto } });
  const taxa = await calcularTaxaAcerto(userId, question.material_id, { db: banco, agora: deps.agora });
  return { correta: acerto, gabarito: question.gabarito, comentario_html: question.comentario_html ? sanitizarHtml(question.comentario_html) : null, tentativa, taxa };
}

export const responderQuestao = responder;
export const taxaAcerto = calcularTaxaAcerto;
