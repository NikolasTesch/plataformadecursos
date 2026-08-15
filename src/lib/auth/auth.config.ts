// Configuração EDGE-SAFE do Auth.js v5 (next-auth@beta) — auth.config.ts.
//
// IMPORTANTE (contrato do projeto): este arquivo é importado pelo middleware
// (todo 8), que roda no Edge. Portanto o top-level NÃO pode importar
// db/PrismaClient/PrismaAdapter/argon2 — PrismaClient e módulos nativos não
// rodam no Edge. O `authorize` do Credentials só executa no Node, no momento
// do sign-in (nunca no middleware); por isso o acesso ao banco e ao argon2
// usam dynamic import LAZY dentro do corpo da função.
// Referência: authjs.dev edge-compatibility (split config) — "no database
// queries are executed in your proxy or middleware".
import type { NextAuthConfig } from "next-auth";
import Credentials from "next-auth/providers/credentials";

export const authConfig = {
  providers: [
    Credentials({
      credentials: { email: {}, password: {} },
      authorize: async (c) => {
        // Lazy imports: só são resolvidos em runtime no Node (sign-in).
        // Nunca entram no bundle do Edge/middleware em tempo de execução.
        const { db } = await import("@/lib/db");
        const { verify } = await import("argon2");

        const email = typeof c.email === "string" ? c.email : "";
        const password = typeof c.password === "string" ? c.password : "";
        if (!email || !password) return null;

        const user = await db.users.findUnique({ where: { email } });

        // Caminhos de usuário desconhecido e senha errada SÃO IDÊNTICOS
        // (ambos retornam null) — a mensagem genérica é tratada no service de
        // login (todo 11). Conta bloqueada também retorna null (a distinção de
        // "conta suspensa" é do service, não do authorize).
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
    }),
  ],
  callbacks: {
    jwt: ({ token, user, trigger }) => {
      // No sign-in (trigger "signIn"), `user` é o objeto retornado pelo
      // authorize — fazemos o stamping do tokenVersion e propagamos role e
      // identidade para o token (A3: bloqueio bump invalida sessões JWT).
      if (trigger === "signIn" && user) {
        token.tokenVersion = user.tokenVersion;
        token.role = user.role;
        token.name = user.name;
        token.email = user.email;
      }
      return token;
    },
    session: ({ session, token }) => {
      // Sessão expõe id/role/tokenVersion a partir do token (JWT strategy).
      // token.sub é o id do usuário gravado pelo Auth.js no sign-in.
      if (token.sub) session.user.id = token.sub;
      session.user.role = token.role ?? "aluno";
      session.user.tokenVersion = token.tokenVersion ?? 0;
      return session;
    },
  },
} satisfies NextAuthConfig;
