# src/services/conteudo — Cursos, Módulos, Materiais, Publicação e Busca

## Função

Regras de negócio do domínio de conteúdo: CRUD de cursos, módulos e materiais (US-03..06), publicação com rascunho/publicado (US-09), materiais `pdf`/`texto`/`resumo` (US-40, US-41), sales page pública do curso (US-44) e **busca** (US-21). Implementa as regras C1-C8 da SPEC-conteudo.md.

## Arquitetura

- Serviços aqui consomem `src/lib/storage` (upload de PDF e URL assinada, R2/C5), `src/lib/sanitize` (conteúdo HTML de `texto`/`resumo`) e `src/lib/pdf` (extração de texto para busca). Rotas `admin/cursos`, `admin/materiais`, `app/cursos/[slug]` e `cursos/[slug]` (sales page) chamam estes serviços.
- Dados em `courses`, `modules` e `materials` (modelo-de-dados.md §2.2): `status` rascunho/publicado, `amostra` (máx. 1 por curso, C2), `slug` único e imutável após o 1º material publicado (C1), `arquivo_key` para PDF.
- Publicação: rascunho invisível para alunos (R5); material `video` só publica com status `pronto` (R11); despublicar tem efeito imediato na próxima requisição.
- Leitura e busca passam o estado da conta ao gating; despublicação invalida o cache do curso após atualizar o material.

## Decisões tomadas

| Data | Decisão |
|---|---|
| 2026-08-12 | **Busca (US-21) vive neste domínio** — decisão da revisão de pendências (SPEC-conteudo.md §3.7, linhas 77-81) |
| 2026-08-12 | Busca indexa **conteúdo interno de PDFs**: texto extraído no upload (parser PDF); falha na extração não bloqueia publicação (busca cobre só título) — SPEC-conteudo.md:78-79 |
| 2026-08-12 | Upload de PDF validado por magic bytes; rejeitar arquivos >100MB (C3); slug imutável após publicação (C1) |
| 2026-08-14 | Pasta `conteudo` em pt-BR espelha o domínio `SPEC-conteudo.md`; dados em tabelas `courses`/`modules`/`materials` (inglês snake_case) |

## Informações úteis

- Spec de referência: [docs/specs/SPEC-conteudo.md](docs/specs/SPEC-conteudo.md) (US-03..06, US-09, US-21, US-40, US-41, US-44; regras C1-C8).
- Busca: SPEC-conteudo.md §3.7 (linhas 77-81) — filtros por tipo/curso, ordenação por relevância/data, resultados só com gating R1-R12 aplicado.
- Modelo de dados: [docs/modelo-de-dados.md](docs/modelo-de-dados.md) §2.2 (inclui `simulados` como entidade própria — Q4).
- Slices: S2 — Conteúdo (CRUD, publicação, amostras, sales page) e S8 — busca com indexação de PDFs (plano-de-implementacao.md:36-43, :93).
- Sales page (US-44): expõe só a grade resumida e a amostra, nunca o conteúdo (R12, SPEC-conteudo.md:83-89).

## PDF pós-upload (S2 todo 11)

- `pdf-extracao.ts` lê o objeto já persistido, extrai texto com `pdf-parse`, normaliza espaços/caixa e atualiza `materials.conteudo_busca` com `titulo + texto`.
- A action de criação/edição chama a indexação depois de persistir o material. O resultado `falhou` é registrado com `materialId`, sem lançar: o título continua pesquisável e a publicação segue normalmente.
- O parser é injetável nos testes; a dependência de leitura do storage também é injetável, mantendo a regra de negócio fora das rotas.
