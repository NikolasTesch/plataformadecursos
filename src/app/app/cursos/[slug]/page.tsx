// /app/cursos/[slug] — página do curso do aluno (US-11, SPEC-aluno.md:32-36).
//
// ROTA FINA (AGENTS.md §6): verificação de sessão em Node (padrão S1) +
// serviço de navegação (consultas, transformações e gating) + renderização.
//
// Regras:
//   - R5: curso inexistente → notFound(); curso sem material publicado →
//     notFound() (oculto do aluno). Materiais `rascunho` NÃO são renderizados.
//   - R6: módulos e materiais ordenados por `ordem` (asc — feito no serviço).
//   - Gating S3: amostra → MaterialCard status `amostra`;
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
import { emitirCertificadoAction } from "./certificado-actions";
import { obterCursoAlunoPorSlug } from "@/services/aluno/navegacao";

export const metadata: Metadata = {
  title: "Curso | ConcursFoco",
};

interface Props {
  params: Promise<{ slug: string }>;
}

export default async function AppCursoPage({ params }: Props) {
  const { slug } = await params;

  const session = await auth();
  if (!session) redirect("/login");
  const sessaoValida = await verificarSessaoValida(session);
  if (!sessaoValida) redirect("/login");

  const dados = await obterCursoAlunoPorSlug(session.user.id, slug);
  if (!dados) notFound();
  const { curso, modulos: modulosComMateriais, percentual } = dados;

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
        <div className="mt-5 max-w-sm">
          <div className="flex justify-between text-sm"><span className="text-muted-foreground">Progresso</span><strong className="text-primary">{percentual}%</strong></div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted" role="progressbar" aria-label={`Progresso em ${curso.nome}`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={percentual}><div className="h-full rounded-full bg-primary" style={{ width: `${percentual}%` }} /></div>
        </div>
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
                        status={material.status === "amostra" ? "amostra" : material.status === "concluido" ? "concluido" : "disponivel"}
                      />
                    ) : (
                      <BloqueadoCard material={material} motivo={material.motivo} />
                    )}
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
      {percentual === 100 && (
        <form action={emitirCertificadoAction}>
          <input type="hidden" name="course_id" value={curso.id} />
          <button type="submit" className="rounded-md border px-4 py-2 text-sm">Emitir certificado</button>
        </form>
      )}
    </main>
  );
}
