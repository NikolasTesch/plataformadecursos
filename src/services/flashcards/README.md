# src/services/flashcards — Revisão Espaçada (SM-2)

## Função

Regras de negócio do domínio de flashcards e revisão espaçada (US-26): criação de cartões, agendamento de revisões pelo algoritmo SM-2 simplificado (F1), reinício do nível em erro (F2), sugestão de cartão a partir de questão errada com confirmação do aluno (F3) e privacidade dos cartões (F4). Implementa as regras F1-F4 da SPEC-flashcards.md.

## Arquitetura

- Serviços aqui consomem `src/lib/db` (Prisma); as rotas `app/flashcards` (área do aluno) chamam estes serviços.
- Dados na tabela `flashcards` (modelo-de-dados.md §2.8): `user_id` fk (cascade), `material_id` fk null, `question_id` fk null (origem de sugestão de questão errada), `pergunta`, `resposta`, `nivel` int 0-5, `proxima_revisao` date, `revisoes` int.
- Agendamento: a cada resposta o serviço calcula o próximo nível (acerto sobe, erro volta a 0 — F2) e atualiza `proxima_revisao` com o intervalo do nível; a fila do dia é a lista de cartões com `proxima_revisao <= hoje`.
- A sugestão automática a partir de questão errada não cria o cartão: gera um pré-cartão e exige confirmação do aluno (F3).

## Decisões tomadas

| Data | Decisão |
|---|---|
| 2026-08-12 | Intervalos SM-2 simplificado fixos por nível: 0→1, 1→3, 2→7, 3→16, 4→35, 5→90 dias (F1; D-F1 — sem fator de facilidade dinâmico do SM-2 completo) |
| 2026-08-12 | Erro reinicia o nível para 0, agendando a revisão em 1 dia (F2) |
| 2026-08-12 | Sugestão de cartão de questão errada exige confirmação do aluno, não é criada automaticamente (F3) |
| 2026-08-12 | Cartões são privados do aluno e entram na exportação LGPD (F4) |
| 2026-08-14 | Pasta `flashcards` em pt-BR espelha o domínio `SPEC-flashcards.md`; dados na tabela `flashcards` (inglês snake_case) |

## Informações úteis

- Spec de referência: [docs/specs/SPEC-flashcards.md](docs/specs/SPEC-flashcards.md) (US-26; regras F1-F4).
- Modelo de dados: [docs/modelo-de-dados.md](docs/modelo-de-dados.md) §2.8.
- Slice: S7 — Expansão ([docs/plano-de-implementacao.md](docs/plano-de-implementacao.md):81-88), incluindo testes unitários F1/F2 (intervalos SM-2) e E2E-F1..F3.
- Decisão da revisão de pendências: relatório semanal (N5/US-36) foi removido do escopo — ver [docs/specs/STATUS-APROVACAO.md](docs/specs/STATUS-APROVACAO.md):28.
- Rota da área do aluno que consome o serviço: `app/flashcards`.
