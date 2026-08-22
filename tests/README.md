# tests — Testes do Projeto

## Função

Concentra os testes automatizados do ConcursFoco nos dois níveis definidos pelo projeto: unitários (lógica de negócio) e end-to-end (fluxos completos no navegador).

## Arquitetura

```
tests/
├── README.md        # Este arquivo
├── unit/            # Testes unitários (Vitest) — lógica de serviços (mocks)
├── integration/     # Testes de integração (Vitest) — PostgreSQL REAL (S6.1)
└── e2e/             # Testes end-to-end (Playwright) — fluxos de usuário
```

- `unit/` usa **Vitest** e testa a lógica de negócio isolada (transação fake,
  sem banco real).
- `integration/` usa **Vitest** e exercita o domínio de pagamentos contra um
  PostgreSQL real de **TESTE isolado** (`npm run test:pg`) — prova locks
  `FOR UPDATE`, índices parciais únicos, CHECKs e cascade que mocks não cobrem.
  Exige `TEST_DATABASE_URL` apontando a um banco cujo nome contenha `_test`
  (nunca o banco de aplicação/produção); a config valida isso antes de qualquer
  SQL. Ver `integration/README.md`.
- `e2e/` usa **Playwright** e valida fluxos completos contra a aplicação rodando.

## Decisões tomadas

| Data | Decisão |
|---|---|
| 2026-08-14 | Pasta `tests/` na raiz do repositório, com `unit/` e `e2e/` separados |
| 2026-08-15 | S1 com suítes reais: 71 testes unitários (Vitest 4, `vitest.config.ts` na raiz) + 2 specs E2E (Playwright, `playwright.config.ts` na raiz) |
| 2026-08-19 | S4 concluído/aprovado e S5 com cobertura E2E simulada V1–V4: 341 testes unitários e 27 cenários E2E; gate técnico e QA manual integrado F1–F4 aprovados. O gate específico do S3 ainda tem a pendência residual registrada em `docs/specs/STATUS-APROVACAO.md`. |
| 2026-08-19 | S6.1 ganha suíte de integração PostgreSQL real em `tests/integration/` (`npm run test:pg`): prova retry concorrente ≤4, renovações simultâneas sem perda de período, concessão concorrente de 1 entitlement, registro+aprovação 30/365 dias, refund divergente e invariantes de schema (unique parcial/CHECKs/cascade). |

## Informações úteis

- Comandos (AGENTS.md §9, definidos no S1): `npm run test` (Vitest) e `npm run test:e2e` (Playwright).
- Testes unitários são **obrigatórios** para o motor de gating (R1–R12) e para o cálculo de progresso (AGENTS.md §6).
- Cada slice entrega testes junto com o código: testes unit do motor de regra primeiro, depois E2E ([docs/plano-de-implementacao.md](docs/plano-de-implementacao.md):104).
- A cobertura de vídeo fica em `tests/e2e/video.spec.ts`: V1 bloqueia publicação/status
  incompleto, V2 simula Player.js e retomada, V3 simula conclusão em 95% e V4 verifica
  que aluno sem entitlement não recebe embed/URL.
- Exemplos E2E da spec master (E2E-1..7) que o Playwright deve cobrir: [docs/SPEC.md](docs/SPEC.md):452.
