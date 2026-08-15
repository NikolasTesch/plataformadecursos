# src — Código-fonte da Plataforma

## Função

Código-fonte da plataforma ConcursFoco (Next.js com App Router + TypeScript), organizado em 4 subáreas:

- **`app/`** — rotas e layouts da aplicação: `/` (landing, route group `(landing)`), `/admin/*` (painel administrativo) e `/app/*` (área do aluno). Inclui `middleware.ts` na raiz de `src/`.
- **`services/`** — lógica de negócio por domínio (auth, conteudo, video, questoes, aluno, gating, pagamentos, trilhas, flashcards, comunidade, notificacoes, engajamento, editais, admin).
- **`lib/`** — infraestrutura: db, auth, storage, video, pagamento, mail, rate-limit, sanitize, pdf.
- **`components/`** — componentes de UI por área (`ui` base sobre shadcn, landing, auth, app, admin, player).

## Arquitetura

- **Rotas finas**: `parse → service → respond` (AGENTS.md §6). Route handlers e Server Components apenas parseiam a requisição, chamam o service e devolvem a resposta.
- **Lógica de negócio NUNCA vive em rotas**: todo comportamento fica em `src/services/`, que por sua vez consome `src/lib/`.
- **`src/lib/` é infra consumida por services**: clientes singleton e integrações (banco, auth, storage, pagamento) — nunca chamados direto por rotas.
- **Route groups** (`(landing)`, `(auth)`): agrupam layouts compartilhados sem adicionar segmento de URL.

```
src/
├── middleware.ts       # Proteção de rotas por role (SPEC-frontend.md:89)
├── app/                # Rotas (finas) e layouts
├── services/           # Lógica de negócio
├── lib/                # Infraestrutura
└── components/         # UI
```

## Decisões tomadas

| Data | Decisão |
|---|---|
| 2026-08-14 | Nomes de pastas e URLs em pt-BR (ex.: `/app/questoes`, `/admin/cursos`); tabelas do banco em inglês `snake_case` |
| 2026-08-14 | Route groups usados só onde não há prefixo de URL (`(landing)`, `(auth)`) — layout compartilhado sem segmento extra |

## Informações úteis

- Estrutura de pastas e convenções de código: AGENTS.md §4 e §6.
- Objetivo e design system da interface: [docs/specs/SPEC-frontend.md](docs/specs/SPEC-frontend.md):12.
- `src/middleware.ts` (proteção de rotas por role, autorização no servidor): SPEC-frontend.md:89.
- `src/app/globals.css` (tokens de DESIGN.md §12-13, light/dark) viverá em `src/app/` no S1.
- NOTA (débito de docs): a tabela de rotas de SPEC-frontend.md:77-88 está desatualizada em relação às US aprovadas em 2026-08-13 (US-44..48) — revisão de spec futura, não corrigir agora.
