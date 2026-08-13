# Plataforma de Estudos para Concursos

Plataforma web de ambiente de estudo para concursos públicos: painel administrativo para publicação de conteúdo (PDF, texto, vídeo, questões, resumos) e área do aluno com progresso, anotações, questões, simulados, flashcards e trilhas por edital. Monetização mista: assinatura mensal/anual + venda única via Mercado Pago.

> **Princípio do projeto: DOCUMENTAÇÃO.** Nenhuma linha de código existe sem documentação que a anteceda. Consulte [AGENTS.md](AGENTS.md) antes de qualquer trabalho.

## Stack

Next.js (App Router) + TypeScript · PostgreSQL · Prisma · Cloudflare R2 · Bunny Stream · Mercado Pago · Vercel · Vitest · Playwright

## Estrutura

```
├── AGENTS.md          # Regras de trabalho (SDD, documentação)
├── docs/              # TODA a documentação
│   ├── PRD.md         # Visão de produto (v2.3)
│   ├── SPEC.md        # Spec master (contrato global, US-01 a US-43)
│   ├── DESIGN.md      # Direção visual e arte (v0.7)
│   ├── modelo-de-dados.md   # Schema consolidado (design de banco)
│   ├── plano-de-implementacao.md  # Slices S1–S8 e ordem de entrega
│   └── specs/         # Specs por domínio (15 arquivos)
├── src/               # Código Next.js (app/, services/, lib/, components/) — A CRIAR no S1
└── prisma/            # Schema e migrations — A CRIAR no S1
```

## Como rodar (a definir no S1)

- `npm run dev` — ambiente de desenvolvimento
- `npx prisma migrate dev` — migrations (PostgreSQL via Docker)
- `npm run test` — testes unitários (Vitest)
- `npm run test:e2e` — testes E2E (Playwright)

## Documentação principal

| Documento | Conteúdo |
|---|---|
| [docs/PRD.md](docs/PRD.md) | Visão de produto, escopo, RNF, métricas |
| [docs/SPEC.md](docs/SPEC.md) | Spec master: papéis, regras R1–R12, US-01–43, exemplos E2E |
| [docs/DESIGN.md](docs/DESIGN.md) | Direção visual: paleta, tipografia, dark mode, prototipagem (63 telas) |
| [docs/specs/](docs/specs/) | 14 specs de domínio aprovadas (auth, conteudo, video, questoes, aluno, pagamentos, admin, trilhas, flashcards, comunidade, notificacoes, engajamento, editais, frontend) + mobile (idealização) |
| [docs/modelo-de-dados.md](docs/modelo-de-dados.md) | Schema consolidado e decisões de banco |
| [docs/plano-de-implementacao.md](docs/plano-de-implementacao.md) | Plano de slices S1–S8 |

## Status do projeto

- Greenfield — documentação concluída em 2026-08-13 (PRD v2.3 · SPEC master v2.3 · 14 specs de domínio · DESIGN v0.7 — todos aprovados)
- Fase atual: **especificação concluída** — implementação não iniciada (próximo slice: **S1 — Fundação**)
- Marca: **ConcursFoco**
