# Migration S5 — GUID Bunny único

## Função

Cria o índice único nullable de `materials.video_provider_id`, garantindo que um GUID Bunny não seja associado a dois materiais.

## Arquitetura

Antes do índice, a migration apenas verifica duplicatas não nulas. Se encontrar alguma, falha sem alterar dados para permitir saneamento explícito; valores `NULL` continuam permitidos em múltiplas linhas.

## Decisões tomadas

| Data | Decisão |
|---|---|
| 2026-08-19 | Índice único seguro e não destrutivo; nenhuma duplicata legada é removida automaticamente |

## Informações úteis

- Fonte: `prisma/schema.prisma`, `materials.video_provider_id @unique`.
- Aplicar com `npx prisma migrate deploy` em ambiente existente; não usar reset.
