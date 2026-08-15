# tests/unit — Testes Unitários (Vitest)

## Função

Testes unitários da lógica de negócio com **Vitest**. Cobrem regras e cálculos isolados — em especial o motor de gating (R1–R12) e o progresso do aluno, que são obrigatórios por convenção do projeto.

## Arquitetura

- Os testes importam **`src/services/` diretamente**, sem passar por rotas ou camada HTTP.
- A organização dos arquivos espelha a dos serviços testados (`tests/unit/<dominio>.test.ts`).
- Rodam sem banco real; dependências externas são substituídas por mocks.

## Decisões tomadas

| Data | Decisão |
|---|---|
| 2026-08-14 | Vitest escolhido como runner de testes unitários, com os testes na raiz (`tests/unit/`) |

## Informações úteis

- Comando: `npm run test` (AGENTS.md §9, a definir no S1).
- Testes unitários obrigatórios para o motor de gating e progresso (AGENTS.md §6).
- Cada slice entrega seus testes unitários junto com o código do motor de regra (docs/plano-de-implementacao.md:104).
