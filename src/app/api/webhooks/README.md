# src/app/api/webhooks — Callbacks externos

## Função

Agrupa route handlers que recebem callbacks autenticados de provedores externos. Nenhuma rota desta pasta renderiza UI.

## Arquitetura

Cada callback lê o corpo bruto, valida autenticidade antes do parse e delega a mudança de estado ao serviço do domínio. A subrota `video` recebe eventos do Bunny Stream.

## Decisões tomadas

| Data | Decisão |
|---|---|
| 2026-08-19 | Callbacks Bunny exigem headers v1/hmac-sha256 e HMAC-SHA256 com `BUNNY_WEBHOOK_SECRET`; a rota não loga segredos |

## Informações úteis

- Contrato: [SPEC-video.md](../../../../docs/specs/SPEC-video.md) §3.1.
- Rota de vídeo: `POST /api/webhooks/video`; respostas de autenticação inválida são 401 e payload inválido é 400.
