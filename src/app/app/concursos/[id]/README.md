# src/app/app/concursos/[id] — Detalhe do Concurso

## Função

Rota `/app/concursos/{id}`: página de detalhe de um concurso, com a ação de **seguir/deixar de seguir** (US-42, SPEC-editais.md:44-45). Seguir um concurso habilita os alertas de:
- Abertura de inscrições (T-3 dias).
- Fim de inscrições (T-3 dias).
- Prova próxima (T-7 dias).
- Novo concurso do mesmo órgão/banca seguida.

Sem alerta para concursos não seguidos (SPEC-editais.md:46-51). Os alertas chegam pela central de notificações (US-23).

## Arquitetura

```
src/app/app/concursos/[id]/
├── README.md          # Este arquivo
└── page.tsx           # Detalhe + seguir/deixar de seguir (a criar no S2)
```

Fluxo: o parâmetro `id` identifica o concurso; a página consulta `src/services/editais` pelos dados do concurso e o estado de seguimento do aluno. A ação seguir/deixar de seguir é validada no servidor e alimenta o motor de notificações (`src/services/notificacoes`) para os gatilhos de alerta. Atualizações de datas via scraping aparecem aqui com o diff registrado (campo `ultimo_sync_em`, SPEC-editais.md:41).

## Decisões tomadas

| Data | Decisão |
|---|---|
| 2026-08-14 | Seguir/deixar de seguir é ação da página de detalhe (US-42) — o estado de seguimento controla os alertas (SPEC-editais.md:44-45) |
| 2026-08-14 | Alertas só existem para concursos seguidos (SPEC-editais.md:51) — nenhum ruído para não seguidos |
| 2026-08-14 | Datas atualizadas por scraping exibem a última sincronização (`ultimo_sync_em`) com log de alterações (SPEC-editais.md:41) |

## Informações úteis

- Seguir/deixar de seguir e alertas: [docs/specs/SPEC-editais.md](docs/specs/SPEC-editais.md):44-51.
- Gatilhos de alerta e central de notificações: [docs/specs/SPEC-notificacoes.md](docs/specs/SPEC-notificacoes.md):40-44.
- A lista de concursos vive em `../README.md` (pasta `concursos/`).
