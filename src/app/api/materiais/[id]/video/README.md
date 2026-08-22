# `/api/materiais/[id]/video`

## Função

Agrupa a API headless do player de vídeo do aluno.

## Arquitetura

`progresso/route.ts` recebe somente posição JSON e delega autenticação,
gating, saneamento, persistência e conclusão a `services/aluno/progresso`.
Nenhum byte ou URL HLS passa por esta rota.

## Decisões tomadas

| Data | Decisão |
|---|---|
| 2026-08-19 | API de posição separada da UI; o serviço reavalia gating em toda chamada |

## Informações úteis

- POST `/api/materiais/:id/video/progresso` com `{ posicaoSegundos, duracaoSegundos? }`.
- Contrato de comportamento: `docs/specs/SPEC-video.md` §3.2.
