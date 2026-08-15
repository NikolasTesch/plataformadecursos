// Layout AUTH — centralizado, card único (SPEC-frontend.md:95).
//
// Contrato do spec: "centralizado, card único (login/cadastro), logo, link de
// volta à landing. Cadastro com consentimento LGPD em destaque." Sem nav da
// landing — a área de auth é a porta de entrada para /app e /admin.
//
// Tema: shadcn DEFAULT (tokens do globals.css) — tokens de marca do
// DESIGN.md §12-13 NÃO são aplicados (slice de frontend posterior).
import type { ReactNode } from "react";
import Link from "next/link";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-svh items-center justify-center bg-muted/40 px-4 py-8">
      <div className="w-full max-w-sm">
        <header className="mb-6 flex flex-col items-center gap-1 text-center">
          <Link
            href="/"
            className="text-2xl font-bold tracking-tight text-foreground hover:underline"
          >
            ConcursFoco
          </Link>
          <p className="text-sm text-muted-foreground">
            Plataforma de estudos para concursos
          </p>
        </header>

        <main className="rounded-lg border bg-card p-6 shadow-sm">
          {children}
        </main>

        <p className="mt-6 text-center text-sm text-muted-foreground">
          <Link href="/" className="hover:underline">
            voltar para a página inicial
          </Link>
        </p>
      </div>
    </div>
  );
}
