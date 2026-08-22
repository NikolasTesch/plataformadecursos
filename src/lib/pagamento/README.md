# src/lib/pagamento — Pagamentos (Mercado Pago)

## Função

Cliente de integração com o **Mercado Pago** para a monetização da plataforma: **Checkout Pro** com **cartão e Pix**, criação de cobrança e processamento de **webhooks idempotentes** (aprovação, reembolso, assinaturas). Centraliza a validação de **assinatura HMAC** e a construção do payload de checkout; consumido por `src/services/pagamentos` (regras de negócio de compra, trial, cupons e entitlements).

## Arquitetura

- `src/lib/pagamento` expõe o cliente MP (criar preferência de checkout, verificar pagamento) e o validador de webhooks; `src/services/pagamentos` orquestra a lógica de negócio (trial único, cupom na 1ª cobrança, criação de entitlement).
- **Webhooks com HMAC (E2E-P3)**: chamada ao endpoint de webhook sem assinatura HMAC válida responde **401 e nenhum estado é alterado** (SPEC-pagamentos.md:151-154).
- **Idempotência (E2E-P4)**: `payment.approved` entregue 2x cria o entitlement uma única vez — a chave persistida é composta por provedor + recurso externo + tipo de evento em `webhook_events`; `purchases.mp_payment_id` sozinho não é suficiente.
- Modelo de cobrança: `purchase` pendente como intenção, 1 assinatura com 2 períodos (mensal/anual, preço anual configurável) + venda única por curso; `subscriptions`, `webhook_events`, cupons (`coupons`, `purchases.coupon_id`) e entitlements conforme [docs/modelo-de-dados.md](docs/modelo-de-dados.md) §2.6.

## Decisões tomadas

| Data | Decisão |
|---|---|
| 2026-08-12 | Pagamento via Mercado Pago — Checkout Pro + webhooks idempotentes, cartão e Pix (decisão técnica vigente, AGENTS.md §10) |
| 2026-08-12 | 1 assinatura com 2 períodos (mensal/anual); preço anual configurável (D-P1 revogada — modelo-de-dados §2.6) |
| 2026-08-13 | Cupom desconta somente a 1ª cobrança (D-K1); 1 cupom por compra, não acumula com trial (D-K2) |
| 2026-08-14 | Criação da estrutura `src/lib/pagamento/` + README |

## Informações úteis

- Exemplos E2E (refund conforme o tipo da compra, webhook inválido 401, duplicidade não duplica, trial único): [docs/specs/SPEC-pagamentos.md](docs/specs/SPEC-pagamentos.md):146-174.
- Produtos, purchases, coupons e entitlements (trial 7 dias via `users.trial_usado`): [docs/modelo-de-dados.md](docs/modelo-de-dados.md) §2.6.
- Gating de conteúdo baseado em entitlements (R1–R12): [docs/SPEC.md](docs/SPEC.md).
- Armadilha: nunca confiar no retorno do cliente para liberar acesso — estado sempre derivado do webhook validado por HMAC e da idempotência no banco.
