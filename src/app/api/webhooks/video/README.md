# src/app/api/webhooks/video — Callback Bunny Stream

## Função

Recebe callbacks de transcodificação do Bunny Stream para atualizar materiais de vídeo existentes.

## Arquitetura

`route.ts` lê o raw body como bytes, exige `X-BunnyStream-Signature-Version: v1` e `X-BunnyStream-Signature-Algorithm: hmac-sha256`, aceita apenas assinatura hexadecimal minúscula de 64 caracteres, valida `VideoLibraryId` e delega o payload ao serviço `src/services/video`. O handler responde 204 após processamento.

## Decisões tomadas

| Data | Decisão |
|---|---|
| 2026-08-19 | Assinatura calculada sobre o corpo bruto; ausência/erro de assinatura retorna 401 e JSON inválido ou payload incompleto retorna 400 |
| 2026-08-19 | Payload exige `VideoGuid`, `VideoLibraryId` e `Status`; library divergente retorna 401 |

## Informações úteis

- Secret: `BUNNY_WEBHOOK_SECRET` (chave read-only do Bunny), nunca a API key.
- Payload mínimo: `VideoGuid`, `VideoLibraryId` e `Status`; referência: [SPEC-video.md](../../../../../docs/specs/SPEC-video.md) §3.1.
