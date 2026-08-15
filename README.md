# Plataforma de Estudos para Concursos

Plataforma web de ambiente de estudo para concursos públicos: painel administrativo para publicação de conteúdo (PDF, texto, vídeo, questões, resumos) e área do aluno com progresso, anotações, questões, simulados, flashcards e trilhas por edital. Monetização mista: assinatura mensal/anual + venda única via Mercado Pago.

> **Princípio do projeto: DOCUMENTAÇÃO.** Nenhuma linha de código existe sem documentação que a anteceda. Consulte [AGENTS.md](AGENTS.md) antes de qualquer trabalho.

## Stack

Next.js (App Router) + TypeScript · PostgreSQL · Prisma · Cloudflare R2 · Bunny Stream · Mercado Pago · Vercel · Vitest · Playwright

## Estrutura

```
├── docs/                 # TODA a documentação
│   └── specs/            # Specs por domínio + STATUS-APROVACAO.md
├── src/                  # Código Next.js (App Router)
│   ├── app/              # Rotas (finas: parse → service → respond)
│   │   ├── (landing)/    # Públicas sem prefixo de URL
│   │   │   ├── precos/
│   │   │   ├── sobre/
│   │   │   ├── cursos/
│   │   │   │   └── [slug]/
│   │   │   └── checkout/
│   │   ├── (auth)/       # Autenticação
│   │   │   ├── login/
│   │   │   ├── cadastro/
│   │   │   └── verificar-email/
│   │   │       └── [token]/
│   │   ├── app/          # Área do aluno (/app/*)
│   │   │   ├── cursos/
│   │   │   │   └── [slug]/
│   │   │   │       └── materiais/
│   │   │   │           └── [id]/
│   │   │   ├── questoes/
│   │   │   ├── simulados/
│   │   │   │   └── [id]/
│   │   │   ├── flashcards/
│   │   │   ├── trilhas/
│   │   │   │   └── [editalId]/
│   │   │   ├── concursos/
│   │   │   │   └── [id]/
│   │   │   ├── anotacoes/
│   │   │   ├── configuracoes/
│   │   │   └── notificacoes/
│   │   ├── admin/        # Painel administrativo (/admin/*)
│   │   │   ├── cursos/
│   │   │   ├── materiais/
│   │   │   ├── produtos/
│   │   │   ├── cupons/
│   │   │   ├── usuarios/
│   │   │   ├── relatorios/
│   │   │   ├── editais/
│   │   │   ├── comentarios/
│   │   │   └── landing/
│   │   ├── verificar/    # Certificado público
│   │   │   └── [codigo]/
│   │   └── api/          # Route handlers finos
│   ├── services/         # Lógica de negócio (nunca em rotas)
│   │   ├── auth/
│   │   ├── conteudo/
│   │   ├── video/
│   │   ├── questoes/
│   │   ├── aluno/
│   │   ├── gating/
│   │   ├── pagamentos/
│   │   ├── trilhas/
│   │   ├── flashcards/
│   │   ├── comunidade/
│   │   ├── notificacoes/
│   │   ├── engajamento/
│   │   ├── editais/
│   │   └── admin/
│   ├── lib/              # Infra (consumida por services)
│   │   ├── db/
│   │   ├── auth/
│   │   ├── storage/
│   │   ├── video/
│   │   ├── pagamento/
│   │   ├── mail/
│   │   ├── rate-limit/
│   │   ├── sanitize/
│   │   └── pdf/
│   └── components/       # UI (sobre base shadcn em ui/)
│       ├── ui/
│       ├── landing/
│       ├── auth/
│       ├── app/
│       ├── admin/
│       └── player/
├── prisma/               # Schema e migrations
├── tests/                # unit (Vitest) + e2e (Playwright)
│   ├── unit/
│   └── e2e/
└── public/               # Estáticos + PWA assets futuros
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
| [docs/SPEC.md](docs/SPEC.md) | Spec master: papéis, regras R1–R12, US-01–48, exemplos E2E |
| [docs/DESIGN.md](docs/DESIGN.md) | Direção visual: paleta, tipografia, dark mode, prototipagem (63 telas) |
| [docs/specs/](docs/specs/) | 15 specs de domínio aprovadas (auth, conteudo, video, questoes, aluno, pagamentos, admin, trilhas, flashcards, comunidade, notificacoes, engajamento, editais, frontend, landing) + mobile (idealização) |
| [docs/modelo-de-dados.md](docs/modelo-de-dados.md) | Schema consolidado e decisões de banco |
| [docs/plano-de-implementacao.md](docs/plano-de-implementacao.md) | Plano de slices S1–S8 |

## Status do projeto

- Greenfield — documentação concluída em 2026-08-13 (PRD v2.3 · SPEC master v2.5 · 15 specs de domínio aprovadas · DESIGN v0.7 — todos aprovados)
- Estrutura de pastas criada + README por pasta (2026-08-14)
- Fase atual: **especificação concluída** — implementação não iniciada (próximo slice: **S1 — Fundação**)
- Marca: **ConcursFoco**
