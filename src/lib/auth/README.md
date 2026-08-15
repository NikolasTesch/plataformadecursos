# src/lib/auth — Autenticação (Auth.js/NextAuth v5)

## Função

Configuração de autenticação do ConcursFoco baseada em **Auth.js (NextAuth v5)**, com suporte a **roles** (`aluno`/`admin`). Centraliza providers, callbacks de sessão e os helpers de leitura de sessão/role consumidos por `src/services/auth` e pelo `middleware` de proteção de rotas. Foi criada para habilitar o scaffold do **S1 — Fundação** (Auth.js com roles, AGENTS.md §10).

## Arquitetura

- `src/lib/auth` detém a config do NextAuth (providers, session strategy, callbacks) e expõe helpers tipados (ex.: obter sessão atual, verificar role) para `src/services/auth` e `src/middleware.ts`.
- Serviços de negócio de autenticação (cadastro, login, verificação de e-mail, bloqueio) ficam em `src/services/auth` e usam estes helpers; rotas apenas parseiam e respondem.
- Autorização é sempre validada no servidor (RBAC) — nunca confiar no cliente (AGENTS.md §6).
- Roles e ciclo de vida do usuário (verificação, bloqueio, LGPD): `users.role`, `verificado_em`, `bloqueado` conforme [docs/modelo-de-dados.md](docs/modelo-de-dados.md) §2.1.

## Decisões tomadas

| Data | Decisão |
|---|---|
| 2026-08-12 | Auth.js/NextAuth v5 com roles no S1 (scaffold — ver AGENTS.md §10 e [docs/specs/SPEC-auth.md](docs/specs/SPEC-auth.md)) |
| 2026-08-14 | Criação da estrutura `src/lib/auth/` + README |

## Informações úteis

- Contrato de autenticação (US-01 a US-03, roles, rate limit): [docs/specs/SPEC-auth.md](docs/specs/SPEC-auth.md).
- Estrutura da tabela `users` (role, verificado_em, bloqueado, consentimento_lgpd_em): [docs/modelo-de-dados.md](docs/modelo-de-dados.md) §2.1.
- S1 — Fundação (Auth.js com roles, seed, lint/test): AGENTS.md §10 (estado atual do projeto).
- Armadilha: helpers de sessão/role servem também o `middleware` de proteção de rotas por role (SPEC-frontend.md:89) — manter as duas leituras coerentes.
