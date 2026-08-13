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

## Informações úteis

- Consulte `docs/SPEC.md` §4.1 para o índice de specs por domínio.
- Formato padrão de arquivo: cabeçalho (versão/data/status) + objetivo + US + regras + exemplos E2E + histórico.
