# src/app — Rotas e Layouts (App Router)

## Função

Raiz das rotas da aplicação Next.js (App Router). Aqui vivem os arquivos de rota fina (`parse → service → respond`, AGENTS.md §6), os layouts de área, o estilo global e o SEO técnico do site:

- `page.tsx` (raiz) — **EXISTE (S1)**: landing stub da home `/` (todo 13/16, smoke validado).
- `layout.tsx` (raiz) — **EXISTE (S1)**: root layout (html/body, fontes) criado no scaffold Next 16.
- `globals.css` — **EXISTE (S1)**: tema **default do shadcn** (`@theme inline` + `@import "shadcn/tailwind.css"`) — os tokens de DESIGN.md §12-13 (light/dark da marca) ainda **pendentes**, entram no slice de frontend.
- `sitemap.ts` + `robots.ts` — sitemap.xml e robots gerados (SPEC-landing.md:74).
- Subpastas por área: `(landing)/`, `(auth)/`, `app/`, `admin/`, `verificar/`, `api/`.

## Arquitetura

- **Rotas finas**: route handlers e Server Components apenas parseiam a requisição, chamam o service e respondem. Lógica de negócio NUNCA mora aqui (AGENTS.md §6).
- **URLs por área** (SPEC-frontend.md:77-80):
  - `/` — home (landing)
  - `/precos`, `/sobre` — públicas, layout landing
  - `/login`, `/cadastro` — auth (centrado) — **implementadas no S1**
  - `/app/*` — área do aluno (app-shell, protegida por role) — stub S1
  - `/admin/*` — painel administrativo (admin-shell, protegida por role)
  - `/verificar/[codigo]` — certificado público (layout minimal)
  - `/api/*` — route handlers (auth, webhooks, downloads) — `api/auth/[...nextauth]` existe
- **Layouts por área** (SPEC-frontend.md:93-104): landing, auth (**`(auth)/layout.tsx` existe no S1**), app-shell (S2), admin-shell e player/leitura (o 5º layout, imersivo, no segmento `app/cursos/[slug]/materiais/[id]/`).

## Decisões tomadas

| Data | Decisão |
|---|---|
| 2026-08-14 | Árvore de rotas criada antes do código (estrutura + READMEs); `page.tsx`/`layout.tsx` serão criados nos slices |
| 2026-08-14 | Route groups `(landing)` e `(auth)` para layout compartilhado sem prefixo de URL |
| 2026-08-15 | Scaffold Next 16.3.1 (create-next-app, temp-dir) criou `layout.tsx`/`globals.css`/`page.tsx` da raiz; `globals.css` traz o tema default do shadcn — tokens da marca (DESIGN.md §12-13) ficam para o slice de frontend |
| 2026-08-19 | `proxy.ts` na raiz de `src/` (não em `app/`) protege `/admin` e `/app` por role (todo 8, Edge-safe), conforme a convenção Next.js 16 |

## Informações úteis

- Estrutura de rotas e layouts: [SPEC-frontend.md](docs/specs/SPEC-frontend.md):73-104.
- Layout landing: [SPEC-frontend.md](docs/specs/SPEC-frontend.md):93.
- SEO técnico (sitemap.xml + robots, SSG/ISR da landing): [SPEC-landing.md](docs/specs/SPEC-landing.md):74.
- Tokens light/dark de `globals.css`: [DESIGN.md](docs/DESIGN.md) §12-13 — **pendente no S1** (globals.css usa tema default do shadcn).
- NOTA (5º layout): player/leitura é imersivo, conteúdo central 72ch e barra lateral contextual — [SPEC-frontend.md](docs/specs/SPEC-frontend.md):104.
- DÉBITO DE DOCS: a tabela de rotas de SPEC-frontend.md:77-88 está desatualizada em relação às US aprovadas em 2026-08-13 (US-44..48) — revisão de spec futura, não corrigir agora.
