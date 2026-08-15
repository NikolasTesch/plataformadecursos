# src/lib/video — Vídeo (Bunny Stream)

## Função

Cliente de integração com o **Bunny Stream** para o ciclo de vida de vídeos da plataforma: upload, processamento (transcodificação HLS) e fornecimento da URL de reprodução para o player. O estado do material é acompanhado por `materials.video_provider_id` e `materials.video_status` ([docs/modelo-de-dados.md](docs/modelo-de-dados.md) §2.4) — o vídeo em si vive no Bunny Stream, sem tabela extra.

## Arquitetura

- `src/lib/video` expõe o cliente Bunny Stream (upload/API, consulta de status, emissão de link de streaming); consumido por `src/services/video` (regras de negócio do domínio vídeo) e pela publicação de material no admin.
- Upload direto ao Bunny (presigned/API), sem passar pelo servidor da aplicação — evita limite de corpo de request e consumo de banda (SPEC-video.md:29).
- Transição `processando` → `pronto` | `erro` via callback/webhook do Bunny, que atualiza o banco (SPEC-video.md:34).
- Reprodução via **player HLS embutido**; o servidor emite o link de streaming somente após gating aprovado (R7/R12), com token de curta duração quando aplicável (SPEC-video.md:37-38).
- Posição de reprodução persistida em `user_progress.posicao_segundos` (US-10, [docs/modelo-de-dados.md](docs/modelo-de-dados.md) §2.5).

## Decisões tomadas

| Data | Decisão |
|---|---|
| 2026-08-12 | Vídeo via Bunny Stream (transcodificação HLS, player embutido) — decisão técnica vigente, AGENTS.md §10 |
| 2026-08-12 | Vídeo vive no Bunny Stream; `materials.video_provider_id` + `video_status` cobrem o ciclo — nenhuma tabela extra (decisão V1, modelo-de-dados §2.4) |
| 2026-08-14 | Criação da estrutura `src/lib/video/` + README |

## Informações úteis

- Upload/processamento (US-07, máx. 2GB, estados, webhook): [docs/specs/SPEC-video.md](docs/specs/SPEC-video.md):27-34.
- Player HLS e gating do link (US-10, token curto, retomada, conclusão): [docs/specs/SPEC-video.md](docs/specs/SPEC-video.md):36-41.
- `materials.video_provider_id`, `video_status`, `video_erro` e `user_progress.posicao_segundos`: [docs/modelo-de-dados.md](docs/modelo-de-dados.md) §2.2, §2.4 e §2.5.
- Armadilha: estado `processando` não é publicável (R11); link de streaming sempre condicionado ao gating, nunca embutido com URL fixa.
