# src/services/comunidade — Comentários e Avaliações de Curso

## Função

Regras de negócio do domínio de comunidade: comentários e dúvidas em materiais (US-28) e avaliações de curso com nota e moderação (US-47/48). Implementa as regras CO1-CO6 da SPEC-comunidade.md e as decisões de avaliação D-R1/D-R2: avaliação exige entitlement real, nota 1-5 obrigatória, status pendente/aprovado/oculta, e a nota média pública considera apenas avaliações aprovadas.

## Arquitetura

- Serviços aqui consomem `src/lib/db` (Prisma) e `src/lib/sanitize` (CO5); as rotas `app/cursos/[slug]/materiais/[id]` (comentários) e `app/cursos/[slug]` (avaliações na sales page) chamam estes serviços; a moderação (US-48) é consumida por `admin/comentarios`.
- Dados em `comments` e `course_reviews` (modelo-de-dados.md §2.9): comentário até 2.000 caracteres com `respondido`/`resposta_admin` (thread de 1 nível — D-C2); avaliação com `nota` int 1-5 obrigatória, `comentario` até 500 caracteres sanitizado e `status` enum `pendente`/`aprovado`/`oculta` (default `pendente`).
- `course_reviews` tem unique(course_id, user_id): avaliar de novo substitui a avaliação anterior (D-R1).
- Nota média pública é calculada apenas sobre avaliações com status `aprovado` (D-R2); a listagem na sales page usa o índice (course_id, status).

## Decisões tomadas

| Data | Decisão |
|---|---|
| 2026-08-12 | Comentários sem anexos no MVP (D-C1) |
| 2026-08-12 | Threads de 1 nível: resposta do admin fixada no comentário (D-C2) |
| 2026-08-12 | Sem sistema de denúncias no MVP (D-C4) |
| 2026-08-13 | Avaliação de curso exige entitlement real do curso (amostra não conta) e substitui avaliação anterior por unique(course_id, user_id) (D-R1) |
| 2026-08-13 | Nota média pública = média apenas das avaliações `aprovado` (D-R2) |
| 2026-08-14 | Pasta `comunidade` em pt-BR espelha o domínio `SPEC-comunidade.md`; dados em `comments`/`course_reviews` (inglês snake_case) |

## Informações úteis

- Spec de referência: [docs/specs/SPEC-comunidade.md](docs/specs/SPEC-comunidade.md) (US-28, US-47, US-48; regras CO1-CO6).
- Modelo de dados: [docs/modelo-de-dados.md](docs/modelo-de-dados.md) §2.9.
- Slice: S7 — Expansão ([docs/plano-de-implementacao.md](docs/plano-de-implementacao.md):81-88), incluindo US-47 (avaliação) e US-48 (moderação), teste unitário CO6 (gating de avaliação) e nota média (apenas aprovadas).
- Rota de moderação: `admin/comentarios` absorve a moderação de comentários e avaliações (US-48).
- Índice de busca de avaliações: (course_id, status) — modelo-de-dados.md §3.
