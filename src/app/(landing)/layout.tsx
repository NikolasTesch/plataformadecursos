// Layout LANDING — mínimo para as rotas públicas de conversão (S2, todo 13).
//
// A sales page /cursos/[slug] (US-44) é a primeira rota real deste route
// group. O layout completo da landing (hero, seções, footer rico, R-L1 a
// R-L8) chega no slice de frontend — aqui apenas o mínimo: header fixo com
// logo (→ home) e acesso, conteúdo centralizado e footer simples.
//
// R-L1 (SPEC-landing.md:48-50): "1 botão primário visível por viewport" —
// o header NÃO tem botão primário (só "Entrar" ghost); o CTA primário é a
// "Começar trial grátis" da própria página (a sales page a renderiza).
//
// Tema: shadcn DEFAULT (tokens do globals.css) — tokens de marca do
// DESIGN.md §12-13 NÃO são aplicados (slice de frontend posterior).
import type { ReactNode } from "react";
import Link from "next/link";

export default function LandingLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-svh flex-col">
      <header className="sticky top-0 z-10 border-b bg-background/95 backdrop-blur">
        <div className="mx-auto flex h-14 w-full max-w-5xl items-center justify-between px-4">
          <Link
            href="/"
            className="text-xl font-bold tracking-tight text-foreground hover:underline"
          >
            ConcursFoco
          </Link>
          <nav aria-label="Acesso" className="flex items-center">
            <Link
              href="/login"
              className="inline-flex h-9 items-center justify-center rounded-md px-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              Entrar
            </Link>
          </nav>
        </div>
      </header>

      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-10">
        {children}
      </main>

      <footer className="border-t">
        <div className="mx-auto flex h-14 w-full max-w-5xl items-center justify-between px-4 text-sm text-muted-foreground">
          <span>© {new Date().getFullYear()} ConcursFoco</span>
          <Link href="/precos" className="hover:underline">
            Planos
          </Link>
        </div>
      </footer>
    </div>
  );
}
