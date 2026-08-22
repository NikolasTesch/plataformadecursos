# docs/specs — Specs de Implementação por Domínio

## Função

Especificações de comportamento detalhadas por domínio do produto. A **SPEC master** (`docs/SPEC.md`) é o contrato global (papéis, regras R1–R12, gating); cada arquivo aqui detalha o comportamento de um domínio específico, com user stories, critérios de aceitação e exemplos.

## Arquitetura

```
docs/
├── PRD.md                  # Visão de produto (escopo, RNF, stack)
├── SPEC.md                 # Spec master — contrato global + índice das specs de domínio
├── modelo-de-dados.md      # Schema consolidado (design de banco)
├── plano-de-implementacao.md  # Slices S1–S8
└── specs/                  # ← este diretório
    ├── README.md           # Este arquivo
    ├── STATUS-APROVACAO.md # Checklist de aprovação SDD
    └── SPEC-<dominio>.md   # Uma spec por domínio
```

Regras:
- Toda spec de domínio referencia IDs da spec master (US-XX, R-XX) — nunca redefine regras globais.
- Status segue o fluxo SDD: `[PENDENTE]` → `[APROVADO]`. Só implementar domínio `[APROVADO]`.
- Specs de idealização (produtos futuros) usam status `[IDEALIZAÇÃO]` e não bloqueiam nem habilitam implementação.

## Decisões tomadas

| Data | Decisão |
|---|---|
| 2026-08-12 | Estrutura "spec master + specs por domínio" aprovada pelo usuário |
| 2026-08-12 | Mobile tratado como idealização futura (`SPEC-mobile.md`), não como escopo ativo |
| 2026-08-12 | Domínios engajamento (`SPEC-engajamento.md`) e editais (`SPEC-editais.md`) adicionados (features P1/P2) |
| 2026-08-12 | Domínio frontend (`SPEC-frontend.md`) adicionado — design system e UI |
| 2026-08-13 | `SPEC-frontend.md` v0.2 **aprovada** — 14 specs de domínio aprovadas; única idealização restante: mobile |
| 2026-08-13 | `SPEC-landing.md` v0.1 adicionada (landing de alta conversão) — [PENDENTE] |
| 2026-08-13 | **`SPEC-landing.md` v0.2 aprovada** — 15 specs aprovadas. Novas US na master v2.5: US-44 (sales page), US-45/46 (cupons), US-47/48 (avaliações) |
| 2026-08-19 | S4 — Questões concluído/aprovado; 341 testes unitários e 23 E2E aprovados |
| 2026-08-19 | S5 — Vídeo concluído e formalmente aprovado pelo usuário; passou no gate técnico final: 377 testes unitários, 28 E2E, lint, build e `prisma validate`/`prisma migrate status`; validação manual operacional com credenciais e painel Bunny real permanece pendente como validação pré-go-live; S6 não foi iniciado |
| 2026-08-19 | Revisão de ordem do S7 aprovada: divisão em S7.1 (núcleo — trilhas US-25, simulados US-27, flashcards US-26, liberado pós-S5 e sem dependência de S6) e S7.2 (restante — comentários US-28, avaliações US-47/48, PWA/ZIP US-30/43, editais US-42, condicionado a S6 para *entitlements* e à decisão de jobs/scheduler); nenhuma spec de domínio alterada |

## Informações úteis

- Estado atual (2026-08-19): **S5 — Vídeo concluído e formalmente aprovado pelo usuário**, com gate técnico final concluído (377 testes unitários, 28 E2E, lint, build e `prisma validate`/`prisma migrate status`). A validação manual operacional com credenciais e painel Bunny reais (upload TUS, callback/webhook e player tokenizado) permanece pendente como validação pré-go-live; S6 não foi iniciado. O gate do S3 ainda tem pendência residual de comprovação: cobertura atual E1–E4, E7, AL1 e AL2, sem registro de execução/aprovação integral de E1–E7/AL1/AL2 e revisão final; E5/E6 não estão cobertos no conjunto atual. Revisão de ordem do plano aprovada em 2026-08-19: o S7 foi dividido em **S7.1** (núcleo — trilhas US-25, simulados US-27, flashcards US-26), planejado e liberado para implementação após S5, sem dependência de S6, e **S7.2** (restante — comentários US-28, avaliações US-47/48, PWA/ZIP US-30/43, editais US-42), que permanece pós-S6 (para *entitlements*) e pós-decisão de jobs/scheduler (para PWA sync offline, geração assíncrona de ZIP e rastreamento/scraping de editais). Nenhuma spec de domínio foi alterada por esta revisão.
- Consulte `docs/SPEC.md` §4.1 para o índice de specs por domínio.
- Formato padrão de arquivo: cabeçalho (versão/data/status) + objetivo + US + regras + exemplos E2E + histórico.
