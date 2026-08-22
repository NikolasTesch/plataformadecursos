# src/services/questoes — Questões e modos de resposta

## Função

Regras de negócio para questões em blocos por material. `questoes.ts` cobre o CRUD administrativo (S4.1), `resposta.ts` a resposta do aluno (S4.2), `erros.ts` o banco de erros (S4.3), `favoritas.ts` as favoritas do aluno (S4.4) e `modo.ts` os modos estudo/prova (S4.5).

## Arquitetura

- `questoes.ts` consome `src/lib/db`, valida o vínculo `materials.tipo = questoes`, sanitiza comentário com `src/lib/sanitize` e persiste em `questions`. As actions de `admin/materiais` autorizam e fazem o parse.
- `resposta.ts` reavalia o gating S3 antes de ler o gabarito ou criar `attempts`; o feedback só é produzido depois da gravação. A taxa usa todo o histórico do usuário no material.
- `erros.ts` lê o histórico filtrado por `user_id`, mantém a questão até dois acertos consecutivos e delega novas respostas a `resposta.ts`. Quando os vínculos existem, expõe curso e disciplina via `materials.material_edital`; a sugestão de flashcard apenas emite uma intenção para S7.
- `favoritas.ts` valida questão, material e gating server-side antes de marcar; usa a chave composta de `favorites` para upsert idempotente e `deleteMany` para desmarcação tolerante. A listagem é filtrada por `user_id` e não lê nem altera `attempts`/banco de erros.
- `modo.ts` mantém sessões de prova ad-hoc apenas em memória, valida gating ao iniciar, não devolve gabaritos durante a prova e cria uma tentativa por questão somente na entrega. O modo estudo é um alias do feedback imediato de `resposta.ts`. Q2 não implementa cronômetro nem simulado persistente; esses limites ficam para S7.
- Alternativas ficam em `jsonb` na ordem recebida (D-S4-1/D-Q1); o gabarito é uma única letra existente.

## Decisões tomadas

| Data | Decisão |
|---|---|
| 2026-08-12 | **Gabarito oculto** no modo prova: feedback e gabarito só aparecem após a resposta; simulados mostram resultado só na entrega (Q1/Q2, SPEC-questoes.md:48-49) |
| 2026-08-12 | **Histórico completo** por aluno: `attempts` guardam cada tentativa (alternativa escolhida + acerto), base de banco de erros e relatório semanal (Q3) |
| 2026-08-12 | Modo prova entrega automaticamente no fim do tempo (Q2); modo estudo dá feedback imediato por questão |
| 2026-08-14 | Pasta `questoes` em pt-BR espelha o domínio `SPEC-questoes.md`; dados em tabelas `questions`/`attempts`/`favorites`/`simulado_attempts` (inglês snake_case) |
| 2026-08-18 | S4.1 limitado ao CRUD administrativo, sem migration e sem funcionalidades de aluno (D-S4-2..4) |
| 2026-08-18 | S4.2 registra tentativas cumulativas e nunca expõe gabarito antes da resposta; bloqueio falha fechado |
| 2026-08-18 | S4.3 calcula o banco a partir do histórico por usuário; sem migration, favoritas ou criação persistente de flashcards |
| 2026-08-18 | S4.4 mantém favoritas independentes de tentativas/erros, com isolamento por usuário e gating reaproveitado |
| 2026-08-18 | S4.5 usa sessão transitória, sem `simulados`/`simulado_attempts`, e corrige inclusive não respondidas na entrega |
| 2026-08-19 | S4 concluído e aprovado após gate técnico e QA manual integrado F1–F4; simulados/flashcards persistentes ficam no S7, vídeo no S5 e pagamentos no S6 |

## Informações úteis

- Spec de referência: [docs/specs/SPEC-questoes.md](docs/specs/SPEC-questoes.md) (US-08, US-13, US-27, US-37, US-38, US-39; regras Q1-Q3, D-Q1).
- Modelo de dados: [docs/modelo-de-dados.md](docs/modelo-de-dados.md) §2.3.
- Slice: S4.1–S4.5 — inclui estudo/prova; testes unitários cobrem Q8, além de Q6/Q7 e resposta.
- Alternativas com ordem fixa (D-Q1): o banco não embaralha as alternativas armazenadas.
