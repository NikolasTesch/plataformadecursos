// /app/cursos/[slug] — página do curso do aluno (US-11, SPEC-aluno.md:32-36).
//
// ROTA FINA (AGENTS.md §6): verificação de sessão em Node (padrão S1) +
// serviços (obterCursoPorSlug, listarModulos, listarMateriais) + gating por
// material (podeAcessarMaterial — caller monta o shape dos entitlements a
// partir de Prisma, contrato do README de gating).
//
// Regras:
//   - R5: curso inexistente → notFound(); curso sem material publicado →
//     notFound() (oculto do aluno). Materiais `rascunho` NÃO são renderizados.
//   - R6: módulos e materiais ordenados por `ordem` (asc — feito no serviço).
//   - Gating (subset R1-R4): amostra → MaterialCard status `amostra`;
//     assinatura ativa / venda_unica → `disponivel`; senão BloqueadoCard —
//     NUNCA conteúdo (R12): o card bloqueado não recebe conteúdo nem link.
//
// Progresso (% / concluido) é do S3 — decisão do plano s2 todo 8.
import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { BloqueadoCard } from "@/components/app/BloqueadoCard";
import { MaterialCard } from "@/components/app/MaterialCard";
import { auth } from "@/lib/auth/auth";
import { verificarSessaoValida } from "@/lib/auth/verificar-sessao";
import { db } from "@/lib/db";
import { ErroConteudo } from "@/services/conteudo/erros";
import { obterCursoPorSlug } from "@/services/conteudo/cursos";
import { listarModulos } from "@/services/conteudo/modulos";
import { listarMateriais } from "@/services/conteudo/materiais";
import {
  podeAcessarMaterial,
  type EntitlementGating,
  type MotivoGating,
} from "@/services/gating";
import type {
  courses,
  entitlements,
  MaterialTipo,
  modules,
  products,
} from "@/generated/prisma/client";

export const metadata: Metadata = {
  title: "Curso | ConcursFoco",
};

interface Props {
  params: Promise<{ slug: string }>;
}

/** Entitlement com o produto carregado (join do Prisma). */
type EntitlementComProduto = entitlements & { product: products };

/**
 * Monta o shape mínimo do gating a partir das linhas de `entitlements`
 * (contrato `EntitlementGating`, README de gating — caller monta os dados).
 * Produto inativo não concede acesso (R2 — checagem do caller no subset;
 * o motor completo do S3 incorpora "produto ativo").
 */
function montarEntitlements(linhas: EntitlementComProduto[]): EntitlementGating[] {
  return linhas.flatMap((linha) => {
    const produto = linha.product;
    if (produto.status !== "ativo") return [];
    return [
      {
        id: linha.id,
        origem: linha.origem,
        acesso_ate: linha.acesso_ate,
        product_id: linha.product_id,
        product: { tipo: produto.tipo, curso_id: produto.curso_id },
      },
    ];
  });
}

interface MaterialComStatus {
  id: string;
  titulo: string;
  tipo: MaterialTipo;
  permitido: boolean;
  motivo: MotivoGating;
}

export default async function AppCursoPage({ params }: Props) {
  const { slug } = await params;

  const session = await auth();
  if (!session) redirect("/login");
  const sessaoValida = await verificarSessaoValida(session);
  if (!sessaoValida) redirect("/login");

  let curso: courses;
  try {
    curso = await obterCursoPorSlug(slug);
  } catch (erro) {
    if (erro instanceof ErroConteudo && erro.code === "nao_encontrado") {
      notFound(); // R5 — curso inexistente é 404 para o aluno
    }
    throw erro;
  }

  // R5 — curso sem material publicado fica oculto do aluno (SPEC-aluno.md:33).
  const publicados = await db.materials.count({
    where: { modulo: { course_id: curso.id }, status: "publicado" },
  });
  if (publicados === 0) notFound();

  // Entitlements do aluno (avaliados a cada requisição — R7).
  const linhasEntitlements = await db.entitlements.findMany({
    where: { user_id: session.user.id },
    include: { product: true },
  });
  const entitlements = montarEntitlements(linhasEntitlements);

  // Módulos (R6 — ordem asc) + materiais publicados com status via gating.
  const modulos = await listarModulos(curso.id);
  const modulosComMateriais: Array<{
    modulo: modules;
    materiais: MaterialComStatus[];
  }> = [];
  for (const modulo of modulos) {
    const materiais = await listarMateriais(modulo.id); // R6 — ordem asc
    const publicadosDoModulo = materiais.filter((m) => m.status === "publicado"); // R5
    if (publicadosDoModulo.length === 0) continue; // módulo sem conteúdo visível
    modulosComMateriais.push({
      modulo,
      materiais: publicadosDoModulo.map((m) => {
        const resultado = podeAcessarMaterial({
          userId: session.user.id,
          material: { id: m.id, status: m.status, amostra: m.amostra },
          curso: {
            id: curso.id,
            incluido_assinatura: curso.incluido_assinatura,
          },
          entitlements,
        });
        return {
          id: m.id,
          titulo: m.titulo,
          tipo: m.tipo,
          permitido: resultado.permitido,
          motivo: resultado.motivo,
        };
      }),
    });
  }

  return (
    <main className="mx-auto w-full max-w-3xl space-y-8 px-4 py-8">
      <div>
        <p className="text-sm text-muted-foreground">
          <Link href="/app/cursos" className="hover:underline">
            Cursos
          </Link>
          <span className="mx-1.5">/</span>
          <span className="text-foreground">{curso.nome}</span>
        </p>
        <h1 className="mt-2 text-2xl font-bold tracking-tight">{curso.nome}</h1>
        {curso.descricao && (
          <p className="mt-1 text-sm text-muted-foreground">{curso.descricao}</p>
        )}
        {curso.incluido_assinatura && (
          <span className="mt-3 inline-block rounded-full border border-primary/40 bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
            Incluído na assinatura
          </span>
        )}
      </div>

      {modulosComMateriais.length === 0 ? (
        <div className="rounded-lg border bg-card p-8 text-center text-sm text-muted-foreground">
          nenhum material publicado neste curso
        </div>
      ) : (
        <div className="space-y-8">
          {modulosComMateriais.map(({ modulo, materiais }) => (
            <section key={modulo.id} aria-labelledby={`modulo-${modulo.id}`}>
              <h2
                id={`modulo-${modulo.id}`}
                className="mb-3 text-lg font-semibold tracking-tight"
              >
                {modulo.nome}
              </h2>
              <ul className="space-y-2">
                {materiais.map((material) => (
                  <li key={material.id}>
                    {material.permitido ? (
                      <MaterialCard
                        cursoSlug={curso.slug}
                        material={material}
                        status={
                          material.motivo === "amostra" ? "amostra" : "disponivel"
                        }
                      />
                    ) : (
                      <BloqueadoCard material={material} />
                    )}
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </main>
  );
}
