// /admin/cursos — listagem de cursos (US-03, admin).
//
// ROTA FINA (AGENTS.md §6): monta os dados via serviços (composição em
// _dados.ts) e renderiza. RBAC é validado no layout (requireRole) e de novo
// em cada server action. A exclusão (C6, digitar o nome) é um componente
// client que chama a server action excluirCursoAction.
import type { Metadata } from "next";
import Link from "next/link";

import { listarCursosComPublicados } from "./_dados";
import { ExcluirCursoDialog } from "./curso-delete-dialog";

export const metadata: Metadata = {
  title: "Cursos | Administração | ConcursFoco",
};

export default async function AdminCursosPage() {
  const cursos = await listarCursosComPublicados();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Cursos</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            gerencie cursos, módulos e materiais do conteúdo publicado
          </p>
        </div>
        <Link
          href="/admin/cursos/novo"
          className="inline-flex h-9 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground shadow-sm transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          Novo curso
        </Link>
      </div>

      {cursos.length === 0 ? (
        <div className="rounded-lg border bg-card p-8 text-center text-sm text-muted-foreground">
          nenhum curso cadastrado ainda —{" "}
          <Link href="/admin/cursos/novo" className="text-foreground hover:underline">
            crie o primeiro
          </Link>
        </div>
      ) : (
        <ul className="space-y-3">
          {cursos.map(({ curso, publicados }) => (
            <li
              key={curso.id}
              className="flex items-center justify-between gap-4 rounded-lg border bg-card p-4 shadow-sm"
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <Link
                    href={`/admin/cursos/${curso.id}`}
                    className="font-semibold text-foreground hover:underline"
                  >
                    {curso.nome}
                  </Link>
                  {curso.incluido_assinatura && (
                    <span className="rounded-full border border-primary/40 bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                      Incluído na assinatura
                    </span>
                  )}
                </div>
                <p className="mt-0.5 truncate text-sm text-muted-foreground">
                  <code className="text-xs">{curso.slug}</code>
                  <span className="mx-2">·</span>
                  {publicados}{" "}
                  {publicados === 1 ? "material publicado" : "materiais publicados"}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <Link
                  href={`/admin/cursos/${curso.id}`}
                  className="inline-flex h-9 items-center justify-center rounded-md border border-input bg-transparent px-3 text-sm font-medium transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  Editar
                </Link>
                <ExcluirCursoDialog cursoId={curso.id} cursoNome={curso.nome} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
