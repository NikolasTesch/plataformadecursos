// Stub da landing — links de acesso (login/cadastro) para o S1.
//
// Página final da landing vem em slice próprio; aqui apenas o mínimo para
// navegar até a autenticação. Tema shadcn default (sem tokens de marca).
import Link from "next/link";
import { cn } from "@/lib/utils";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-3">
      <h1 className="text-4xl font-bold tracking-tight">ConcursFoco</h1>
      <p className="text-lg text-neutral-500">
        Plataforma de estudos para concursos
      </p>
      <nav className="mt-4 flex gap-3" aria-label="Acesso">
        <Link
          href="/login"
          className={cn(
            "inline-flex h-9 items-center justify-center rounded-md bg-primary",
            "px-4 text-sm font-medium text-primary-foreground shadow-sm",
            "transition-colors hover:bg-primary/90",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          )}
        >
          Entrar
        </Link>
        <Link
          href="/cadastro"
          className={cn(
            "inline-flex h-9 items-center justify-center rounded-md border",
            "border-input bg-background px-4 text-sm font-medium",
            "shadow-sm transition-colors hover:bg-accent hover:text-accent-foreground",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          )}
        >
          Criar conta
        </Link>
      </nav>
    </main>
  );
}
