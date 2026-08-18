# src/app/app/cursos/[slug]/materiais/[id] — Leitura Imersiva (Player)

## Função

Rota `/app/cursos/{slug}/materiais/{id}`: leitura/visualização de um material individual (PDF, texto, vídeo ou questões). É o **5º layout do sistema** — o layout de **player/leitura** (SPEC-frontend.md:104): conteúdo central com largura de 72ch, barra lateral contextual (módulos/materiais do curso) em telas ≥lg, **sem sidebar de app**. A URL é limpa (SPEC-aluno.md:36).

## Arquitetura

```
src/app/app/cursos/[slug]/materiais/[id]/
├── README.md          # Este arquivo
├── layout.tsx         # Layout player: 72ch central + barra lateral contextual
└── page.tsx           # Renderização gated do material (S2)
```

Fluxo: a `page.tsx` chama o service de conteúdo e avalia o gating no servidor (R12: bloqueio não entrega conteúdo). S2 renderiza texto/resumo sanitizados e PDF via URL assinada/impressão gated; vídeo, questões, anotações e progresso ficam nos slices correspondentes.

## Decisões tomadas

| Data | Decisão |
|---|---|
| 2026-08-14 | **Layout próprio neste segmento** (SPEC-frontend.md:104) — leitura imersiva não carrega a sidebar de app; a barra lateral contextual lista módulos/materiais do curso em ≥lg |
| 2026-08-14 | Conteúdo central com largura máxima de 72ch — legibilidade em leitura longa (SPEC-frontend.md:104) |
| 2026-08-14 | URL limpa `/app/cursos/{slug}/materiais/{id}` (SPEC-aluno.md:36) — o `id` é o do material, sem parâmetros extras |
| 2026-08-14 | Gating avaliado a cada requisição de conteúdo (SPEC-aluno.md:38-44); bloqueio devolve zero conteúdo (R12) |
| 2026-08-17 | S2 implementa leitura/impressão de texto, resumo e PDF; o gating completo R1-R12 será substituído no S3 |

## Informações úteis

- Layout player/leitura: [docs/specs/SPEC-frontend.md](docs/specs/SPEC-frontend.md):104.
- URL limpa e breadcrumb curso → módulo → material: [docs/specs/SPEC-aluno.md](docs/specs/SPEC-aluno.md):36.
- Tipos de material e conclusão: SPEC-aluno.md:47-52 (vídeo conclui automático ≥95%).
- Anotações por material (máx. 10.000 caracteres): SPEC-aluno.md:54-57.
- Para questões: toggle modo prova/estudo na abertura do material (SPEC-questoes.md:66).
