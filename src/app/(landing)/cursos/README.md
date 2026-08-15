# (landing)/cursos — Sales Pages Públicas de Curso

## Função

Container das sales pages públicas de curso (`[slug]`, US-44). Cada curso publicado gera uma página pública em `/cursos/[slug]` — página de venda com nome, descrição, imagem, grade resumida, amostra gratuita (R4), preço ou badge "Incluído na assinatura", avaliações aprovadas e CTAs de compra (SPEC-landing.md:53, SPEC-conteudo.md:83-89).

## Arquitetura

- Diretório intermediário do segmento dinâmico `[slug]`: a rota real é `/cursos/[slug]` (sem segmento `cursos/` próprio de página).
- Faz parte do route group `(landing)`: usa o layout de landing (header, hero, footer, 1 CTA por viewport).
- Página derivada dos cursos publicados: rascunho ou curso sem material publicado → 404 (SPEC-conteudo.md:89).
- Nunca expõe conteúdo gated: a grade mostra apenas títulos de materiais (R12); amostra via regra R4.

## Decisões tomadas

| Data | Decisão |
|---|---|
| 2026-08-14 | Diretório intermediário criado implicitamente pelas rotas dinâmicas; README adicionado no ajuste de verificação (todo 19) — AGENTS.md §3 exige README em todo diretório |

## Informações úteis

- R-L2 (página pública de curso): [SPEC-landing.md](docs/specs/SPEC-landing.md):53.
- Sales page US-44 (grade, amostra, CTAs, 404): [SPEC-conteudo.md](docs/specs/SPEC-conteudo.md):83-89.
- Documentação detalhada da rota dinâmica: `src/app/(landing)/cursos/[slug]/README.md`.
- Regras de gating R1-R12 (conteúdo nunca exposto sem entitlement): [SPEC.md](docs/SPEC.md).
