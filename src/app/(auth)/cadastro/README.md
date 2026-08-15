# src/app/(auth)/cadastro — Página de Cadastro

## Função

Página pública `/cadastro` que cria a conta do aluno (US-01, SPEC-auth.md §3.1): nome (2–120 caracteres), email (formato válido, único), senha (mín. 8, máx. 72) e aceite LGPD obrigatório. Após o registro, a sessão é criada e o usuário é redirecionado para `/app`; o email de verificação é disparado automaticamente (US-22) sem bloquear o uso da plataforma.

## Arquitetura

Rota de cadastro no group `(auth)` (SPEC-frontend.md:81): layout **auth** centralizado, card único — **implementada no S1** (todo 13) como rota fina:

```
src/app/(auth)/cadastro/
├── page.tsx           # Server Component: renderiza o form
├── actions.ts         # Server Action "use server": headers() (IP) → services/auth → signIn
└── cadastro-form.tsx  # Client Component: useActionState + EstadoCadastro + seletores estáveis
```

Padrão do fluxo: **server action → service → signIn** — a action chama `registrar()` de `src/services/auth` (validações → unicidade → argon2 → create) e, em sucesso, `signIn("credentials")` com redirect para `/app`. Erros `ErroAuth` (code `validacao` com `campo` "email", etc.) viram estado serializável do `useActionState`. **Consentimento LGPD em destaque** no formulário (SPEC-frontend.md:95, SPEC-auth.md §3.1 e regra A5) — campo obrigatório, explícito.

- Senhas: hash argon2id, nunca logadas ou retornadas (regra A1).
- Email duplicado: `ErroAuth` code `validacao`/campo `email` — o registro é o único fluxo que legitima a revelação (SPEC-auth.md:32).
- Rate limit de registro: 10/hora por IP (`registroLimiter`, A4).
- IP em server action: `await headers()` (async no Next 16), `x-forwarded-for` primeiro valor ou `'unknown'`.

## Decisões tomadas

| Data | Decisão |
|---|---|
| 2026-08-14 | Rota documentada antes do código, conforme fluxo SDD (AGENTS.md §2) |
| 2026-08-14 | Rate limit de registro no serviço: 10/hora por IP (SPEC-auth.md:38, regra A4) |
| 2026-08-14 | Consentimento LGPD obrigatório e em destaque no cadastro (regra A5) — decisão já vigente na spec aprovada |
| 2026-08-15 | Página implementada (todo 13): server action → `services/auth` → `signIn`; mesmo padrão de forms do login (PLAIN + `useActionState`) |
| 2026-08-15 | Seletores estáveis para E2E: `#cadastro-nome`, `#cadastro-email`, `#cadastro-senha`, `#cadastro-lgpd` |

## Informações úteis

- [docs/specs/SPEC-frontend.md](docs/specs/SPEC-frontend.md) §4.1 (linha 81) — rota `/cadastro` com layout auth; §4.2 (linha 95) — consentimento LGPD em destaque
- [docs/specs/SPEC-auth.md](docs/specs/SPEC-auth.md) §3.1 (registro, US-01) e regras A1, A4, A5 (linhas 31-34, 64-68)
- [docs/SPEC.md](docs/SPEC.md) — US-01 (registro) e US-22 (verificação de email disparada no cadastro) na spec master
- [docs/modelo-de-dados.md](docs/modelo-de-dados.md) §2.1 — tabelas do domínio de autenticação
- [docs/plano-de-implementacao.md](docs/plano-de-implementacao.md) — auth no slice S1
- [AGENTS.md](AGENTS.md) §6 — rotas finas; lógica de negócio em `src/services/`
- E2E: `tests/e2e/auth.spec.ts` cobre registro→login→logout com estes seletores.
- NOTA (S1): o email de verificação (US-22) **não é disparado no cadastro ainda** — o registro cria a sessão e redireciona para `/app`; o disparo entra no S8.
