# src/services/auth — Autenticação, Sessão e Usuários

## Função

Regras de negócio do domínio de autenticação e gestão de usuários: registro (US-01), login/sessão (US-02), bloqueio e gestão de contas pelo admin (US-20), verificação de email (US-22) e exportação/exclusão de dados LGPD (US-24). Implementa as regras A1-A5 da SPEC-auth.md, incluindo rate limits (A4).

## Arquitetura

Serviços implementados no S1 (todos 10/11/12), cada um com suíte de testes unitários (TDD):

```
src/services/auth/
├── erros.ts       # ErroAuth: { code, mensagem, campo?, retryAfter? } — convenção única (D27); alias AuthErro
├── registrar.ts   # US-01: validações puras → findUnique → argon2.hash → create (D29–D31)
├── login.ts       # US-02: rate-limit check → findUnique → argon2.verify → projeção sanitizada (D33–D36)
├── logout.ts      # signOut + redirect pós-logout (fluxo do E2E)
├── bloqueio.ts    # US-20: setBloqueado com bump de tokenVersion (revoga sessões, A3) + self-block (D28–D31)
└── README.md
```

- Serviços consomem `src/lib/auth` (Auth.js v5 split + helpers Node-only), `src/lib/db.ts` (singleton) e `src/lib/rate-limit` (A4); as rotas `(auth)/login`, `(auth)/cadastro` e `src/app/api/auth/[...nextauth]` chamam estes serviços.
- **`ErroAuth`** é o shape serializável de erro: `code` discriminante (validacao, credenciais_invalidas, conta_suspensa, rate_limit, self_block) + `mensagem` pt-BR + `campo?`/`retryAfter?` — rotas/UI renderizam o estado do `useActionState` sem lógica (D27).
- **Rate limit no serviço**: `login.ts` chama `check()` ANTES do `findUnique`/`argon2` (bloqueado → `rate_limit` com `retryAfter`); `record()` só nas falhas reais (D33); conta suspensa não registra falha.
- **Login retorna projeção sanitizada** (`UsuarioLogin`: id/nome/email/role/verificado_em/bloqueado/tokenVersion) — `senha_hash` nunca sai do banco (A1, D35).
- Dados em `users` (modelo-de-dados.md §2.1): senha apenas como `senha_hash` (argon2id, A1); bloqueio (US-20) revoga todas as sessões via `tokenVersion` (A3) — validado no servidor por `verificarSessaoValida()` em Node.

## Decisões tomadas

| Data | Decisão |
|---|---|
| 2026-08-12 | Senhas armazenadas com hash forte (argon2id), nunca logadas nem retornadas (A1, SPEC-auth.md:64) |
| 2026-08-12 | Tokens de verificação com 1 uso, expiração em 24h e armazenamento com hash (A2, SPEC-auth.md:65) |
| 2026-08-12 | Rate limits por endpoint: login 5/min, reenvio de verificação 3/dia, registro 10/hora por IP (A4, SPEC-auth.md:67) |
| 2026-08-14 | Pasta `auth` em pt-BR espelha o domínio `SPEC-auth.md`; dados em tabelas `users`/`verification_tokens` (inglês snake_case) |
| 2026-08-15 | `erros.ts`: `ErroAuth` compartilhado (code/mensagem/campo?/retryAfter?) — convenção única para registrar/login/bloqueio (D27) |
| 2026-08-15 | `registrar.ts` (US-01): validações puras → unicidade → argon2 → create; duplicata nunca hasheia (D29–D31) |
| 2026-08-15 | `login.ts` (US-02): rate-limit check antes do hash (record-on-failure), erro genérico sem leak de existência, projeção sanitizada (D33–D36) |
| 2026-08-15 | `bloqueio.ts` (US-20): `setBloqueado` bump `tokenVersion` + self-block `self_block`; `logout.ts` via signOut (D28–D31) |

## Informações úteis

- Spec de referência: [docs/specs/SPEC-auth.md](docs/specs/SPEC-auth.md) (US-01, US-02, US-20, US-22, US-24; regras A1-A5).
- Modelo de dados: [docs/modelo-de-dados.md](docs/modelo-de-dados.md) §2.1.
- Slices: S1 — Fundação concluído (2026-08-15): registrar/login/logout/bloqueio + erros implementados; S8 (US-22 verificação de email, US-24 LGPD).
- Rota de convenção do Auth.js: `src/app/api/auth/[...nextauth]` (AGENTS.md §10 — scaffold S1 com "Auth.js com roles").
- Exclusão LGPD (US-24) anonimiza compras, não apaga o histórico financeiro (A5, SPEC-auth.md:68).
- Testes: `tests/unit/services-auth-*.test.ts` (registrar 12, login 7, bloqueio 11 — TDD com `vi.mock` de `@/lib/db`/argon2; sem banco real).
- Armadilhas: `Error.message` é não-enumerável — `ErroAuth` declara `mensagem` como campo próprio (serializável p/ `useActionState`); `vi.fn<T>` preserva `.mock` (tipar via forma genérica).
