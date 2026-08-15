# src/lib/storage — Storage de Arquivos (Cloudflare R2 + stub)

## Função

Acesso ao **Cloudflare R2** para armazenamento de arquivos da plataforma, principalmente os PDFs de material (`materials.arquivo_key`). Centraliza a geração de **URLs pré-assinadas de upload** (presigned direct — os bytes nunca passam pelo servidor da aplicação) e de **URLs assinadas de leitura** com validade de **10 minutos**, mantendo o armazenamento fora do servidor e o conteúdo protegido por gating. Implementado com **driver pattern** (decisão do plano S2, todo 5): driver real R2 + driver stub local para dev/CI sem credenciais.

## Arquitetura

- `src/lib/storage/index.ts` expõe:
  - **`StorageDriver`** — interface mínima: `createPresignedUpload({key, mimeType, size}) → {uploadUrl, key}` e `createSignedUrl(key) → string` (10 min, C5).
  - **`R2StorageDriver`** — driver real (@aws-sdk/client-s3 contra R2, S3-compatible): `region: "auto"`, `forcePathStyle: true`, endpoint de `R2_ENDPOINT` ou derivado de `R2_ACCOUNT_ID` (`https://<accountid>.r2.cloudflarestorage.com`), credenciais de `R2_ACCESS_KEY_ID`/`R2_SECRET_ACCESS_KEY`, bucket de `R2_BUCKET`.
  - **`StubStorageDriver`** — driver stub (dev/CI): URLs deriváveis `http://127.0.0.1:3000/stub-storage/{key}`, registro do "objeto" e bytes persistidos em `tmpdir/concursfoco-stub-storage` (extensão `salvarArquivo(key, buffer)` para dev/E2E que precisam do conteúdo real).
  - **`criarStorage()`** — factory: `STORAGE_DRIVER=r2` → R2 (credenciais ausentes = erro claro `ErroStorage`, nunca fallback silencioso); `STORAGE_DRIVER=stub` → stub (override explícito); não definido → credenciais R2 presentes ? r2 : stub (fallback documentado, decisão 3 do plano).
  - **`getStorage()`** — singleton lazy (padrão do projeto, ver `src/lib/db.ts`).
  - **`validarArquivoPdf(buffer)` / `validarUploadPdf(buffer, size)` / `MAX_PDF_BYTES`** — validação C3 por **magic bytes** (`%PDF-` nos primeiros 1024 bytes, ISO 32000-1) e limite de 100MB.
- Upload de PDF: MIME verificado por magic bytes (não só extensão), máx. 100MB, chave `materials/{courseId}/{materialId}.pdf` (SPEC-conteudo.md US-05).
- **URL assinada (C5)**: a cada abertura autorizada (R7, R12), o servidor gera uma URL assinada com **validade exata de 10 minutos (600s)**; o download direto não é exposto (SPEC-conteudo.md:49).
- O arquivo é referenciado em `materials.arquivo_key` ([docs/modelo-de-dados.md](docs/modelo-de-dados.md) §2.2); o cliente nunca monta URLs públicas de conteúdo pago.

### Fluxo do upload (presigned direct)

1. O chamador (cliente/rota de admin) valida o arquivo com `validarUploadPdf(buffer, size)` **antes** de pedir o presign — o servidor nunca recebe os bytes (contrato C3).
2. A rota chama `createPresignedUpload({key, mimeType, size})` — o driver rejeita `size > 100MB` (C3) e devolve uma URL de upload válida por 10 min.
3. O cliente faz PUT direto na URL (R2). O `materials.arquivo_key` recebe a chave.

### Fluxo da leitura (gating + signed URL)

1. O service de leitura roda o **gating** (R7/R12 — todo 7/9) e só então chama `createSignedUrl(key)`.
2. **CONTRATO C5 do chamador**: a signed URL só pode ser emitida após gating aprovado — esta lib não faz o gating, apenas documenta o contrato no método.
3. A URL expira em 600s; uma nova abertura gera outra URL.

## Decisões tomadas

| Data | Decisão |
|---|---|
| 2026-08-12 | Cloudflare R2 como storage de arquivos (decisão técnica vigente — AGENTS.md §10) |
| 2026-08-12 | Acesso via URL assinada com validade de 10 min gerada no servidor a cada abertura autorizada (SPEC-conteudo.md C5) |
| 2026-08-14 | Criação da estrutura `src/lib/storage/` + README |
| 2026-08-15 | **Driver pattern** (todo 5 S2): interface `StorageDriver` mínima + factory `criarStorage()`; stub default sem credenciais (decisão 3 do plano) |
| 2026-08-15 | @aws-sdk/client-s3 + @aws-sdk/s3-request-presigner v3.1111 (presign local, sem rede) |
| 2026-08-15 | Endpoint R2: `R2_ENDPOINT` ou derivado de `R2_ACCOUNT_ID`; `region: "auto"`, `forcePathStyle: true` |
| 2026-08-15 | Stub: URLs deriváveis `http://127.0.0.1:3000/stub-storage/{key}` + disco local `tmpdir/concursfoco-stub-storage`; TTL de 600s também no presign de upload (consistência) |

## Variáveis de ambiente

| Variável | Uso |
|---|---|
| `STORAGE_DRIVER` | `"stub"` (default sem credenciais) \| `"r2"` (exige as R2_* abaixo). Placeholder comentado no `.env.example` |
| `R2_BUCKET` | Nome do bucket R2 (obrigatório p/ driver r2) |
| `R2_ACCESS_KEY_ID` | Access key R2 (obrigatório p/ driver r2) |
| `R2_SECRET_ACCESS_KEY` | Secret key R2 (obrigatório p/ driver r2) |
| `R2_ENDPOINT` | Endpoint R2 (opcional; default derivado de `R2_ACCOUNT_ID`) |
| `R2_ACCOUNT_ID` | Account ID Cloudflare (opcional; usado para derivar o endpoint) |

## Informações úteis

- Upload e acesso de material PDF (MIME, 100MB, chave, URL assinada): [docs/specs/SPEC-conteudo.md](docs/specs/SPEC-conteudo.md):46-50.
- Gating de conteúdo (R7, R12) — a URL assinada só é emitida após autorização: [docs/SPEC.md](docs/SPEC.md) (regras R1–R12).
- Campo `materials.arquivo_key` (chave no R2): [docs/modelo-de-dados.md](docs/modelo-de-dados.md) §2.2.
- Armadilhas: (1) validade curta (10 min) e geração sempre no servidor — nunca expor chaves permanentes ou URLs públicas de conteúdo pago; (2) em presigned direct o servidor não vê os bytes — a validação de magic bytes (C3) é responsabilidade do chamador via `validarUploadPdf`, o driver só reforça o limite de tamanho; (3) `STORAGE_DRIVER=r2` sem credenciais lança erro de configuração de propósito (evita produção "achando" que usa R2 quando não há credenciais); (4) nunca commitar credenciais R2 reais — o stub é o default no dev.
