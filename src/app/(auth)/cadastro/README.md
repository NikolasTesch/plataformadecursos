# src/app/(auth)/cadastro — Página de Cadastro

## Função

Página pública `/cadastro` que cria a conta do aluno (US-01, SPEC-auth.md §3.1): nome (2–120 caracteres), email (formato válido, único), senha (mín. 8, máx. 72) e aceite LGPD obrigatório. Após o registro, a sessão é criada e o usuário é redirecionado para `/app`; o email de verificação é disparado automaticamente (US-22) sem bloquear o uso da plataforma.

## Arquitetura

Rota de cadastro no group `(auth)` (SPEC-frontend.md:81): layout **auth** centralizado, card único. **Consentimento LGPD em destaque** no formulário (SPEC-frontend.md:95, SPEC-auth.md §3.1 e regra A5) — campo obrigatório, explícito. A página é fina: valida a entrada, chama `src/services/auth` (que persiste o usuário via `src/lib/db` e dispara o email de verificação via `src/lib/mail`), com proteção de `src/lib/rate-limit`.

```
page.tsx (fina) → services/auth (lógica) → lib/db (persistência) + lib/mail (verificação) + lib/rate-limit
```

- Senhas: hash argon2id, nunca logadas ou retornadas (regra A1).
- Email duplicado: mensagem amigável, sem revelar existência da conta em fluxos de recuperação (SPEC-auth.md:32).

## Decisões tomadas

| Data | Decisão |
|---|---|
| 2026-08-14 | Rota documentada antes do código, conforme fluxo SDD (AGENTS.md §2) |
| 2026-08-14 | Rate limit de registro no serviço: 10/hora por IP (SPEC-auth.md:38, regra A4) |
| 2026-08-14 | Consentimento LGPD obrigatório e em destaque no cadastro (regra A5) — decisão já vigente na spec aprovada |

## Informações úteis

- [docs/specs/SPEC-frontend.md](docs/specs/SPEC-frontend.md) §4.1 (linha 81) — rota `/cadastro` com layout auth; §4.2 (linha 95) — consentimento LGPD em destaque
- [docs/specs/SPEC-auth.md](docs/specs/SPEC-auth.md) §3.1 (registro, US-01) e regras A1, A4, A5 (linhas 31-34, 64-68)
- [docs/SPEC.md](docs/SPEC.md) — US-01 (registro) e US-22 (verificação de email disparada no cadastro) na spec master
- [docs/modelo-de-dados.md](docs/modelo-de-dados.md) §2.1 — tabelas do domínio de autenticação
- [docs/plano-de-implementacao.md](docs/plano-de-implementacao.md) — auth no slice S1
- [AGENTS.md](AGENTS.md) §6 — rotas finas; lógica de negócio em `src/services/`
