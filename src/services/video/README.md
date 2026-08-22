# src/services/video — Vídeo (Bunny Stream)

## Função

Regras de negócio do domínio de vídeo: inicia upload direto para materiais `video` existentes e processa callbacks Bunny. Implementa o ciclo de vida monotônico `processando` → `pronto` | `erro`, sem criar material a partir de webhook.

## Arquitetura

- `src/app/api/webhooks/video` valida raw body, headers oficiais, HMAC hexadecimal e `VideoLibraryId`, então chama `processarWebhookVideo`; o serviço busca por `video_provider_id` e usa `updateMany` condicional (`video_status=processando`) para que só o vencedor invalide o gating do curso.
- `iniciarUploadVideo` valida extensão/MIME (`mp4`, `mov`, `mkv`, `avi`) e tamanho máximo de 2GB, chama `criarVideoBunny` e persiste apenas GUID + `processando`. A action admin faz o gate `requireRole("admin")`.
- Se o material já tem GUID e está `processando`, `iniciarUploadVideo` apenas renova as credenciais TUS do mesmo GUID; em `erro` ou sem GUID, cria novo objeto somente após validar que o material é rascunho.
- Estado em `materials.video_provider_id`, `video_status` e `video_erro` (modelo-de-dados.md §2.4): `processando` (visível no admin com badge, não publicável), `pronto` (libera publicação) e `erro` (não publicável por R11; admin vê a mensagem e pode reenviar).
- Posição salva por aluno+material a cada 5s (debounce) e na saída (V4); conclusão automática em 95% da duração ou quando restam até 10s (V5). A camada headless está em `services/aluno/progresso.ts` e `/api/materiais/[id]/video/progresso`; ela não transporta HLS nem altera estado Bunny.

## Decisões tomadas

| Data | Decisão |
|---|---|
| 2026-08-12 | Integração de vídeo via **Bunny Stream** (transcodificação HLS + player embutido) — decisão técnica vigente (AGENTS.md §10) |
| 2026-08-12 | Ciclo de status `processando` → `pronto`/`erro` (R11): só publica material `video` com status `pronto`; `erro` bloqueia publicação e exige reenvio (SPEC-video.md:30-33, :55) |
| 2026-08-12 | Sem entitlement, sem link de streaming (E2E-V4) — gating avaliado no service a cada requisição |
| 2026-08-14 | Pasta `video` em pt-BR espelha o domínio `SPEC-video.md`; estado em colunas `video_*` de `materials` (inglês snake_case) |
| 2026-08-19 | Primeira fatia S5: mapa de status Bunny, callback idempotente, erro seguro e invalidação por curso |
| 2026-08-19 | Revisão S5: state machine monotônica, upload admin separado do CRUD e validação server-side de metadados |
| 2026-08-19 | Correção de concorrência: webhook terminal e publicação de vídeo usam CAS por `updateMany`; replays perdedores não invalidam gating |
| 2026-08-19 | Retomada TUS por GUID existente em processamento e Embed View Token delegado à lib server-side |
| 2026-08-19 | Posição headless com gating por requisição, saneamento, retomada e conclusão automática delegada ao serviço de progresso |

## Informações úteis

- Spec de referência: [docs/specs/SPEC-video.md](docs/specs/SPEC-video.md) (US-07, US-10; regras V1-V5, R11).
- Modelo de dados: [docs/modelo-de-dados.md](docs/modelo-de-dados.md) §2.4.
- Slice: S5 — Vídeo (Bunny Stream): upload direto, webhook de transcodificação, player HLS, posição e conclusão ≥95% (plano-de-implementacao.md:63-70).
- Webhook de transcodificação: `src/app/api/webhooks/video` (SPEC-video.md:34).
- Testes desta fatia: unit de mapa/transições fora de ordem, assinatura/header/library, metadados de upload, gating/R11 e posição/retomada/conclusão headless.
