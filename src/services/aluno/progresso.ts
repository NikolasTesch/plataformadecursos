// Progresso do aluno (AL1): somente materiais publicados e acessíveis entram
// no denominador. A autorização é reavaliada no servidor antes de qualquer
// gravação, portanto um material bloqueado nunca cria user_progress.
import { db as dbPadrao } from "@/lib/db";
import { podeAcessarMaterial, type EntitlementGating } from "@/services/gating";

type MaterialProgresso = {
  id: string;
  module_id: string;
  status: "rascunho" | "publicado";
  amostra: boolean;
  video_status?: "processando" | "pronto" | "erro" | null;
};

type ModuloProgresso = { id: string; course_id: string };
type CursoProgresso = { id: string; incluido_assinatura: boolean };

export interface DbProgresso {
  materials: {
    findUnique(args: { where: { id: string }; select?: Record<string, boolean> }): Promise<MaterialProgresso | null>;
    findMany(args: { where: { modulo: { course_id: string }; status: "publicado" }; select?: Record<string, boolean> }): Promise<MaterialProgresso[]>;
  };
  modules: {
    findUnique(args: { where: { id: string }; select?: Record<string, boolean> }): Promise<ModuloProgresso | null>;
  };
  courses: {
    findUnique(args: { where: { id: string }; select?: Record<string, boolean> }): Promise<CursoProgresso | null>;
  };
  entitlements: {
    findMany(args: { where: { user_id: string }; include: { product: boolean } }): Promise<Array<EntitlementGating & { product: NonNullable<EntitlementGating["product"]> }>>;
  };
  user_progress: {
    upsert(args: { where: { user_id_material_id: { user_id: string; material_id: string } }; update: Record<string, unknown>; create: Record<string, unknown> }): Promise<unknown>;
    updateMany(args: { where: { user_id: string; material_id: string }; data: Record<string, unknown> }): Promise<{ count: number }>;
    findUnique(args: { where: { user_id_material_id: { user_id: string; material_id: string } } }): Promise<{ concluido: boolean } | null>;
    findMany(args: { where: { user_id: string; material_id: { in: string[] } }; select: { material_id: boolean; concluido: boolean } }): Promise<Array<{ material_id: string; concluido: boolean }>>;
  };
}

export class ErroProgresso extends Error {
  constructor(public readonly code: "material_nao_encontrado" | "acesso_negado" | "curso_nao_encontrado") {
    super(code);
    this.name = "ErroProgresso";
  }
}

const db = dbPadrao as unknown as DbProgresso;

async function contextoMaterial(userId: string, materialId: string, banco: DbProgresso = db) {
  const material = await banco.materials.findUnique({ where: { id: materialId } });
  if (!material) throw new ErroProgresso("material_nao_encontrado");
  const modulo = await banco.modules.findUnique({ where: { id: material.module_id } });
  if (!modulo) throw new ErroProgresso("material_nao_encontrado");
  const curso = await banco.courses.findUnique({ where: { id: modulo.course_id } });
  if (!curso) throw new ErroProgresso("curso_nao_encontrado");
  const linhas = await banco.entitlements.findMany({ where: { user_id: userId }, include: { product: true } });
  const acesso = podeAcessarMaterial({
    userId,
    material,
    curso,
    entitlements: linhas,
  });
  if (!acesso.permitido) throw new ErroProgresso("acesso_negado");
  return { material, curso };
}

export async function concluir(userId: string, materialId: string, banco: DbProgresso = db): Promise<void> {
  await contextoMaterial(userId, materialId, banco);
  const agora = new Date();
  await banco.user_progress.upsert({
    where: { user_id_material_id: { user_id: userId, material_id: materialId } },
    update: { concluido: true, concluido_em: agora },
    create: { user_id: userId, material_id: materialId, concluido: true, concluido_em: agora },
  });
}

export async function desmarcar(userId: string, materialId: string, banco: DbProgresso = db): Promise<void> {
  await contextoMaterial(userId, materialId, banco);
  await banco.user_progress.updateMany({
    where: { user_id: userId, material_id: materialId },
    data: { concluido: false, concluido_em: null },
  });
}

export async function obterProgressoMaterial(userId: string, materialId: string, banco: DbProgresso = db): Promise<boolean> {
  return (await banco.user_progress.findUnique({ where: { user_id_material_id: { user_id: userId, material_id: materialId } } }))?.concluido ?? false;
}

export async function progressoCurso(userId: string, cursoId: string, banco: DbProgresso = db): Promise<number> {
  const curso = await banco.courses.findUnique({ where: { id: cursoId } });
  if (!curso) throw new ErroProgresso("curso_nao_encontrado");
  const materiais = await banco.materials.findMany({ where: { modulo: { course_id: cursoId }, status: "publicado" } });
  const linhas = await banco.entitlements.findMany({ where: { user_id: userId }, include: { product: true } });
  const acessiveis = materiais.filter((material) => podeAcessarMaterial({ userId, material, curso, entitlements: linhas }).permitido);
  if (acessiveis.length === 0) return 0;
  const ids = new Set((await banco.user_progress.findMany({
    where: { user_id: userId, material_id: { in: acessiveis.map(({ id }) => id) } },
    select: { material_id: true, concluido: true },
  })).filter(({ concluido }) => concluido).map(({ material_id }) => material_id));
  return Math.round((ids.size / acessiveis.length) * 100);
}
