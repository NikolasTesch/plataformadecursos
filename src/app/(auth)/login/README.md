# src/app/(auth)/login — Página de Login

## Função

Página pública `/login` que autentica o usuário por email + senha (US-02, SPEC-auth.md §3.2). Ao autenticar, cria a sessão e redireciona para a área do aluno (`/app`) ou para o painel administrativo (`/admin`), conforme o papel. Erros usam mensagem genérica para credenciais inválidas — nunca revela se o email existe.

## Arquitetura

Rota de login no group `(auth)` (SPEC-frontend.md:81): layout **auth** centralizado, card único. A página é fina: valida a entrada, chama o service de autenticação em `src/services/auth`, que consulta `src/lib/auth` (sessão) e `src/lib/rate-limit`.

```
page.tsx (fina) → services/auth (lógica) → lib/auth (sessão) + lib/rate-limit (proteção)
```

- Sessão: cookie **httpOnly** + SameSite=Lax, duração 30 dias com renovação deslizante (SPEC-auth.md:39).
- Logout: revoga a sessão no servidor e limpa o cookie (SPEC-auth.md:40).
- Conta bloqueada: login negado com "conta suspensa", sem detalhar o motivo (SPEC-auth.md:41).

## Decisões tomadas

| Data | Decisão |
|---|---|
| 2026-08-14 | Rota documentada antes do código, conforme fluxo SDD (AGENTS.md §2) |
| 2026-08-14 | Rate limit de login aplicado no serviço, não na UI: 5 tentativas falhas/min por IP+email, com bloqueio temporário de 15 min acima disso (SPEC-auth.md:38, regra A4) |
| 2026-08-14 | Sessão em cookie httpOnly + SameSite=Lax (SPEC-auth.md:39) — nunca confiar em estado do cliente para autorização (R7) |

## Informações úteis

- [docs/specs/SPEC-frontend.md](docs/specs/SPEC-frontend.md) §4.1 (linha 81) — rota `/login` com layout auth
- [docs/specs/SPEC-auth.md](docs/specs/SPEC-auth.md) §3.2 (linhas 38-40) — rate limit 5/min, sessão httpOnly, logout, conta bloqueada; regra A4
- [docs/SPEC.md](docs/SPEC.md) — US-02 (login e sessão) na spec master
- [docs/modelo-de-dados.md](docs/modelo-de-dados.md) §2.1 — tabelas do domínio de autenticação
- [docs/plano-de-implementacao.md](docs/plano-de-implementacao.md) — auth no slice S1
- [AGENTS.md](AGENTS.md) §6 — autorização sempre validada no servidor (RBAC)
