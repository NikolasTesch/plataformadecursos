// Consultas da navegação do aluno (S3.5). O progresso é sempre calculado pelo
// serviço central, que reavalia o gating e mantém o isolamento por userId.
import { db } from "@/lib/db";
import type {
  courses,
  entitlements,
  MaterialTipo,
  modules,
  products,
} from "@/generated/prisma/client";
import { ErroConteudo } from "@/services/conteudo/erros";
import { listarMateriais } from "@/services/conteudo/materiais";
import { listarModulos } from "@/services/conteudo/modulos";
import {
  podeAcessarMaterial,
  type EntitlementGating,
  type MotivoGating,
} from "@/services/gating";
import { listarCursos, obterCursoPorSlug } from "@/services/conteudo/cursos";
import { progressoCurso } from "./progresso";

type EntitlementComProduto = entitlements & { product: products };

export interface MaterialComStatus {
  id: string;
  titulo: string;
  tipo: MaterialTipo;
  permitido: boolean;
  motivo: MotivoGating;
  status: StatusMaterialNavegacao;
}

export type StatusMaterialNavegacao = "disponivel" | "concluido" | "bloqueado" | "amostra";

/** Deriva o estado exibido somente após a autorização server-side. */
export function determinarStatusMaterial(params: {
  permitido: boolean;
  motivo: MotivoGating;
  concluido: boolean;
}): StatusMaterialNavegacao {
  if (!params.permitido) return "bloqueado";
  if (params.concluido) return "concluido";
  return params.motivo === "amostra" ? "amostra" : "disponivel";
}

export interface ModuloComMateriais {
  modulo: modules;
  materiais: MaterialComStatus[];
}

export interface CursoNavegacao {
  curso: courses;
  modulos: ModuloComMateriais[];
  percentual: number;
}

function montarEntitlements(linhas: EntitlementComProduto[]): EntitlementGating[] {
  return linhas.flatMap((linha) => {
    const produto = linha.product;
    if (produto.status !== "ativo") return [];
    return [{
      id: linha.id,
      origem: linha.origem,
      acesso_ate: linha.acesso_ate,
      product_id: linha.product_id,
      product: { tipo: produto.tipo, curso_id: produto.curso_id },
    }];
  });
}

/** Carrega a visão já autorizada da página do curso do aluno. */
export async function obterCursoAlunoPorSlug(
  userId: string,
  slug: string,
): Promise<CursoNavegacao | null> {
  let curso: courses;
  try {
    curso = await obterCursoPorSlug(slug);
  } catch (erro) {
    if (erro instanceof ErroConteudo && erro.code === "nao_encontrado") return null;
    throw erro;
  }

  const publicados = await db.materials.count({
    where: { modulo: { course_id: curso.id }, status: "publicado" },
  });
  if (publicados === 0) return null;

  const linhas = await db.entitlements.findMany({
    where: { user_id: userId },
    include: { product: true },
  });
  const entitlements = montarEntitlements(linhas);
  const modulos = await listarModulos(curso.id);
  const modulosComMateriais: ModuloComMateriais[] = [];
  const progresso = new Map(
    (await db.user_progress.findMany({
      where: { user_id: userId, material: { modulo: { course_id: curso.id } } },
      select: { material_id: true, concluido: true },
    })).map(({ material_id, concluido }) => [material_id, concluido]),
  );

  for (const modulo of modulos) {
    const materiais = (await listarMateriais(modulo.id)).filter(
      (material) => material.status === "publicado",
    );
    if (materiais.length === 0) continue;
    modulosComMateriais.push({
      modulo,
      materiais: materiais.map((material) => {
        const resultado = podeAcessarMaterial({
          userId,
          material: { id: material.id, status: material.status, amostra: material.amostra },
          curso: { id: curso.id, incluido_assinatura: curso.incluido_assinatura },
          entitlements,
        });
        return {
          id: material.id,
          titulo: material.titulo,
          tipo: material.tipo,
          permitido: resultado.permitido,
          motivo: resultado.motivo,
          status: determinarStatusMaterial({
            permitido: resultado.permitido,
            motivo: resultado.motivo,
            concluido: progresso.get(material.id) === true,
          }),
        };
      }),
    });
  }

  return { curso, modulos: modulosComMateriais, percentual: await progressoCurso(userId, curso.id) };
}

export async function listarCursosAluno(userId: string) {
  const cursos = await listarCursos();
  const visiveis = await Promise.all(cursos.map(async (curso) => ({ curso, publicados: await db.materials.count({ where: { modulo: { course_id: curso.id }, status: "publicado" } }) })));
  return Promise.all(visiveis.filter(({ publicados }) => publicados > 0).map(async ({ curso }) => ({ curso, percentual: await progressoCurso(userId, curso.id) })));
}
