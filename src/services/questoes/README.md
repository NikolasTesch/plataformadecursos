# src/services/questoes — Questões e Simulados

## Função

Regras de negócio do domínio de questões e simulados: CRUD de questões em blocos por material (US-08), resposta com feedback e banco de erros (US-13, US-37), favoritas (US-38), modo prova vs estudo (US-39) e simulados cronometrados com entrega automática (US-27). Implementa as regras Q1-Q3 e D-Q1 da SPEC-questoes.md.

## Arquitetura

- Serviços aqui consomem `src/lib/db`; rotas `admin/materiais` (CRUD de questões), `app/questoes`, `app/simulados` e `app/simulados/[id]` chamam estes serviços.
- Dados em `questions`, `attempts`, `favorites` e `simulado_attempts` (modelo-de-dados.md §2.3): alternativas em `jsonb` com ordem fixa (D-Q1), `gabarito` como letra, `attempts` como base do banco de erros e do relatório semanal.
- Simulado é entidade própria (`simulados` + `simulado_questions`), não um tipo de material (Q4, modelo-de-dados.md:94) — gating segue o vínculo `curso_id` (R1-R12).

## Decisões tomadas

| Data | Decisão |
|---|---|
| 2026-08-12 | **Gabarito oculto** no modo prova: feedback e gabarito só aparecem após a resposta; simulados mostram resultado só na entrega (Q1/Q2, SPEC-questoes.md:48-49) |
| 2026-08-12 | **Histórico completo** por aluno: `attempts` guardam cada tentativa (alternativa escolhida + acerto), base de banco de erros e relatório semanal (Q3) |
| 2026-08-12 | Modo prova entrega automaticamente no fim do tempo (Q2); modo estudo dá feedback imediato por questão |
| 2026-08-14 | Pasta `questoes` em pt-BR espelha o domínio `SPEC-questoes.md`; dados em tabelas `questions`/`attempts`/`favorites`/`simulado_attempts` (inglês snake_case) |

## Informações úteis

- Spec de referência: [docs/specs/SPEC-questoes.md](docs/specs/SPEC-questoes.md) (US-08, US-13, US-27, US-37, US-38, US-39; regras Q1-Q3, D-Q1).
- Modelo de dados: [docs/modelo-de-dados.md](docs/modelo-de-dados.md) §2.3.
- Slices: S4 — Questões (CRUD, feedback, taxa de acerto, banco de erros, favoritas, modo prova/estudo) e S7 — simulados cronometrados com entrega automática e histórico (plano-de-implementacao.md:54-61, :81-88).
- Testes: unit de Q1 (gabarito oculto) e Q3 (histórico); E2E-Q1 (modo prova).
- Alternativas com ordem fixa (D-Q1): o banco não embaralha as alternativas armazenadas.
