// S4.5: estudo imediato e prova ad-hoc, sem entidade simulados.
import { randomUUID } from "node:crypto";
import { db as dbPadrao } from "@/lib/db";
import { podeAcessarMaterial, type EntitlementGating } from "@/services/gating";
import { responder, type Attempt } from "./resposta";
import { sanitizarHtml } from "@/lib/sanitize";
import type { Prisma } from "@/generated/prisma/client";

type Question = { id: string; material_id: string; enunciado: string; alternativas: Prisma.JsonValue; gabarito: string; comentario_html: string | null; ordem: number };
type Material = { id: string; module_id: string; status: "rascunho" | "publicado"; amostra: boolean; tipo?: string; video_status?: "processando" | "pronto" | "erro" | null };
type Module = { id: string; course_id: string };
type Course = { id: string; incluido_assinatura: boolean };
type Entitlement = EntitlementGating & { product: NonNullable<EntitlementGating["product"]> };

export interface DbModo {
  questions: { findMany(args: { where: { material_id: string }; orderBy?: { ordem: "asc" } }): Promise<Question[]>; findUnique(args: { where: { id: string } }): Promise<Question | null> };
  materials: { findUnique(args: { where: { id: string } }): Promise<Material | null> };
  modules: { findUnique(args: { where: { id: string } }): Promise<Module | null> };
  courses: { findUnique(args: { where: { id: string } }): Promise<Course | null> };
  entitlements: { findMany(args: { where: { user_id: string }; include: { product: boolean } }): Promise<Entitlement[]> };
  attempts: {
    create(args: { data: { user_id: string; question_id: string; alternativa_escolhida: string; acerto: boolean } }): Promise<Attempt>;
    findMany(args: { where: { user_id: string; question_id: { in: string[] } } }): Promise<Attempt[]>;
  };
}
export interface DepsModo { db?: DbModo; agora?: Date }

export type QuestaoProva = { id: string; enunciado: string; alternativas: Array<{ letra: string; texto: string }>; ordem: number };
export type SessaoProva = { id: string; userId: string; blocoId: string; questoes: QuestaoProva[]; respostas: Record<string, string | null>; revisar: string[]; entregue: boolean };
export type ResultadoProva = { questao_id: string; resposta: string | null; correta: boolean; gabarito: string; comentario_html: string | null; tentativa: Attempt };

export class ErroModo extends Error {
  constructor(public readonly code: "bloco_nao_encontrado" | "acesso_negado" | "sessao_nao_encontrada" | "sessao_entregue" | "questao_fora_da_sessao" | "alternativa_invalida") { super(code); this.name = "ErroModo"; }
}

const db = dbPadrao as unknown as DbModo;
const sessoes = new Map<string, SessaoProva & { gabaritos: Map<string, Question> }>();
const letras = ["A", "B", "C", "D", "E"];

function visao(sessao: SessaoProva): SessaoProva {
  return { id: sessao.id, userId: sessao.userId, blocoId: sessao.blocoId, questoes: sessao.questoes, respostas: { ...sessao.respostas }, revisar: [...sessao.revisar], entregue: sessao.entregue };
}

function publico(question: Question): QuestaoProva {
  const alternativas = Array.isArray(question.alternativas) ? question.alternativas : [];
  return { id: question.id, enunciado: question.enunciado, alternativas: alternativas as Array<{ letra: string; texto: string }>, ordem: question.ordem };
}

async function validarBloco(userId: string, blocoId: string, banco: DbModo, agora?: Date): Promise<{ material: Material; questoes: Question[] }> {
  const material = await banco.materials.findUnique({ where: { id: blocoId } });
  if (!material || material.tipo !== "questoes") throw new ErroModo("bloco_nao_encontrado");
  const modulo = await banco.modules.findUnique({ where: { id: material.module_id } });
  const curso = modulo && await banco.courses.findUnique({ where: { id: modulo.course_id } });
  const entitlements = await banco.entitlements.findMany({ where: { user_id: userId }, include: { product: true } });
  if (!modulo || !curso || !podeAcessarMaterial({ userId, material, curso, entitlements }, { agora }).permitido) throw new ErroModo("acesso_negado");
  return { material, questoes: await banco.questions.findMany({ where: { material_id: blocoId }, orderBy: { ordem: "asc" } }) };
}

export async function iniciarSessaoProva(blocoId: string, userId: string, deps: DepsModo = {}): Promise<SessaoProva> {
  const banco = deps.db ?? db;
  const { questoes } = await validarBloco(userId, blocoId, banco, deps.agora);
  const sessao = { id: randomUUID(), userId, blocoId, questoes: questoes.map(publico), respostas: Object.fromEntries(questoes.map((q) => [q.id, null])), revisar: [], entregue: false, gabaritos: new Map(questoes.map((q) => [q.id, q])) };
  sessoes.set(sessao.id, sessao);
  return visao(sessao);
}

function obterSessao(id: string, userId: string): SessaoProva & { gabaritos: Map<string, Question> } {
  const sessao = sessoes.get(id);
  if (!sessao || sessao.userId !== userId) throw new ErroModo("sessao_nao_encontrada");
  if (sessao.entregue) throw new ErroModo("sessao_entregue");
  return sessao;
}

export function responderEmProva(sessionId: string, userId: string, questionId: string, alternativa: string): SessaoProva {
  const sessao = obterSessao(sessionId, userId);
  const question = sessao.gabaritos.get(questionId);
  const escolha = alternativa.trim().toUpperCase();
  if (!question) throw new ErroModo("questao_fora_da_sessao");
  const opcoes = (Array.isArray(question.alternativas) ? question.alternativas : []) as Array<{ letra: string }>;
  if (!letras.includes(escolha) || !opcoes.some((opcao) => opcao.letra === escolha)) throw new ErroModo("alternativa_invalida");
  sessao.respostas[questionId] = escolha;
  return visao(sessao);
}

export function marcarParaRevisao(sessionId: string, userId: string, questionId: string, revisar = true): SessaoProva {
  const sessao = obterSessao(sessionId, userId);
  if (!sessao.gabaritos.has(questionId)) throw new ErroModo("questao_fora_da_sessao");
  sessao.revisar = revisar ? [...new Set([...sessao.revisar, questionId])] : sessao.revisar.filter((id) => id !== questionId);
  return visao(sessao);
}

export async function entregarSessaoProva(sessionId: string, userId: string, deps: DepsModo = {}): Promise<{ resultados: ResultadoProva[]; acertos: number; total: number }> {
  const sessao = obterSessao(sessionId, userId);
  const banco = deps.db ?? db;
  const resultados: ResultadoProva[] = [];
  for (const question of sessao.gabaritos.values()) {
    const resposta = sessao.respostas[question.id];
    const correta = resposta !== null && resposta === question.gabarito;
    const tentativa = await banco.attempts.create({ data: { user_id: userId, question_id: question.id, alternativa_escolhida: resposta ?? "", acerto: correta } });
    resultados.push({ questao_id: question.id, resposta, correta, gabarito: question.gabarito, comentario_html: question.comentario_html ? sanitizarHtml(question.comentario_html) : null, tentativa });
  }
  sessao.entregue = true;
  sessoes.delete(sessionId);
  return { resultados, acertos: resultados.filter((resultado) => resultado.correta).length, total: resultados.length };
}

export const responderModoEstudo = responder;
export const iniciarProva = iniciarSessaoProva;
export const responderProva = responderEmProva;
export const entregarProva = entregarSessaoProva;
