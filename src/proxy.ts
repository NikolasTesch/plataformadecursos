// Proxy de proteção de rotas por role — ConcursFoco (todo 8, S1-Fundação).
//
// EDGE-SAFE (BLOCKER-1): este arquivo roda fora do Node e NUNCA acessa o banco.
// A instância de auth é criada a partir de auth.config.ts (split config do
// todo 7) — que não importa db/PrismaAdapter/argon2 — e NÃO a
// partir de src/lib/auth/auth.ts (instância Node com PrismaAdapter). A
// verificação é APENAS presença de JWT + role (checagem otimista); a revogação
// por tokenVersion (A3) é verificada em Node via verificarSessaoValida nas
// páginas/actions/route handlers (todos 12/13), nunca aqui.
//
// CONVENÇÃO NEXT 16 (2026-08-19): o file convention `middleware` foi
// renomeado para `proxy`; este arquivo usa a convenção oficial `proxy.ts`.
//
// DECISÃO REDIRECT (2026-08-15): Next 16 PROÍBE a navigation API (redirect()
// de next/navigation) dentro de Proxy/Middleware — o runtime lança "Next.js
// navigation API is not allowed to be used in Proxy/Middleware". O mecanismo
// correto é NextResponse.redirect (docs: redirecting.md §NextResponse.redirect
// in Proxy). Por isso este proxy usa NextResponse.redirect em vez de
// redirect() — desvio documentado da instrução original.
import NextAuth from "next-auth";
import { NextResponse } from "next/server";

import { authConfig } from "@/lib/auth/auth.config";

/**
 * Decisão de proteção de rota — FUNÇÃO PURA (unit-testável, sem runtime Next).
 *
 * Dado o pathname e o estado de auth da requisição, devolve o path de destino
 * do redirect (ou null = permite seguir).
 *
 * Regras (SPEC-frontend.md:89 + plano S1 todo 8):
 * - `/admin/*` sem sessão          → `/login`
 * - `/admin/*` com role aluno      → `/` (área do aluno não é admin)
 * - `/admin/*` com role admin      → null (passa)
 * - `/app/*` sem sessão            → `/login`
 * - `/app/*` autenticado           → null (passa — qualquer role)
 * - qualquer outro path            → null (passa — matcher é estreito)
 *
 * A comparação de prefixo é segment-aware (`/admin` e `/admin/...`), para não
 * tratar pathnames como `/administrador` como rota admin.
 */
export function protegerRota(
  pathname: string,
  isAuthed: boolean,
  isAdmin: boolean,
): string | null {
  if (pathname === "/admin" || pathname.startsWith("/admin/")) {
    if (!isAuthed) return "/login";
    if (!isAdmin) return "/";
    return null;
  }

  if (pathname === "/app" || pathname.startsWith("/app/")) {
    if (!isAuthed) return "/login";
    return null;
  }

  return null;
}

// Instância Edge-safe: apenas opções compartilhadas (sem provider Node,
// adapter, DB ou módulos nativos).
const { auth } = NextAuth(authConfig);

// Wrapper fino: parse do request → função pura → redirect.
export default auth((req) => {
  const destino = protegerRota(
    req.nextUrl.pathname,
    !!req.auth,
    req.auth?.user?.role === "admin",
  );

  if (destino) {
    return NextResponse.redirect(new URL(destino, req.url));
  }
});

// Matcher estreito: o proxy só roda em /admin/* e /app/*.
// (path-to-regexp: `:path*` = zero ou mais segmentos — cobre /admin e /admin/x)
export const config = {
  matcher: ["/admin/:path*", "/app/:path*"],
};
