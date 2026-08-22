// Logout (US-02) — logout.ts.
//
// Wrapper fino: delega ao signOut do Auth.js v5 (src/lib/auth/auth.ts), que
// limpa o cookie de sessão. NOTA (estratégia JWT — SPEC-auth A3): o signOut
// apenas remove o cookie do cliente; a revogação EFETIVA de sessões ativas já
// emitidas é feita via tokenVersion (quando o admin bloqueia, o bump invalida
// todos os JWTs). O enforcement Node dessa revogação é o verificarSessaoValida
// (src/lib/auth/verificar-sessao.ts), usado em pages/actions/route handlers —
// nunca no proxy/Edge (BLOCKER-1).
import { signOut } from "@/lib/auth/auth";

export async function logout(): Promise<void> {
  await signOut({ redirectTo: "/login" });
}
