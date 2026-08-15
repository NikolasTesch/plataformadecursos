# (landing) — Route Group da Landing

## Função

Route group que agrupa as rotas públicas de conversão sob o layout de landing (header fixo com logo, nav, CTA "Entrar"/"Assinar", hero, seções e footer — SPEC-frontend.md:93). Agrupa `precos/`, `sobre/`, `cursos/[slug]/` e `checkout/`. A home `/` (`src/app/page.tsx`) é documentada em `src/app/README.md`.

## Arquitetura

- O group NÃO adiciona segmento de URL: `(landing)/precos` responde em `/precos`, `(landing)/cursos/[slug]` em `/cursos/[slug]`.
- O layout de landing (`layout.tsx` neste segmento, criado no S1) envolve todas as rotas do group com um CTA primário por viewport (R-L1).
- Rotas do group são públicas e finas; as rotas de venda apontam para `checkout/`.

## Decisões tomadas

| Data | Decisão |
|---|---|
| 2026-08-14 | Group usado para layout compartilhado sem prefixo de URL (mesmo padrão de `(auth)`) |

## Informações úteis

- Layout landing (header, hero, seções, footer, 1 CTA por viewport): [SPEC-frontend.md](docs/specs/SPEC-frontend.md):93.
- Estratégia de conversão (CTA único, âncoras `#precos`): [SPEC-landing.md](docs/specs/SPEC-landing.md):48-50.
- Seções da landing: [SPEC-landing.md](docs/specs/SPEC-landing.md):28-42.
