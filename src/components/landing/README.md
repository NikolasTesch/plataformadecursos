# components/landing — Componentes da Landing

## Função

Componentes que montam a experiência pública de conversão: a rota `/` (landing) e as páginas públicas de curso (sales pages `/cursos/[slug]`). O objetivo é transformar visitantes em cadastros, trials e assinantes/compradores, seguindo o funil definido em [docs/specs/SPEC-landing.md](docs/specs/SPEC-landing.md) §3 e as regras de CRO §4. Cada seção da landing (hero, prova social, como funciona, cursos em destaque, depoimentos, planos, FAQ, CTA final, rodapé) tem seu componente aqui, composto sobre a base de `ui/`.

## Arquitetura

Componentes de seção da landing compõem os componentes base de `ui/` (Button, Accordion, Sheet, Toast) e servem as rotas públicas em `src/app/(landing)/`. Seguem o funil de conversão:

```
Topbar fixa → Hero → Prova social → Problema → Como funciona →
Cursos em destaque → Depoimentos → Planos e preços → FAQ → CTA final → Rodapé
```

Regras de composição que os componentes devem respeitar:
- **1 CTA primário por viewport** (R-L1): botão primário com label consistente "Começar trial grátis"; ações secundárias em ghost/outline ("Ver planos" âncora `#precos`, "Entrar").
- **Redução de risco explícita** (R-L4): microcopy nos pontos de decisão (trial sem cartão, cancelamento, pagamento via Mercado Pago, LGPD).
- **Prova social honesta** (R-L3): números e depoimentos exibidos somente com dados reais; antes de existirem, a barra de prova social vira marcas/bancas.
- **FAQ estruturado** (R-L5): perguntas mínimas obrigatórias, em `<details>` nativo para acessibilidade.
- **Performance** (RNF §6): landing inteira com menos de 100KB de JS, sem libs de animação; páginas SSG/ISR.

## Decisões tomadas

| Data | Decisão |
|---|---|
| 2026-08-14 | Pasta criada; componentes de landing concentrados aqui, separados de `ui/` (base shadcn) e de `app/` (área do aluno) |
| 2026-08-14 | Hero segue DESIGN.md §13 (próximo passo dominante, ilustração duotone) — decisão de visual herdada da prototipagem |

## Informações úteis

- Funil e regras CRO: [docs/specs/SPEC-landing.md](docs/specs/SPEC-landing.md) §3-§4 (R-L1 a R-L8).
- Componentes base disponíveis: [src/components/ui/README.md](src/components/ui/README.md) e SPEC-frontend.md §5.
- Tokens e direção visual (linguagem editorial, ilustrações): [docs/DESIGN.md](docs/DESIGN.md) §12-§13.
- Armadilha: nunca exibir métricas ou depoimentos inventados (R-L3) e nunca expor conteúdo pago em cards públicos de curso (R12 da master — sales page mostra só grade de títulos e amostra R4).
- Cursos em destaque derivam automaticamente dos cursos publicados (R-L7), sem manutenção manual.
