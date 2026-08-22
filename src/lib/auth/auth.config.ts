// Configuração EDGE-SAFE do Auth.js v5 (next-auth@beta) — auth.config.ts.
//
// IMPORTANTE (contrato do projeto): este arquivo é importado pelo proxy
// (todo 8), que roda no Edge. Portanto ele contém apenas opções compartilhadas
// que podem ser avaliadas no Edge. O provider Credentials e seu `authorize`
// vivem no wrapper Node (auth.ts), junto dos imports de Prisma/argon2.
// Imports dinâmicos dentro desta configuração também entram no grafo do bundle
// do proxy e, por isso, não são uma fronteira Edge segura.
import type { NextAuthConfig } from "next-auth";

export const authConfig = {
  // O provider real é adicionado somente em auth.ts (Node).
  providers: [],
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
