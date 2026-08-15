# src/services/video — Vídeo (Bunny Stream)

## Função

Regras de negócio do domínio de vídeo: publicação de material `video` com integração Bunny Stream (US-07) e reprodução com posição e conclusão automática (US-10). Implementa o ciclo de vida do vídeo (processando → pronto | erro, regra R11) e as regras V1-V5 da SPEC-video.md.

## Arquitetura

- Serviços aqui consomem `src/lib/video` (cliente Bunny Stream: upload direto, webhook de transcodificação, player HLS embutido). O webhook de transcodificação chega em `src/app/api/webhooks/video` (SPEC-video.md:34) e chama estes serviços. Rotas `admin/materiais` (publicação) e `app/cursos/[slug]/materiais/[id]` (player) também chamam.
- Estado em `materials.video_provider_id`, `video_status` e `video_erro` (modelo-de-dados.md §2.4): `processando` (visível no admin com badge, não publicável), `pronto` (libera publicação) e `erro` (não publicável por R11; admin vê a mensagem e pode reenviar).
- Posição salva por aluno+material a cada 5s (debounce) e na saída (V4); conclusão automática em 95% da duração (V5).

## Decisões tomadas

| Data | Decisão |
|---|---|
| 2026-08-12 | Integração de vídeo via **Bunny Stream** (transcodificação HLS + player embutido) — decisão técnica vigente (AGENTS.md §10) |
| 2026-08-12 | Ciclo de status `processando` → `pronto`/`erro` (R11): só publica material `video` com status `pronto`; `erro` bloqueia publicação e exige reenvio (SPEC-video.md:30-33, :55) |
| 2026-08-12 | Sem entitlement, sem link de streaming (E2E-V4) — gating avaliado no service a cada requisição |
| 2026-08-14 | Pasta `video` em pt-BR espelha o domínio `SPEC-video.md`; estado em colunas `video_*` de `materials` (inglês snake_case) |

## Informações úteis

- Spec de referência: [docs/specs/SPEC-video.md](docs/specs/SPEC-video.md) (US-07, US-10; regras V1-V5, R11).
- Modelo de dados: [docs/modelo-de-dados.md](docs/modelo-de-dados.md) §2.4.
- Slice: S5 — Vídeo (Bunny Stream): upload direto, webhook de transcodificação, player HLS, posição e conclusão ≥95% (plano-de-implementacao.md:63-70).
- Webhook de transcodificação: `src/app/api/webhooks/video` (SPEC-video.md:34).
- Testes: unit de transições de status (R11) e cálculo de conclusão; E2E-V1..V3.
