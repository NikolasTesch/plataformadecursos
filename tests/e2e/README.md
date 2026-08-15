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

## Decisões tomadas

| Data | Decisão |
|---|---|
| 2026-08-14 | Playwright escolhido para E2E, com os testes na raiz (`tests/e2e/`) |

## Informações úteis

- Comando: `npm run test:e2e` (AGENTS.md §9, a definir no S1).
- Exemplos E2E-1 a E2E-7 definidos na [docs/SPEC.md](docs/SPEC.md):452.
- Cada slice entrega seus testes E2E após os testes unitários do motor de regra (docs/plano-de-implementacao.md:104).
