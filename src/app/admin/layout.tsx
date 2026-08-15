// Layout ADMIN-SHELL — painel administrativo (SPEC-frontend.md:102).
//
// Fino por contrato: o middleware (src/middleware.ts) já protege /admin/*
// por role; este layout reforça a autorização no servidor com `requireRole`
// (defesa em profundidade — AGENTS.md §6: autorização sempre validada no
// servidor) e redireciona para /login quando a sessão não é admin.
//
// Tema: shadcn DEFAULT (tokens do globals.css) — tokens de marca do
// DESIGN.md §12-13 NÃO são aplicados (slice de frontend posterior).
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import Link from "next/link";

import { requireRole } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Administração | ConcursFoco",
  description: "Painel administrativo da plataforma ConcursFoco.",
};

export default async function AdminLayout({
  children,
}: {
  children: ReactNode;
}) {
  try {
    await requireRole("admin");
  } catch {
    // Middleware já desvia; este é o reforço server-side (defesa em profundidade).
    redirect("/login");
  }

  return (
    <div className="min-h-svh bg-muted/40">
      <header className="border-b bg-card">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
          <Link
            href="/admin/cursos"
            className="text-lg font-bold tracking-tight text-foreground hover:underline"
          >
            ConcursFoco <span className="text-muted-foreground">· Admin</span>
          </Link>
          <nav className="flex items-center gap-4 text-sm">
            <Link
              href="/admin/cursos"
              className="font-medium text-foreground hover:underline"
            >
              Cursos
            </Link>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-8">{children}</main>
    </div>
  );
}
