# src/services/pagamentos — Assinaturas, Venda Única, Cupons e Webhooks

## Função

Regras de negócio de monetização: produtos (assinatura mensal/anual configurável + venda única), compras, trial, cupons de desconto, checkout Mercado Pago (cartão e Pix), webhooks idempotentes e gestão de entitlements. Implementa as user stories US-10, US-16, US-17, US-18, US-32, US-33, US-34, US-45 e US-46 de `docs/specs/SPEC-pagamentos.md`.

Fonte de verdade: regras P1–P12 em [docs/specs/SPEC-pagamentos.md](docs/specs/SPEC-pagamentos.md):87-102 e modelo em [docs/modelo-de-dados.md](docs/modelo-de-dados.md) §2.6.

## Arquitetura

- **Produtos**: `products` com `tipo` (`assinatura`/`venda_unica`). Uma única assinatura com dois períodos (mensal e anual) — decisão D-P1 revogada (2026-08-12); preço anual configurável, default 10x mensal.
- **Compras e trial**: `purchases` registra `mp_payment_id` (único), status (`pendente`/`aprovado`/`recusado`/`reembolsado`), `tipo` (`checkout`/`trial`) e `coupon_id`. Trial: 7 dias sem cartão, 1 por usuário (campo `users.trial_usado`), não renovável nem conversível automaticamente (P7).
- **Entitlements**: concedidos **somente** via webhook validado (P1) — nunca por estado do checkout na UI. `origem` (`pagamento`/`trial`/`admin`); `acesso_ate` null = permanente (R3).
- **Cupons**: `coupons` com escopo (assinatura/venda única ou produto específico), validade, limite de uso e contador atômico `usos`. Desconto apenas na 1ª cobrança (D-K1); 1 cupom por compra, não acumula com trial nem com outro cupom (D-K2).
- **Webhooks idempotentes** (SPEC-pagamentos.md:91-99):

| # | Regra |
|---|---|
| P1 | Entitlement concedido **somente** via webhook validado — nunca por estado do checkout na UI. |
| P2 | Renovação soma ao fim atual (R8) — nunca ao presente. |
| P3 | Idempotência por `payment_id` + tipo de evento. |
| P4 | Refund revoga o entitlement correspondente. |
| P5 | Produto inativo não afeta entitlements já concedidos. |
| P6 | Compra avulsa duplicada bloqueada (R9). |

- **Pix** (P9): disponível no checkout, fluxo de webhook idêntico ao cartão (P1–P3).

## Decisões tomadas

| Data | Decisão |
|---|---|
| 2026-08-14 | `pagamentos/` concentra produtos, compras, cupons e entitlements (modelo-de-dados.md §2.6); integração Mercado Pago vive em `lib/pagamento` |
| 2026-08-12 | D-P1 revogada: passa a existir **1 assinatura com 2 períodos** (mensal e anual), não 2 produtos |
| 2026-08-12 | D-K1: desconto do cupom incide somente na 1ª cobrança; D-K2: 1 cupom por compra, não acumula com trial |
| 2026-08-12 | Trial: sem cartão, 7 dias, 1 por usuário (`users.trial_usado`), não renovável |

## Informações úteis

- Spec de domínio: [docs/specs/SPEC-pagamentos.md](docs/specs/SPEC-pagamentos.md) — regras P1–P12 (:87-102), webhooks (:59-67), checkout (:52, :77).
- Modelo de dados: [docs/modelo-de-dados.md](docs/modelo-de-dados.md) §2.6 (`products`, `purchases`, `coupons`, `entitlements`, trial).
- Slice: [docs/plano-de-implementacao.md](docs/plano-de-implementacao.md):72-79 (S6 — Mercado Pago, trial, Pix; US-45/46 cupons).
- Testes: **unitários obrigatórios** — idempotência (P3), renovação soma ao fim (P2/R8), trial único, cupom expirado/esgotado/inválido, desconto só na 1ª cobrança. E2E: E2E-P1..P4 (webhook com assinatura válida), E2E-P7/P8 (cupom).
- Anti-padrão: conceder entitlement por estado do checkout na UI (viola P1); aplicar desconto em renovações (viola D-K1).
