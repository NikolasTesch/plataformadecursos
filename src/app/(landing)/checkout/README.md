# checkout — Checkout (US-16/US-46)

## Função

Página de checkout da plataforma: escolher produto → criar intenção de compra no servidor → redirecionar ao Checkout Pro do Mercado Pago → retorno (success/pending) à plataforma com estado `pendente` (US-16 — SPEC-pagamentos.md:52).

## Arquitetura

- Página fina dentro do layout landing: recebe o produto, chama o service de pagamentos para criar a intenção e redireciona ao Checkout Pro do MP.
- **Campo de cupom (US-46)**: validação no servidor (ativo, dentro da validade, com uso disponível, escopo compatível); o desconto é refletido na tela antes do redirecionamento ao MP, que recebe o valor final (SPEC-pagamentos.md:77, :81).
- Compra de venda única sem conta: exige login/cadastro antes do checkout (D-P2).
- Retorno `success`/`pending` cai na plataforma com estado `pendente`; a confirmação chega via webhook (US-17).

## Decisões tomadas

| Data | Decisão |
|---|---|
| 2026-08-14 | Checkout como página dentro de `(landing)/checkout/` (sem subpastas; o produto chega por parâmetro na navegação no S6) |

## Informações úteis

- Fluxo de checkout US-16: [SPEC-pagamentos.md](docs/specs/SPEC-pagamentos.md):52.
- Cupom no checkout US-46 (campo, validação, refletido antes do redirect): [SPEC-pagamentos.md](docs/specs/SPEC-pagamentos.md):77.
- Webhook que confirma o pagamento (US-17): [SPEC-pagamentos.md](docs/specs/SPEC-pagamentos.md):59-67.
- Bloqueio de compra duplicada (R9) e exigência de login (D-P2): [SPEC-pagamentos.md](docs/specs/SPEC-pagamentos.md):54-56.
