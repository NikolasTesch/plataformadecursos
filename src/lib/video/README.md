# src/lib/video — Vídeo (Bunny Stream)

## Função

Cliente server-side de integração com o **Bunny Stream** para criar vídeos e preparar upload TUS direto. O estado do material é acompanhado por `materials.video_provider_id` e `materials.video_status` ([docs/modelo-de-dados.md](docs/modelo-de-dados.md) §2.4) — o vídeo em si vive no Bunny Stream, sem tabela extra. Player e URL de reprodução ficam para as próximas fatias de S5.

## Arquitetura

- `src/lib/video` expõe o cliente server-side Bunny Stream para criar vídeos, emitir credenciais TUS e gerar Embed View Token URLs; API key e token security key permanecem apenas no servidor.
- Criação via `POST /library/{libraryId}/videos` e upload direto ao Bunny via TUS, sem passar pelo servidor da aplicação — evita limite de corpo de request e consumo de banda (SPEC-video.md:29).
- Credenciais TUS expiram em 24h, compatíveis com upload de até 2GB; a lib não valida metadados do arquivo.
- `gerarUrlEmbedVideo` gera URL HLS embutida com token SHA-256 e expiração de 5 min após o caller aplicar gating; habilite **Embed View Token Authentication** no painel Bunny para a biblioteca.
- Reprodução via **player HLS embutido**; o servidor emite o link de streaming somente após gating aprovado (R7/R12), com token de curta duração quando aplicável (SPEC-video.md:37-38).
- Posição de reprodução persistida em `user_progress.posicao_segundos` (US-10, [docs/modelo-de-dados.md](docs/modelo-de-dados.md) §2.5).

## Decisões tomadas

| Data | Decisão |
|---|---|
| 2026-08-12 | Vídeo via Bunny Stream (transcodificação HLS, player embutido) — decisão técnica vigente, AGENTS.md §10 |
| 2026-08-12 | Vídeo vive no Bunny Stream; `materials.video_provider_id` + `video_status` cobrem o ciclo — nenhuma tabela extra (decisão V1, modelo-de-dados §2.4) |
| 2026-08-14 | Criação da estrutura `src/lib/video/` + README |
| 2026-08-19 | Cliente nativo com `fetch`/`crypto`, validação de configuração e credenciais TUS SHA-256 |
| 2026-08-19 | Prazo TUS ampliado para 24h; extensão/MIME/tamanho permanecem no serviço de upload, não nas credenciais |
| 2026-08-19 | Embed View Token Authentication: chave explícita `BUNNY_TOKEN_SECURITY_KEY`, token SHA-256 e URL com validade de 5 min |

## Informações úteis

- Upload/processamento (US-07, máx. 2GB, estados, webhook): [docs/specs/SPEC-video.md](docs/specs/SPEC-video.md):27-34.
- Player HLS e gating do link (US-10, token curto, retomada, conclusão): [docs/specs/SPEC-video.md](docs/specs/SPEC-video.md):36-41.
- `materials.video_provider_id`, `video_status`, `video_erro` e `user_progress.posicao_segundos`: [docs/modelo-de-dados.md](docs/modelo-de-dados.md) §2.2, §2.4 e §2.5.
- Armadilha: estado `processando` não é publicável (R11); link de streaming sempre condicionado ao gating, nunca embutido com URL fixa.
- A persistência do GUID/status e as transições de webhook são protegidas pelos serviços; esta lib não faz write no banco.
- Configuração: `BUNNY_LIBRARY_ID` e `BUNNY_API_KEY`; o segredo de callback é `BUNNY_WEBHOOK_SECRET` em `.env`.
- Operação: configurar `BUNNY_TOKEN_SECURITY_KEY` separadamente e habilitar Embed View Token Authentication na biblioteca Bunny; sem isso, o helper falha fechado.
