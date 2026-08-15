# src/app — Rotas e Layouts (App Router)

## Função

Raiz das rotas da aplicação Next.js (App Router). Aqui vivem os arquivos de rota fina (`parse → service → respond`, AGENTS.md §6), os layouts de área, o estilo global e o SEO técnico do site:

- `page.tsx` (raiz) — index page da home `/` (landing).
- `layout.tsx` (raiz) — root layout da aplicação (html/body, fontes, providers).
- `globals.css` — tokens de DESIGN.md §12-13 (light/dark), aplicados via CSS variables (criado no S1).
- `sitemap.ts` + `robots.ts` — sitemap.xml e robots gerados (SPEC-landing.md:74).
- Subpastas por área: `(landing)/`, `(auth)/`, `app/`, `admin/`, `verificar/`, `api/`.

## Arquitetura

- **Rotas finas**: route handlers e Server Components apenas parseiam a requisição, chamam o service e respondem. Lógica de negócio NUNCA mora aqui (AGENTS.md §6).
- **URLs por área** (SPEC-frontend.md:77-80):
  - `/` — home (landing)
  - `/precos`, `/sobre` — públicas, layout landing
  - `/login`, `/cadastro` — auth (centrado)
  - `/app/*` — área do aluno (app-shell, protegida por role)
  - `/admin/*` — painel administrativo (admin-shell, protegida por role)
  - `/verificar/[codigo]` — certificado público (layout minimal)
  - `/api/*` — route handlers (auth, webhooks, downloads)
- **Layouts por área** (SPEC-frontend.md:93-104): landing, auth, app-shell, admin-shell e player/leitura (o 5º layout, imersivo, no segmento `app/cursos/[slug]/materiais/[id]/`).

## Decisões tomadas

| Data | Decisão |
|---|---|
| 2026-08-14 | Árvore de rotas criada antes do código (estrutura + READMEs); `page.tsx`/`layout.tsx` serão criados nos slices |
| 2026-08-14 | Route groups `(landing)` e `(auth)` para layout compartilhado sem prefixo de URL |

## Informações úteis

- Estrutura de rotas e layouts: [SPEC-frontend.md](docs/specs/SPEC-frontend.md):73-104.
- Layout landing: [SPEC-frontend.md](docs/specs/SPEC-frontend.md):93.
- SEO técnico (sitemap.xml + robots, SSG/ISR da landing): [SPEC-landing.md](docs/specs/SPEC-landing.md):74.
- Tokens light/dark de `globals.css`: [DESIGN.md](docs/DESIGN.md) §12-13.
- NOTA (5º layout): player/leitura é imersivo, conteúdo central 72ch e barra lateral contextual — [SPEC-frontend.md](docs/specs/SPEC-frontend.md):104.
- DÉBITO DE DOCS: a tabela de rotas de SPEC-frontend.md:77-88 está desatualizada em relação às US aprovadas em 2026-08-13 (US-44..48) — revisão de spec futura, não corrigir agora.
