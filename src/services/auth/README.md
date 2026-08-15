# src/services/auth — Autenticação, Sessão e Usuários

## Função

Regras de negócio do domínio de autenticação e gestão de usuários: registro (US-01), login/sessão (US-02), bloqueio e gestão de contas pelo admin (US-20), verificação de email (US-22) e exportação/exclusão de dados LGPD (US-24). Implementa as regras A1-A5 da SPEC-auth.md, incluindo rate limits (A4).

## Arquitetura

- Serviços aqui consomem `src/lib/auth` (Auth.js com roles — S1) e `src/lib/rate-limit` (A4); as rotas `(auth)/login`, `(auth)/cadastro`, `(auth)/verificar-email/[token]` e `src/app/api/auth/[...nextauth]` chamam estes serviços.
- Dados em `users` e `verification_tokens` (modelo-de-dados.md §2.1): senha apenas como `senha_hash` (argon2id, A1), token de verificação com hash, 1 uso e expiração em 24h (A2), sessões revogáveis (A3), consentimento LGPD registrado (A5).
- Bloqueio de conta (US-20) revoga todas as sessões do usuário (A3) — validado no servidor em toda requisição protegida.

## Decisões tomadas

| Data | Decisão |
|---|---|
| 2026-08-12 | Senhas armazenadas com hash forte (argon2id), nunca logadas nem retornadas (A1, SPEC-auth.md:64) |
| 2026-08-12 | Tokens de verificação com 1 uso, expiração em 24h e armazenamento com hash (A2, SPEC-auth.md:65) |
| 2026-08-12 | Rate limits por endpoint: login 5/min, reenvio de verificação 3/dia, registro 10/hora por IP (A4, SPEC-auth.md:67) |
| 2026-08-14 | Pasta `auth` em pt-BR espelha o domínio `SPEC-auth.md`; dados em tabelas `users`/`verification_tokens` (inglês snake_case) |

## Informações úteis

- Spec de referência: [docs/specs/SPEC-auth.md](docs/specs/SPEC-auth.md) (US-01, US-02, US-20, US-22, US-24; regras A1-A5).
- Modelo de dados: [docs/modelo-de-dados.md](docs/modelo-de-dados.md) §2.1.
- Slices: S1 — Fundação (scaffold, Auth.js com roles, registro/login, seed) e S8 (US-22 verificação de email, US-24 LGPD).
- Rota de convenção do Auth.js: `src/app/api/auth/[...nextauth]` (AGENTS.md §10 — scaffold S1 com "Auth.js com roles").
- Exclusão LGPD (US-24) anonimiza compras, não apaga o histórico financeiro (A5, SPEC-auth.md:68).
