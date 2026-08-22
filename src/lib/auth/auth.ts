// Inicialização NODE do Auth.js v5 (next-auth@beta) — auth.ts.
//
// Este arquivo usa o adapter Prisma (src/lib/db.ts, Prisma 7 + adapter-pg) e
// portanto SÓ roda no Node. O proxy (todo 8) importa auth.config.ts
// (edge-safe) — NUNCA este arquivo. Regra BLOCKER-1: PrismaClient não roda no
// Edge; toda verificação de sessão com banco acontece em Node
// (verificar-sessao.ts), nunca no proxy.
//
// Estratégia de sessão: "jwt" OBRIGATÓRIA — Auth.js Credentials NÃO suporta
// database sessions (UnsupportedStrategy). Revogação de sessões via
// tokenVersion (SPEC-auth A3), verificada em Node por verificarSessaoValida.
import { PrismaAdapter } from "@auth/prisma-adapter";
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { verify } from "argon2";

import { db } from "@/lib/db";

import { authConfig } from "./auth.config";

export const credentialsProvider = Credentials({
  credentials: { email: {}, password: {} },
  authorize: async (c) => {
    const email = typeof c.email === "string" ? c.email : "";
    const password = typeof c.password === "string" ? c.password : "";
    if (!email || !password) return null;

    const user = await db.users.findUnique({ where: { email } });
    if (!user || user.bloqueado) return null;

    const senhaOk = await verify(user.senha_hash, password);
    if (!senhaOk) return null;

    return {
      id: user.id,
      email: user.email,
      name: user.nome,
      role: user.role,
      tokenVersion: user.tokenVersion,
    };
  },
});

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [credentialsProvider],
  adapter: PrismaAdapter(db),
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 dias (SPEC-auth US-02)
    updateAge: 24 * 60 * 60, // renovação deslizante: estende a cada 24h de atividade
  },
});
