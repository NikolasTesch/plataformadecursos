# src/lib/auth — Autenticação (Auth.js/NextAuth v5)

## Função

Configuração de autenticação do ConcursFoco baseada em **Auth.js (NextAuth v5)**, com suporte a **roles** (`aluno`/`admin`). Centraliza providers, callbacks de sessão e os helpers de leitura de sessão/role consumidos por `src/services/auth` e pelo `proxy` de proteção de rotas. Foi criada para habilitar o scaffold do **S1 — Fundação** (Auth.js com roles, AGENTS.md §10).

## Arquitetura

Config **split** (Edge vs Node) implementada no S1 (todo 7):

```
src/lib/auth/
├── auth.config.ts      # Edge-safe: somente callbacks/opções compartilhadas
├── auth.ts             # Node: Credentials/authorize + PrismaAdapter + JWT (30d/24h) + tokenVersion
├── index.ts            # Helpers Node-only: getSessionUser / requireRole / isAdmin (importa auth.ts)
├── verificar-sessao.ts # verificarSessaoValida(): revogação A3 em Node (bump de tokenVersion invalida JWT)
└── types.d.ts          # Augmentation de Session/User (next-auth) + JWT (@auth/core/jwt — ver decisões)
```

- **`auth.config.ts`** (Edge-safe): usado pelo `src/proxy.ts` e contém apenas callbacks/opções compartilhadas. Não possui provider, imports dinâmicos ou referências a Node/Prisma; isso evita que o bundler do proxy trace o cliente Prisma.
- **`auth.ts`** (Node): usado por server actions, services e route handler; concentra o provider Credentials/`authorize`, `argon2`, PrismaAdapter e singleton `@/lib/db`. O proxy **nunca** importa este arquivo.
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
| 2026-08-18 | Imports dinâmicos removidos da config compartilhada: Credentials/`authorize` movido integralmente para `auth.ts`, impedindo o trace de Prisma/Node no bundle Edge |
| 2026-08-15 | Augmentation do JWT via `@auth/core/jwt` (não `next-auth/jwt`, que re-exporta e não funde — TS2322) — D18 |
| 2026-08-15 | `session.maxAge=30d` + `updateAge=24h` (renovação deslizante, US-02) — D19 |
| 2026-08-15 | PrismaAdapter presente mesmo com JWT (compat futura OAuth; não invocado em runtime, MINOR-5) — D20 |
| 2026-08-15 | next-auth `5.0.0-beta.32` + `@auth/prisma-adapter@2.11.3` instalados (todo 7) — Credentials exige strategy `jwt` (UnsupportedStrategy) |

## Informações úteis

- Contrato de autenticação (US-01 a US-03, roles, rate limit): [docs/specs/SPEC-auth.md](docs/specs/SPEC-auth.md).
- Estrutura da tabela `users` (role, verificado_em, bloqueado, consentimento_lgpd_em): [docs/modelo-de-dados.md](docs/modelo-de-dados.md) §2.1.
- S1 — Fundação concluído (2026-08-15); decisões D16–D20 no notepad `.omo/notepads/s1-fundacao/decisions.md`.
- Armadilhas:
  - **Edge × Node**: o proxy só pode importar `auth.config.ts`; provider Credentials e `auth.ts`/`index.ts`/`db.ts` quebram no Edge (BLOCKER-1).
  - **Augmentation JWT**: declarar em `@auth/core/jwt`, não em `next-auth/jwt` (não funde, TS2322).
  - **`satisfies NextAuthConfig`**: anotar o tipo explicitamente quebra o narrowing dos callbacks (todo 7).
  - **Scoped type-check**: `types.d.ts` precisa estar no include do tsconfig, senão `role`/`tokenVersion` acusam TS2339 falso (todo 12).
