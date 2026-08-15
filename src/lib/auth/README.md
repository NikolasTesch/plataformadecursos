# src/lib/auth — Autenticação (Auth.js/NextAuth v5)

## Função

Configuração de autenticação do ConcursFoco baseada em **Auth.js (NextAuth v5)**, com suporte a **roles** (`aluno`/`admin`). Centraliza providers, callbacks de sessão e os helpers de leitura de sessão/role consumidos por `src/services/auth` e pelo `middleware` de proteção de rotas. Foi criada para habilitar o scaffold do **S1 — Fundação** (Auth.js com roles, AGENTS.md §10).

## Arquitetura

Config **split** (Edge vs Node) implementada no S1 (todo 7):

```
src/lib/auth/
├── auth.config.ts      # Edge-safe: top-level só next-auth; authorize com dynamic import lazy (db + argon2)
├── auth.ts             # Node: NextAuth(authConfig) + PrismaAdapter + JWT (30d/24h) + tokenVersion no sign-in
├── index.ts            # Helpers Node-only: getSessionUser / requireRole / isAdmin (importa auth.ts)
├── verificar-sessao.ts # verificarSessaoValida(): revogação A3 em Node (bump de tokenVersion invalida JWT)
└── types.d.ts          # Augmentation de Session/User (next-auth) + JWT (@auth/core/jwt — ver decisões)
```

- **`auth.config.ts`** (Edge-safe): usado pelo `src/middleware.ts`; o `authorize` do provider Credentials faz `await import("@/lib/db")` e `await import("argon2")` **dentro** da função — o top-level do arquivo fica livre de Prisma/native modules (BLOCKER-1: PrismaClient não roda no Edge).
- **`auth.ts`** (Node): usado por server actions, services e route handler; carrega PrismaAdapter + singleton `@/lib/db`. O middleware **nunca** importa este arquivo.
- **Revogação (A3)**: sessão é JWT (strategy `jwt` — obrigatório com Credentials); o bloqueio de conta faz `tokenVersion: { increment: 1 }` no banco e `verificarSessaoValida()` rejeita o JWT cujo `tokenVersion` diverge do banco (todo 12).
- Serviços de negócio de autenticação (cadastro, login, logout, bloqueio) ficam em `src/services/auth`; rotas apenas parseiam e respondem.
- Autorização é sempre validada no servidor (RBAC) — nunca confiar no cliente (AGENTS.md §6).
- Roles e ciclo de vida do usuário (verificação, bloqueio, LGPD): `users.role`, `verificado_em`, `bloqueado` conforme [docs/modelo-de-dados.md](docs/modelo-de-dados.md) §2.1.

## Decisões tomadas

| Data | Decisão |
|---|---|
| 2026-08-12 | Auth.js/NextAuth v5 com roles no S1 (scaffold — ver AGENTS.md §10 e [docs/specs/SPEC-auth.md](docs/specs/SPEC-auth.md)) |
| 2026-08-14 | Criação da estrutura `src/lib/auth/` + README |
| 2026-08-15 | Sessão JWT + `tokenVersion` gravado no sign-in; revogação A3 via bump do tokenVersion (invalida todos os JWTs) — D16 (todo 7) |
| 2026-08-15 | Split config Edge-safe: `auth.config.ts` (lazy imports) + `auth.ts` (Node, PrismaAdapter) — D17; desbloqueou o middleware (BLOCKER-1) |
| 2026-08-15 | Augmentation do JWT via `@auth/core/jwt` (não `next-auth/jwt`, que re-exporta e não funde — TS2322) — D18 |
| 2026-08-15 | `session.maxAge=30d` + `updateAge=24h` (renovação deslizante, US-02) — D19 |
| 2026-08-15 | PrismaAdapter presente mesmo com JWT (compat futura OAuth; não invocado em runtime, MINOR-5) — D20 |
| 2026-08-15 | next-auth `5.0.0-beta.32` + `@auth/prisma-adapter@2.11.3` instalados (todo 7) — Credentials exige strategy `jwt` (UnsupportedStrategy) |

## Informações úteis

- Contrato de autenticação (US-01 a US-03, roles, rate limit): [docs/specs/SPEC-auth.md](docs/specs/SPEC-auth.md).
- Estrutura da tabela `users` (role, verificado_em, bloqueado, consentimento_lgpd_em): [docs/modelo-de-dados.md](docs/modelo-de-dados.md) §2.1.
- S1 — Fundação concluído (2026-08-15); decisões D16–D20 no notepad `.omo/notepads/s1-fundacao/decisions.md`.
- Armadilhas:
  - **Edge × Node**: o middleware só pode importar `auth.config.ts`; `auth.ts`/`index.ts`/`db.ts` quebram no Edge (BLOCKER-1).
  - **Augmentation JWT**: declarar em `@auth/core/jwt`, não em `next-auth/jwt` (não funde, TS2322).
  - **`satisfies NextAuthConfig`**: anotar o tipo explicitamente quebra o narrowing dos callbacks (todo 7).
  - **Scoped type-check**: `types.d.ts` precisa estar no include do tsconfig, senão `role`/`tokenVersion` acusam TS2339 falso (todo 12).
