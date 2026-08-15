# src/app/admin/comentarios — Moderação de comentários e avaliações

## Função

Moderação da comunidade (URL `/admin/comentarios`), de uso exclusivo do admin (US-48). Cobre os dois conteúdos gerados por alunos:
- **comments**: comentários em materiais (`comments`), ordenados por recência, sem threads aninhadas (D-C2); resposta do admin aparece como comentário marcado "Resposta do admin", com flag `respondido`.
- **course_reviews**: avaliações de curso (US-47/48) — nota 1-5 obrigatória + comentário curto (máx. 500 caracteres, opcional). Avaliação nasce `pendente`; entra na nota média só quando aprovada (D-R2).

Ações de moderação: **aprovar**, **ocultar** e **excluir** (definitiva). Lista com filtros por status, curso e nota.

## Arquitetura

- Página sob o layout **admin-shell** (SPEC-frontend.md:102).
- Rota fina: `page.tsx` futuro chama o service `src/services/comunidade` (US-28, US-47, US-48); conteúdo passa por sanitização em `src/lib/sanitize` (CO5).
- Avaliação oculta/excluída sai da média e da exibição; notificação in-app ao admin quando nova avaliação chega (padrão D-C3, sem email no MVP).

## Decisões tomadas

| Data | Decisão |
|---|---|
| 2026-08-14 | Rota criada antes do código (estrutura + README), seguindo o contrato do plano de implementação |
| 2026-08-14 | Avaliações de curso (US-47/48) não têm pasta própria: a moderação foi absorvida nesta rota (SPEC-comunidade.md:52) |
| 2026-08-14 | 1 avaliação por aluno/curso (unique user+course) — reavaliar substitui a anterior (D-R1) |

## Informações úteis

- Moderação de avaliações (US-48): [docs/specs/SPEC-comunidade.md](docs/specs/SPEC-comunidade.md):52 (ações aprovar/ocultar/excluir; filtros status/curso/nota).
- Estrutura das tabelas: [docs/modelo-de-dados.md](docs/modelo-de-dados.md):219-231 (`comments` e `course_reviews`; unique(course_id, user_id)).
- Sem threads aninhadas (D-C2): resposta do admin marcada "Resposta do admin" — SPEC-comunidade.md:32.
- Avaliação `pendente` não entra na média (D-R2); exige entitlement real do curso (D-R1).
- Slice de implementação: S7 — ver [docs/plano-de-implementacao.md](docs/plano-de-implementacao.md).
