# src/lib/storage — Storage de Arquivos (Cloudflare R2)

## Função

Acesso ao **Cloudflare R2** para armazenamento de arquivos da plataforma, principalmente os PDFs de material (`materials.arquivo_key`). Centraliza o cliente R2 e a geração de **URLs assinadas** para leitura, mantendo o armazenamento fora do servidor da aplicação e o conteúdo protegido por gating.

## Arquitetura

- `src/lib/storage` expõe o cliente R2 e as operações de upload/download assinado; consumido por `src/services/conteudo` (publicação de material PDF) e pelo fluxo de acesso autorizado do aluno.
- Upload de PDF: MIME verificado por magic bytes (não só extensão), máx. 100MB, chave `materials/{courseId}/{materialId}.pdf` (SPEC-conteudo.md US-05).
- **URL assinada (C5)**: a cada abertura autorizada (R7, R12), o servidor gera uma URL assinada com **validade de 10 minutos**; o download direto não é exposto (SPEC-conteudo.md:49).
- O arquivo é referenciado em `materials.arquivo_key` ([docs/modelo-de-dados.md](docs/modelo-de-dados.md) §2.2); o cliente nunca monta URLs públicas de conteúdo pago.

## Decisões tomadas

| Data | Decisão |
|---|---|
| 2026-08-12 | Cloudflare R2 como storage de arquivos (decisão técnica vigente — AGENTS.md §10) |
| 2026-08-12 | Acesso via URL assinada com validade de 10 min gerada no servidor a cada abertura autorizada (SPEC-conteudo.md C5) |
| 2026-08-14 | Criação da estrutura `src/lib/storage/` + README |

## Informações úteis

- Upload e acesso de material PDF (MIME, 100MB, chave, URL assinada): [docs/specs/SPEC-conteudo.md](docs/specs/SPEC-conteudo.md):46-50.
- Gating de conteúdo (R7, R12) — a URL assinada só é emitida após autorização: [docs/SPEC.md](docs/SPEC.md) (regras R1–R12).
- Campo `materials.arquivo_key` (chave no R2): [docs/modelo-de-dados.md](docs/modelo-de-dados.md) §2.2.
- Armadilha: validade curta (10 min) e geração sempre no servidor — nunca expor chaves permanentes ou URLs públicas de conteúdo pago.
