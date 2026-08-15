# public — Arquivos Estáticos

## Função

Arquivos estáticos servidos na raiz (`/`) pela aplicação: logo, favicon e demais assets públicos. Também receberá os assets do PWA (manifest, service worker e ícones) quando o suporte offline for implementado.

## Arquitetura

- Todo conteúdo desta pasta é servido pelo **Next.js em runtime** no caminho `/` (ex.: `public/logo.svg` → `/logo.svg`).
- Nada aqui passa por autenticação ou gating — só arquivos intencionalmente públicos devem entrar.
- Assets com controle de acesso ficam em storage assinado (Cloudflare R2), fora desta pasta.

## Decisões tomadas

| Data | Decisão |
|---|---|
| 2026-08-14 | Pasta criada para estáticos; incluirá PWA assets futuros: `manifest.webmanifest`, service worker (`sw`), ícones — SPEC-aluno.md:65-70 (US-30 PWA) e PRD.md:134 |

## Informações úteis

- Requisito PWA/offline: [docs/specs/SPEC-aluno.md](docs/specs/SPEC-aluno.md):65-70 (US-30) — instalação, app shell cacheado, download gerenciado de materiais.
- RNF de PWA/offline: [docs/PRD.md](docs/PRD.md):134.
- Downloads offline em lote (ZIP) e seus assets não entram nesta pasta — referenciam [docs/specs/SPEC-aluno.md](docs/specs/SPEC-aluno.md):76-77 (geração assíncrona, URL assinada).
