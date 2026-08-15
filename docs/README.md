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
└── specs/                  # Specs por domínio + matriz de aprovação
    ├── README.md           # Índice e regras das specs de domínio
    ├── STATUS-APROVACAO.md # Checklist de aprovação SDD (15 specs aprovadas)
    └── SPEC-<dominio>.md   # Uma spec por domínio
```

Fluxo: o **PRD** define o produto; a **SPEC master** detalha o contrato global (papéis, regras R1–R12, user stories); as **specs de domínio** detalham o comportamento de cada área; o **modelo de dados** consolida o schema; o **plano de implementação** organiza a entrega em slices. Documentos seguem o ciclo `[PENDENTE]` → `[APROVADO]` — nunca se implementa documento `[PENDENTE]`.

## Decisões tomadas

| Data | Decisão |
|---|---|
| 2026-08-12 | Estrutura de documentação (PRD + SPEC master + specs por domínio + modelo de dados + plano) aprovada pelo usuário |
| 2026-08-12 | 13 specs de domínio aprovadas + modelo de dados e plano de implementação aprovados (S1 habilitado) |
| 2026-08-13 | `SPEC-frontend.md` v0.2 e `DESIGN.md` v0.7 aprovados |
| 2026-08-13 | `SPEC-landing.md` v0.2 aprovada — **15 specs de domínio aprovadas**; novas US na master v2.5 (US-44 a US-48) |
| 2026-08-13 | `SPEC-mobile.md` mantida como **idealização** — fora do escopo ativo, sem bloqueio de implementação |
| 2026-08-14 | Criação deste `docs/README.md` (pasta `docs/` sem README era débito do AGENTS.md §3) |

## Informações úteis

- [docs/PRD.md](docs/PRD.md) — visão de produto v2.3 (aprovação vigente)
- [docs/SPEC.md](docs/SPEC.md) — spec master (contrato global, US-01 a US-48, regras R1–R12)
- [docs/DESIGN.md](docs/DESIGN.md) — direção visual e arte (tokens light/dark, prototipagem)
- [docs/modelo-de-dados.md](docs/modelo-de-dados.md) — schema consolidado (base do Prisma no S1)
- [docs/plano-de-implementacao.md](docs/plano-de-implementacao.md) — slices S1–S8 e ordem de entrega
- [docs/specs/README.md](docs/specs/README.md) — índice e regras das specs de domínio
- [docs/specs/STATUS-APROVACAO.md](docs/specs/STATUS-APROVACAO.md) — matriz de aprovação e decisões da revisão de pendências
- Regras do fluxo: AGENTS.md §2 (SDD) e §5 (convenções de documentação).
- Armadilha: documentos `[PENDENTE]` não podem ser implementados; `SPEC-mobile.md` está em `[IDEALIZAÇÃO]` e não bloqueia nem habilita implementação.
