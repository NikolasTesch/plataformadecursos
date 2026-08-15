# tests — Testes do Projeto

## Função

Concentra os testes automatizados do ConcursFoco nos dois níveis definidos pelo projeto: unitários (lógica de negócio) e end-to-end (fluxos completos no navegador).

## Arquitetura

```
tests/
├── README.md     # Este arquivo
├── unit/         # Testes unitários (Vitest) — lógica de serviços
└── e2e/          # Testes end-to-end (Playwright) — fluxos de usuário
```

- `unit/` usa **Vitest** e testa a lógica de negócio isolada.
- `e2e/` usa **Playwright** e valida fluxos completos contra a aplicação rodando.

## Decisões tomadas

| Data | Decisão |
|---|---|
| 2026-08-14 | Pasta `tests/` na raiz do repositório, com `unit/` e `e2e/` separados |

## Informações úteis

- Comandos (AGENTS.md §9, a definir no S1): `npm run test` (Vitest) e `npm run test:e2e` (Playwright).
- Testes unitários são **obrigatórios** para o motor de gating (R1–R12) e para o cálculo de progresso (AGENTS.md §6).
- Cada slice entrega testes junto com o código: testes unit do motor de regra primeiro, depois E2E (docs/plano-de-implementacao.md:104).
