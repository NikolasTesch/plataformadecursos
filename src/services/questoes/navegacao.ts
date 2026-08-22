// Visão autorizada das rotas de questões. Conteúdo só é consultado depois do gating.
import { db } from "@/lib/db";
import { montarEntitlementsGating } from "@/services/conteudo/leitura";
import { podeAcessarMaterial, type MotivoGating } from "@/services/gating";
import type { Prisma } from "@/generated/prisma/client";

type Alternativa = { letra: string; texto: string };
export type QuestaoPublica = { id: string; enunciado: string; alternativas: Alternativa[]; ordem: number };
export type BlocoQuestaoAluno = { id: string; titulo: string; curso: string; cursoSlug: string; permitido: boolean; motivo: MotivoGating; questoes: QuestaoPublica[] };

function alternativas(valor: Prisma.JsonValue): Alternativa[] { return Array.isArray(valor) ? valor as Alternativa[] : []; }

async function acesso(userId: string, materialId: string) {
  const material = await db.materials.findUnique({ where: { id: materialId }, select: { id: true, titulo: true, tipo: true, status: true, amostra: true, module_id: true } });
  if (!material || material.tipo !== "questoes" || material.status !== "publicado") return null;
  const modulo = await db.modules.findUnique({ where: { id: material.module_id }, select: { course_id: true } });
  const curso = modulo && await db.courses.findUnique({ where: { id: modulo.course_id }, select: { id: true, nome: true, slug: true, incluido_assinatura: true } });
  if (!modulo || !curso) return null;
  const linhas = await db.entitlements.findMany({ where: { user_id: userId }, include: { product: true } });
  const resultado = podeAcessarMaterial({ userId, material, curso: { id: curso.id, incluido_assinatura: curso.incluido_assinatura }, entitlements: montarEntitlementsGating(linhas) });
  return { material, curso, permitido: resultado.permitido, motivo: resultado.motivo };
}

export async function obterBlocoQuestaoAluno(userId: string, materialId: string): Promise<BlocoQuestaoAluno | null> {
  const dados = await acesso(userId, materialId);
  if (!dados) return null;
  // R12: nenhum enunciado, alternativa ou gabarito é lido no ramo bloqueado.
  const questoes = dados.permitido ? await db.questions.findMany({ where: { material_id: materialId }, orderBy: { ordem: "asc" }, select: { id: true, enunciado: true, alternativas: true, ordem: true } }) : [];
  return { id: dados.material.id, titulo: dados.material.titulo, curso: dados.curso.nome, cursoSlug: dados.curso.slug, permitido: dados.permitido, motivo: dados.motivo, questoes: questoes.map(({ id, enunciado, alternativas: opcoes, ordem }) => ({ id, enunciado, alternativas: alternativas(opcoes), ordem })) };
}

export async function listarBlocosQuestoesAluno(userId: string) {
  const materiais = await db.materials.findMany({ where: { tipo: "questoes", status: "publicado" }, orderBy: { ordem: "asc" }, select: { id: true, titulo: true, amostra: true, status: true, module_id: true, modulo: { select: { course_id: true, course: { select: { id: true, nome: true, slug: true, incluido_assinatura: true } } } } } });
  const linhas = await db.entitlements.findMany({ where: { user_id: userId }, include: { product: true } });
  const entitlements = montarEntitlementsGating(linhas);
  return materiais.map((material) => { const resultado = podeAcessarMaterial({ userId, material, curso: material.modulo.course, entitlements }); return { id: material.id, titulo: material.titulo, curso: material.modulo.course.nome, cursoSlug: material.modulo.course.slug, permitido: resultado.permitido, motivo: resultado.motivo }; });
}
