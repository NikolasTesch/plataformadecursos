# src/services/notificacoes — Notificações In-app e Email

## Função

Regras de negócio do domínio de notificações: envio in-app e por email (US-23) e verificação de email (US-22). Implementa as regras N1-N4 da SPEC-notificacoes.md: email transacional independe de opt-in (N1), envio idempotente por `notification_key` (N2), agrupamento diário de novos materiais (N3) e in-app sempre ativo (N4). As regras do domínio são **N1–N4** — não existe N5.

## Arquitetura

- Serviços aqui consomem `src/lib/db` (Prisma) e `src/lib/mail` (provider transacional Resend/SES — D-N1); a rota `app/notificacoes` (central in-app, badge de não lidas) chama estes serviços; envio de email usa templates por evento com unsubscribe para não-transacionais.
- Dados na tabela `notifications` (modelo-de-dados.md §2.10): `user_id` fk, `tipo` enum, `titulo`, `corpo`, `lida` boolean, `notification_key` text unique e `criado_em`; a central usa o índice (user_id, criado_em desc).
- Idempotência: antes de inserir, o serviço verifica a `notification_key` (evento+usuário); a constraint unique garante que um evento não gera duplicata (N2).
- Digest diário de novos materiais: um único email agrupando os materiais do dia por aluno, em vez de um email por material (N3/D-N2).

## Decisões tomadas

| Data | Decisão |
|---|---|
| 2026-08-12 | Provider de email transacional Resend/SES — escolha final na implementação (D-N1, SPEC-notificacoes.md:40) |
| 2026-08-12 | Digest diário agrupado para novos materiais — 1 email "3 novos materiais em 2 cursos" em vez de 3 (N3/D-N2) |
| 2026-08-12 | Envio idempotente por `notification_key` (evento+usuário) (N2) |
| 2026-08-12 | Relatório semanal (N5/US-36) removido do escopo — regras vigentes são N1-N4 (STATUS-APROVACAO.md:28) |
| 2026-08-14 | Pasta `notificacoes` em pt-BR espelha o domínio `SPEC-notificacoes.md`; dados na tabela `notifications` (inglês snake_case) |

## Informações úteis

- Spec de referência: [docs/specs/SPEC-notificacoes.md](docs/specs/SPEC-notificacoes.md) (US-22, US-23; regras N1-N4).
- Modelo de dados: [docs/modelo-de-dados.md](docs/modelo-de-dados.md) §2.10.
- Slice: S8 — Engajamento & dados ([docs/plano-de-implementacao.md](docs/plano-de-implementacao.md):90-97), incluindo teste unitário de idempotência N2 e E2E-N1..N3.
- Armadilha: o "digest diário" às vezes é citado como "N5" — correto é N3 (regras do domínio são N1-N4); o relatório semanal (N5/US-36) foi removido da master.
- Email informativo (novo material) depende de opt-in e de email verificado; transacional (verificação, expiração) não (N1, N4).
