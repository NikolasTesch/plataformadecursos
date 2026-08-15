// /app/cursos — lista de cursos do aluno (US-11, SPEC-aluno.md:32-36).
//
// ROTA FINA (AGENTS.md §6): verificação de sessão em Node (padrão do
// page.tsx do S1 — auth() + verificarSessaoValida, A3) + dados via serviço
// (listarCursos) + filtro de leitura (contagem de materiais publicados).
//
// R5: curso sem NENHUM material publicado é OCULTO da lista (rascunho
// invisível; curso "vazio" não aparece — SPEC-aluno.md:33). O % de progresso
// é do S3 (decisão do plano s2 todo 8: omitir barra até lá).
import type { Metadata } from "next";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { redirect } from "next/navigation";

import { auth } from "@/lib/auth/auth";
import { verificarSessaoValida } from "@/lib/auth/verificar-sessao";
import { db } from "@/lib/db";
import { listarCursos } from "@/services/conteudo/cursos";

export const metadata: Metadata = {
  title: "Cursos | ConcursFoco",
};

export default async function AppCursosPage() {
  const session = await auth();
  if (!session) redirect("/login");
  const sessaoValida = await verificarSessaoValida(session);
  if (!sessaoValida) redirect("/login");

  const cursos = await listarCursos();

  // R5 — cursos sem material publicado ficam ocultos (contagem via relação
  // modulo → course_id; mesmo shape da checagem C1 do serviço de cursos).
  const cursosVisiveis = (
    await Promise.all(
      cursos.map(async (curso) => ({
        curso,
        publicados: await db.materials.count({
          where: { modulo: { course_id: curso.id }, status: "publicado" },
        }),
      })),
    )
  ).filter(({ publicados }) => publicados > 0);

  return (
    <main className="mx-auto w-full max-w-3xl space-y-6 px-4 py-8">
      <div>
        <p className="text-sm text-muted-foreground">
          <Link href="/app" className="hover:underline">
            Início
          </Link>
          <span className="mx-1.5">/</span>
          <span className="text-foreground">Cursos</span>
        </p>
        <h1 className="mt-2 text-2xl font-bold tracking-tight">Cursos</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          materiais publicados para você estudar
        </p>
      </div>

      {cursosVisiveis.length === 0 ? (
        <div className="rounded-lg border bg-card p-8 text-center text-sm text-muted-foreground">
          nenhum curso publicado ainda
        </div>
      ) : (
        <ul className="space-y-3">
          {cursosVisiveis.map(({ curso }) => (
            <li key={curso.id}>
              <Link
                href={`/app/cursos/${curso.slug}`}
                data-testid={`curso-card-${curso.slug}`}
                className="flex items-center justify-between gap-4 rounded-lg border bg-card p-4 shadow-sm transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <span className="min-w-0">
                  <span className="block truncate font-semibold text-foreground">
                    {curso.nome}
                  </span>
                  {curso.descricao && (
                    <span className="mt-0.5 block truncate text-sm text-muted-foreground">
                      {curso.descricao}
                    </span>
                  )}
                </span>
                <span className="flex shrink-0 items-center gap-2">
                  {curso.incluido_assinatura && (
                    <span className="rounded-full border border-primary/40 bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                      Incluído na assinatura
                    </span>
                  )}
                  <ChevronRight
                    aria-hidden="true"
                    className="h-4 w-4 shrink-0 text-muted-foreground"
                  />
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
