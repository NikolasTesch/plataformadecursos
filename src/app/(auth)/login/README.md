# src/app/(auth)/login — Página de Login

## Função

Página pública `/login` que autentica o usuário por email + senha (US-02, SPEC-auth.md §3.2). Ao autenticar, cria a sessão e redireciona para a área do aluno (`/app`) ou para o painel administrativo (`/admin`), conforme o papel. Erros usam mensagem genérica para credenciais inválidas — nunca revela se o email existe.

## Arquitetura

Rota de login no group `(auth)` (SPEC-frontend.md:81): layout **auth** centralizado, card único — **implementada no S1** (todo 13) como rota fina:

```
src/app/(auth)/login/
├── page.tsx        # Server Component: renderiza o form; redireciona se já logado
├── actions.ts      # Server Action "use server": headers() (IP) → services/auth → signIn("credentials")
└── login-form.tsx  # Client Component: useActionState + EstadoLogin serializável + seletores estáveis
```

Padrão do fluxo: **server action → service → signIn** — a action lê o IP (`await headers()` no Next 16), chama `login()` de `src/services/auth` (rate limit + credenciais) e, em sucesso, `signIn("credentials", { email, password, redirectTo: "/app", redirect: false })`; o authorize do Credentials recebe o body bruto e o auth.config lê `c.email`/`c.password`. Erros do `ErroAuth` viram estado serializável `{ code, mensagem, campo?, retryAfter? }` do `useActionState` — a UI só renderiza (servidor é autoritativo).

- Sessão: cookie **httpOnly** + SameSite=Lax, duração 30 dias com renovação deslizante (SPEC-auth.md:39).
- Logout: revoga a sessão no servidor e limpa o cookie (SPEC-auth.md:40) — `logout.ts` em services/auth.
- Conta bloqueada: login negado com "conta suspensa", sem detalhar o motivo (SPEC-auth.md:41) — `ErroAuth` code `conta_suspensa`.
- Rate limit: `check()` antes do argon2; bloqueado → `rate_limit` com `retryAfter` (MAJOR-3).

## Decisões tomadas

| Data | Decisão |
|---|---|
| 2026-08-14 | Rota documentada antes do código, conforme fluxo SDD (AGENTS.md §2) |
| 2026-08-14 | Rate limit de login aplicado no serviço, não na UI: 5 tentativas falhas/min por IP+email, com bloqueio temporário de 15 min acima disso (SPEC-auth.md:38, regra A4) |
| 2026-08-14 | Sessão em cookie httpOnly + SameSite=Lax (SPEC-auth.md:39) — nunca confiar em estado do cliente para autorização (R7) |
| 2026-08-15 | Página implementada (todo 13): server action → `services/auth` → `signIn`; `redirect: false` com redirect explícito para controle do fluxo |
| 2026-08-15 | PLAIN forms + `useActionState` (sem react-hook-form/zod): servidor autoritativo, zero deps novas, `pending` nativo — forms + shadcn completos entram no slice de frontend |
| 2026-08-15 | Seletores estáveis para E2E: `#login-email`, `#login-senha`; erros com `role="alert"` + `aria-describedby` |

## Informações úteis

- [docs/specs/SPEC-frontend.md](docs/specs/SPEC-frontend.md) §4.1 (linha 81) — rota `/login` com layout auth
- [docs/specs/SPEC-auth.md](docs/specs/SPEC-auth.md) §3.2 (linhas 38-40) — rate limit 5/min, sessão httpOnly, logout, conta bloqueada; regra A4
- [docs/SPEC.md](docs/SPEC.md) — US-02 (login e sessão) na spec master
- [docs/modelo-de-dados.md](docs/modelo-de-dados.md) §2.1 — tabelas do domínio de autenticação
- [docs/plano-de-implementacao.md](docs/plano-de-implementacao.md) — auth no slice S1
- [AGENTS.md](AGENTS.md) §6 — autorização sempre validada no servidor (RBAC)
- E2E: `tests/e2e/auth.spec.ts` cobre o fluxo registro→login→logout com estes seletores.
- Armadilha: `signIn` exige a chave `password` no body (o pt-BR `senha` é mapeado na action); erro de authorize = `CredentialsSignin` capturado no catch da action (todo 13).
