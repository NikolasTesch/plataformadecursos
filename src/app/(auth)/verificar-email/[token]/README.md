# src/app/(auth)/verificar-email/[token] — Verificação de Email

## Função

Página pública `/verificar-email/[token]` que confirma o email do aluno (US-22, SPEC-auth.md §3.4 e SPEC.md:231-235). O token é único, tem validade de **24h** e só pode ser usado **uma vez**; é armazenado com hash. Ao verificar: o badge "não verificado" é removido e as notificações transacionais são habilitadas. A UI oferece o botão "reenviar", com rate limit de no máximo 3 reenvios/dia por conta.

## Arquitetura

Rota dinâmica no group `(auth)`, com layout **auth** centralizado. `[token]` é o segmento dinâmico que recebe o token do link do email. A página é fina: valida e consome o token via `src/services/auth` (que usa `src/lib/db` para buscar o hash armazenado e `src/lib/rate-limit` para controlar reenvios).

```
page.tsx (fina) → services/auth (consumir/validar token) → lib/db (hash) + lib/rate-limit (reenvio 3/dia)
```

- Token com hash no banco, expira em 24h, 1 uso (regra A2, SPEC-auth.md:49).
- Conta não verificada: acesso ao conteúdo permitido, badge "não verificado" (SPEC.md:235); após 90 dias sem verificação, aviso no login sem bloquear (SPEC-auth.md:52).
- Reenvio: máx. 3/dia por conta; botão "reenviar" na UI (SPEC-auth.md:50, regra A4).

## Decisões tomadas

| Data | Decisão |
|---|---|
| 2026-08-14 | Rota documentada antes do código, conforme fluxo SDD (AGENTS.md §2) |
| 2026-08-14 | Rota dinâmica `verificar-email/[token]` criada antes do código (convenção 2026-08-14 do plano de estrutura) |
| 2026-08-14 | Rota distinta de `/verificar/[codigo]` (certificado público, US-29) — verificação de email não é certificado |

## Informações úteis

- [docs/specs/SPEC-auth.md](docs/specs/SPEC-auth.md) §3.4 (linhas 48-52) — token 24h 1 uso, reenvio 3/dia, badge e aviso de 90 dias; regras A2 e A4
- [docs/SPEC.md](docs/SPEC.md) §US-22 (linhas 231-235) — verificação de email na spec master
- [docs/specs/SPEC-frontend.md](docs/specs/SPEC-frontend.md) §4.1 (linha 81) — grupo de rotas auth; §4.2 (linha 95) — layout auth
- [docs/modelo-de-dados.md](docs/modelo-de-dados.md) §2.1 — tabelas do domínio de autenticação
- [docs/plano-de-implementacao.md](docs/plano-de-implementacao.md) — auth no slice S1 (verificação) e S8 (notificações)
- [AGENTS.md](AGENTS.md) §6 — rotas finas; lógica de negócio em `src/services/`
