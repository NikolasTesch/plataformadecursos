# Migration S5 — Constraint R11

## Função

Impõe no PostgreSQL que material `video` com status `publicado` tenha `video_status = pronto`.

## Arquitetura

A migration valida primeiro dados legados e aborta sem mutações se encontrar violações. Depois adiciona a constraint nomeada `materials_video_publicado_pronto_check`; `NULL` é explicitamente inválido nessa combinação.

## Decisões tomadas

| Data | Decisão |
|---|---|
| 2026-08-19 | R11 duplicado no banco por CHECK raw SQL, pois Prisma não representa constraints CHECK no schema declarativo |

## Informações úteis

- Não usar reset. Em banco existente, resolver violações reportadas pela migration antes de reaplicar.
