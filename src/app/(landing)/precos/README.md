# precos — Planos e Preços

## Função

Página pública `/precos` com a tabela de planos: assinatura mensal, anual (2 meses grátis, P0-2) e venda única por curso, com trial de 7 dias sem cartão em destaque (P0-1) e formas de pagamento Pix e cartão via Mercado Pago (SPEC-landing.md:37).

## Arquitetura

- Rota pública com layout landing (SPEC-frontend.md:80, :93).
- Alvo das âncoras `#precos` da landing (CTA secundário "Ver planos" — SPEC-landing.md:50).
- Página fina: lê produtos ativos (assinatura + cursos avulsos) via service e renderiza (SPEC.md:193); CTA de compra aponta para `checkout/`.

## Decisões tomadas

| Data | Decisão |
|---|---|
| 2026-08-14 | Rota pública de planos criada antes do código (estrutura + README) |

## Informações úteis

- Seção de planos e preços da landing: [SPEC-landing.md](docs/specs/SPEC-landing.md):37.
- Âncora `#precos`: [SPEC-landing.md](docs/specs/SPEC-landing.md):50.
- US-16 (página de preços lista produtos ativos): [SPEC.md](docs/SPEC.md):193.
- Regras de produto de pagamento (trial P0-1, anual P0-2): [SPEC-pagamentos.md](docs/specs/SPEC-pagamentos.md).
