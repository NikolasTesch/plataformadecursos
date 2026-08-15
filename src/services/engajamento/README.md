# src/services/engajamento — Streak e Meta Diária de Estudo

## Função

Regras de negócio do domínio de engajamento (US-35): streak de dias consecutivos de estudo e meta diária configurável. Implementa as regras E1-E3 da SPEC-engajamento.md: dia de estudo = atividade com minutos > 0 em UTC (E1), streak conta dias retroativos e hoje sem atividade não quebra até o fim do dia (E2), meta diária padrão de 30 min configurável em 15/30/45/60/90 (E3).

## Arquitetura

- Serviços aqui consomem `src/lib/db` (Prisma); a rota `app/` (home do aluno, com StreakBadge) chama estes serviços.
- Dados na tabela `study_activity` (modelo-de-dados.md §2.10): `user_id` fk, `dia` date (UTC), `minutos` int acumulado, `materiais_concluidos`, `questoes_respondidas`, com pk(user_id, dia) e upsert diário; índice (user_id, dia) para streak e relatório.
- Meta diária em `users.meta_diaria_minutos` int default 30.
- Streak: calculado contando de ontem para trás; como hoje sem atividade não quebra a sequência até o fim do dia (D-E1/E2), o valor exibido hoje preserva o streak de ontem quando ainda não há atividade.
- Ao bater a meta, o serviço sinaliza a celebração in-app leve (D-E2 — sem gamificação pesada).

## Decisões tomadas

| Data | Decisão |
|---|---|
| 2026-08-12 | Dia de estudo = atividade com minutos > 0 em UTC (E1) |
| 2026-08-12 | Hoje sem atividade não quebra o streak até o fim do dia (D-E1/E2) |
| 2026-08-12 | Meta diária padrão **30 min**, configurável pelo aluno em 15/30/45/60/90 (E3; STATUS-APROVACAO.md:31) |
| 2026-08-12 | Celebração leve apenas ao bater a meta, sem pontos/rankings (D-E2) |
| 2026-08-14 | Pasta `engajamento` em pt-BR espelha o domínio `SPEC-engajamento.md`; dados em `study_activity` + `users.meta_diaria_minutos` (inglês snake_case) |

## Informações úteis

- Spec de referência: [docs/specs/SPEC-engajamento.md](docs/specs/SPEC-engajamento.md) (US-35; regras E1-E3).
- Modelo de dados: [docs/modelo-de-dados.md](docs/modelo-de-dados.md) §2.10.
- Slice: S8 — Engajamento & dados ([docs/plano-de-implementacao.md](docs/plano-de-implementacao.md):90-97), incluindo teste unitário de streak (dias consecutivos) e E2E-E1/E2.
- O relatório semanal (US-36) foi removido da master — a tabela `study_activity` serve o streak e a meta diária, não um relatório semanal.
- Componente de UI que exibe o streak: `StreakBadge` (SPEC-frontend.md, área app).
