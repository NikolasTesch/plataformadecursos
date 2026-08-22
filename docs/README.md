# docs — Documentação do Projeto

## Função

Toda a documentação do ConcursFoco vive aqui: visão de produto, contrato comportamental, specs de domínio, modelo de dados e plano de implementação. É a fonte única de verdade que antecede e orienta qualquer linha de código. O conjunto segue o princípio do projeto (AGENTS.md §1): nenhuma linha de código existe sem documentação que a anteceda.

## Arquitetura

A documentação segue o fluxo SDD (Spec Driven Development, AGENTS.md §2):

```
docs/
├── PRD.md                  # Visão de produto (problema, personas, escopo, RNF, métricas)
├── SPEC.md                 # Spec master — contrato global (papéis, regras R1–R12, US-01 a US-48)
├── DESIGN.md               # Direção visual e arte (paleta, tipografia, dark mode, prototipagem)
├── modelo-de-dados.md      # Schema consolidado (base do Prisma no S1)
├── plano-de-implementacao.md  # Slices S1–S8 e ordem de entrega
├── legal/                  # Documentos legais — rascunhos [PENDENTE]
├── operacoes/              # Runbooks operacionais — rascunhos [PENDENTE]
│   ├── README.md           # Índice, baseline S1–S8 e regras operacionais
│   ├── go-live.md          # Gates e declaração de lançamento comercial
│   └── suporte.md          # Triagem e escalonamento de suporte
└── specs/                  # Specs por domínio + matriz de aprovação
    ├── README.md           # Índice e regras das specs de domínio
    ├── STATUS-APROVACAO.md # Checklist de aprovação SDD (15 specs aprovadas)
    └── SPEC-<dominio>.md   # Uma spec por domínio
```

Fluxo: o **PRD** define o produto; a **SPEC master** detalha o contrato global (papéis, regras R1–R12, user stories); as **specs de domínio** detalham o comportamento de cada área; o **modelo de dados** consolida o schema; o **plano de implementação** organiza a entrega em slices. `legal/` e `operacoes/` são áreas de apoio já existentes, mas seus documentos permanecem como rascunhos `[PENDENTE]`: não são requisitos aprovados e não alteram o PRD, a SPEC master ou as specs de domínio aprovadas. Documentos seguem o ciclo `[PENDENTE]` → `[APROVADO]` — nunca se implementa documento `[PENDENTE]`.

## Decisões tomadas

| Data | Decisão |
|---|---|
| 2026-08-12 | Estrutura de documentação (PRD + SPEC master + specs por domínio + modelo de dados + plano) aprovada pelo usuário |
| 2026-08-12 | 13 specs de domínio aprovadas + modelo de dados e plano de implementação aprovados (S1 habilitado) |
| 2026-08-13 | `SPEC-frontend.md` v0.2 e `DESIGN.md` v0.7 aprovados |
| 2026-08-13 | `SPEC-landing.md` v0.2 aprovada — **15 specs de domínio aprovadas**; novas US na master v2.5 (US-44 a US-48) |
| 2026-08-13 | `SPEC-mobile.md` mantida como **idealização** — fora do escopo ativo, sem bloqueio de implementação |
| 2026-08-14 | Criação deste `docs/README.md` (pasta `docs/` sem README era débito do AGENTS.md §3) |
| 2026-08-19 | S4 — Questões concluído/aprovado; 341 testes unitários, 23 E2E e QA manual integrado F1–F4 aprovados |
| 2026-08-19 | S5 — Vídeo concluído e formalmente aprovado pelo usuário; passou no gate técnico final: 377 testes unitários, 28 E2E, lint, build e `prisma validate`/`prisma migrate status`; validação manual operacional com credenciais e painel Bunny real permanece pendente como validação pré-go-live; S6 não foi iniciado |
| 2026-08-19 | Decisão operacional: lançamento comercial somente após conclusão e aprovação de todos os slices S1–S8; runbooks permanecem pendentes |
| 2026-08-19 | Revisão de ordem do S7 aprovada: divisão em S7.1 (núcleo — trilhas US-25, simulados US-27, flashcards US-26, liberado pós-S5 e sem dependência de S6) e S7.2 (restante — comentários US-28, avaliações US-47/48, PWA/ZIP US-30/43, editais US-42, condicionado a S6 para *entitlements* e à decisão de jobs/scheduler); nenhuma spec de domínio alterada |

## Informações úteis

- Estado atual (2026-08-19): **S5 — Vídeo concluído e formalmente aprovado pelo usuário**, com gate técnico final concluído (377 testes unitários, 28 E2E, lint, build e `prisma validate`/`prisma migrate status`). A validação manual operacional com credenciais e painel Bunny reais (upload TUS, callback/webhook e player tokenizado) permanece pendente como validação pré-go-live; S6 não foi iniciado. A pendência residual do S3 permanece: os testes atuais cobrem E1–E4, E7, AL1 e AL2, mas não há comprovação de execução/aprovação integral de E1–E7/AL1/AL2 nem da revisão final; E5/E6 não estão cobertos no conjunto atual. Revisão de ordem do plano aprovada em 2026-08-19: o S7 foi dividido em **S7.1** (núcleo — trilhas US-25, simulados US-27, flashcards US-26), planejado e liberado para implementação após S5, sem dependência de S6, e **S7.2** (restante — comentários US-28, avaliações US-47/48, PWA/ZIP US-30/43, editais US-42), que permanece pós-S6 (para *entitlements*) e pós-decisão de jobs/scheduler (para PWA sync offline, geração assíncrona de ZIP e rastreamento/scraping de editais). Nenhuma spec de domínio foi alterada por esta revisão.
- [docs/PRD.md](docs/PRD.md) — visão de produto v2.3 (aprovação vigente)
- [docs/SPEC.md](docs/SPEC.md) — spec master (contrato global, US-01 a US-48, regras R1–R12)
- [docs/DESIGN.md](docs/DESIGN.md) — direção visual e arte (tokens light/dark, prototipagem)
- [docs/modelo-de-dados.md](docs/modelo-de-dados.md) — schema consolidado (base do Prisma no S1)
- [docs/plano-de-implementacao.md](docs/plano-de-implementacao.md) — slices S1–S8 e ordem de entrega
- [docs/legal/README.md](docs/legal/README.md) — índice dos documentos legais em rascunho `[PENDENTE]`; não altera as specs aprovadas
- [docs/operacoes/README.md](docs/operacoes/README.md) — índice dos runbooks operacionais em rascunho `[PENDENTE]`; não altera as specs aprovadas
- [docs/operacoes/suporte.md](docs/operacoes/suporte.md) — triagem e escalonamento de suporte em rascunho `[PENDENTE]`
- [docs/specs/README.md](docs/specs/README.md) — índice e regras das specs de domínio
- [docs/specs/STATUS-APROVACAO.md](docs/specs/STATUS-APROVACAO.md) — matriz de aprovação e decisões da revisão de pendências
- Regras do fluxo: AGENTS.md §2 (SDD) e §5 (convenções de documentação).
- Armadilha: documentos `[PENDENTE]` não podem ser implementados; isso inclui `legal/` e `operacoes/`. `SPEC-mobile.md` está em `[IDEALIZAÇÃO]` e não bloqueia nem habilita implementação.
