# tests/e2e — Testes End-to-End (Playwright)

## Função

Testes end-to-end com **Playwright**: validam fluxos completos do usuário contra a aplicação rodando, do registro à compra e consumo de conteúdo, incluindo as regras de gating.

## Arquitetura

- Fluxos completos por slice, cobrindo os cenários críticos da spec master:
  - Registro/login (e bloqueio de conta).
  - Fluxo completo admin: criar curso → módulo → material → publicar.
  - Gating de conteúdo (E2E-1 a E2E-7).
  - Webhook de pagamento.
- Um arquivo por fluxo/slice; o cenário de referência é o §8 da [docs/SPEC.md](docs/SPEC.md) (definição de pronto).
- Config em `playwright.config.ts` na **raiz** (webServer gerencia o Next dev; `npx playwright install chromium` já executado no Windows).

Suítes existentes (S1, todos 15/16 — **2 specs verdes**):

```
tests/e2e/
├── auth.spec.ts      # fluxo registro → login → logout (seletores estáveis #login-*, #cadastro-*)
└── bloqueio.spec.ts  # E2E-A1: bloqueio revoga sessão (tokenVersion bump → verifica Node redireciona → conta suspensa)
```

- O `bloqueio.spec.ts` acessa o banco via **subprocess tsx** (helper ESM gerado em `.omo/e2e-helper/`, gitignored) — o client Prisma 7 usa `import.meta` e não carrega sob o loader CJS do Playwright (todo 16).
- O spec carrega `dotenv/config` antes de importar `@/lib/db` (Playwright não carrega .env no worker).

## Decisões tomadas

| Data | Decisão |
|---|---|
| 2026-08-14 | Playwright escolhido para E2E, com os testes na raiz (`tests/e2e/`) |
| 2026-08-15 | Playwright 1.62.1 (devDep) + `playwright.config.ts` na raiz; 1 teste por fluxo (cookies não persistem entre testes) — todo 15 |
| 2026-08-15 | Acesso ao banco a partir do spec via subprocess tsx (helper ESM relativo, executado com `execSync('npx tsx ...')`) — workaround do import.meta do client Prisma 7 — todo 16 |
| 2026-08-15 | `signOut` do E2E via POST `/api/auth/signout` com csrfToken real (`maxRedirects: 0` + validação de 302) — o botão default do signout posta para a origem (405) — todo 15 |

## Informações úteis

- Comando: `npm run test:e2e` (AGENTS.md §9).
- Exemplos E2E-1 a E2E-7 definidos na [docs/SPEC.md](docs/SPEC.md):452.
- Cada slice entrega seus testes E2E após os testes unitários do motor de regra (docs/plano-de-implementacao.md:104).
- Armadilha: ruído [WebServer] no output é pré-existente (edge-warnings do client Prisma 7 + allowedDevOrigins) — o gate é o resumo final (ex.: `2 passed`).
