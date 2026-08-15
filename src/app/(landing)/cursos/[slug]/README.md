# cursos/[slug] — Sales Page Pública do Curso (US-44)

## Função

Página pública de venda do curso em `/cursos/[slug]` (sales page, US-44). Exibe nome, descrição, imagem, grade resumida (módulos com títulos e tipos de materiais), amostra gratuita (R4, máx. 1 por curso), preço (venda única) ou badge "Incluído na assinatura", avaliações aprovadas e CTAs de compra (SPEC-landing.md:53, SPEC-conteudo.md:83-89).

## Arquitetura

- Rota dinâmica pública, SSG/ISR (SPEC-landing.md:74 — landing e sales pages SSG/ISR).
- Página derivada dos cursos publicados: rascunho ou curso sem material publicado → 404 (SPEC-conteudo.md:89).
- **Nunca expõe conteúdo gated**: a grade mostra apenas títulos de materiais, nunca conteúdo (R12); amostra via regra R4.
- CTAs: "Começar trial grátis", "Assinar e acessar" (âncora para `/precos`) e "Comprar curso" (→ `checkout/`, exige login, D-P2).

## Decisões tomadas

| Data | Decisão |
|---|---|
| 2026-08-14 | Rota dinâmica criada antes do código (estrutura + README); página real nos slices S2/S3 |

## Informações úteis

- R-L2 (página pública de curso): [SPEC-landing.md](docs/specs/SPEC-landing.md):53.
- Sales page US-44 (grade, amostra, CTAs, 404): [SPEC-conteudo.md](docs/specs/SPEC-conteudo.md):83-89.
- Regras de gating R1-R12 (conteúdo nunca exposto sem entitlement): [SPEC.md](docs/SPEC.md).
- SEO da sales page (SSG/ISR, dados estruturados `Course`): [SPEC-landing.md](docs/specs/SPEC-landing.md):74-75.
