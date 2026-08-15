# src/app/admin/landing — Conteúdo da landing

## Função

Gestão do conteúdo da landing page (URL `/admin/landing`), de uso exclusivo do admin. Cobre os elementos editoráveis que sustentam a conversão (R-L7): **depoimentos**, **números de prova social** e **FAQ**. CRUD simples, seguindo o mesmo padrão da gestão de conteúdo da plataforma (mesmo padrão de US-19/US-31). Cursos em destaque são derivados automaticamente dos cursos publicados — sem manutenção manual (R-L7).

## Arquitetura

- Página sob o layout **admin-shell** (SPEC-frontend.md:102).
- Rota fina: `page.tsx` futuro chama o service `src/services/admin` (gestão de conteúdo); a landing lê esses dados e renderiza **SSG/ISR** (SPEC-landing.md:74).
- FAQ alimenta os dados estruturados `FAQPage` (schema.org) da landing; depoimentos e números de prova social aparecem nas seções públicas sem re-render por requisição.

## Decisões tomadas

| Data | Decisão |
|---|---|
| 2026-08-14 | Rota criada antes do código (estrutura + README), seguindo o contrato do plano de implementação |
| 2026-08-14 | Rota adicionada pela revisão (R-L7) — não consta na tabela de rotas de SPEC-frontend.md:87 (débito de docs, revisão de spec futura) |
| 2026-08-14 | Conteúdo da landing gerido por CRUD do admin (padrão da gestão de conteúdo), não versionado no repo (decisão §10 da SPEC-landing) |

## Informações úteis

- Gestão de conteúdo pela admin (R-L7): [docs/specs/SPEC-landing.md](docs/specs/SPEC-landing.md):77-79 (depoimentos, prova social, FAQ; destaque derivado de cursos publicados).
- Objetivo e analytics (L-A2): SPEC-landing.md:81-83 (funil rastreado desde o S1).
- Landing SSG/ISR com meta tags e dados estruturados: SPEC-landing.md:72-75.
- Slice de implementação: S8 — ver [docs/plano-de-implementacao.md](docs/plano-de-implementacao.md).
