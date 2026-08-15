// Inicialização NODE do Auth.js v5 (next-auth@beta) — auth.ts.
//
// Este arquivo usa o adapter Prisma (src/lib/db.ts, Prisma 7 + adapter-pg) e
// portanto SÓ roda no Node. O middleware (todo 8) importa auth.config.ts
// (edge-safe) — NUNCA este arquivo. Regra BLOCKER-1: PrismaClient não roda no
// Edge; toda verificação de sessão com banco acontece em Node
// (verificar-sessao.ts), nunca no middleware.
//
// Estratégia de sessão: "jwt" OBRIGATÓRIA — Auth.js Credentials NÃO suporta
// database sessions (UnsupportedStrategy). Revogação de sessões via
// tokenVersion (SPEC-auth A3), verificada em Node por verificarSessaoValida.
import { PrismaAdapter } from "@auth/prisma-adapter";
import NextAuth from "next-auth";

import { db } from "@/lib/db";

import { authConfig } from "./auth.config";

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  adapter: PrismaAdapter(db),
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 dias (SPEC-auth US-02)
    updateAge: 24 * 60 * 60, // renovação deslizante: estende a cada 24h de atividade
  },
});
