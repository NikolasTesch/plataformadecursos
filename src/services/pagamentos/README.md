# src/services/pagamentos — Assinaturas, Venda Única, Cupons e Webhooks

## Função

Regras de domínio persistentes de monetização: produtos (assinatura mensal/anual configurável + venda única), compras pendentes, assinaturas, eventos externos idempotentes e entitlements. Este slice implementa S6.1 (aprovado em 2026-08-19); integrações Mercado Pago, HMAC, Checkout Pro/preapproval, rotas, UI, trial e cupons permanecem nos slices seguintes (S6.2/S6.3).

Fonte de verdade: SPEC-pagamentos v0.7 funcionalmente aprovada em [../../../docs/specs/SPEC-pagamentos.md](../../../docs/specs/SPEC-pagamentos.md); modelo de dados §2.6 v0.6 **aprovado** em [../../../docs/modelo-de-dados.md](../../../docs/modelo-de-dados.md).

## Arquitetura

- **Produtos**: `products` com `tipo` (`assinatura`/`venda_unica`). Uma única assinatura com dois períodos (mensal e anual) — decisão D-P1 revogada (2026-08-12); preço anual configurável, default 10x mensal.
- **Compras**: uma `purchase` pendente é a intenção de checkout; `purchases.id` é sua referência externa. `mp_payment_id` é nullable/unique e não substitui `webhook_events` para idempotência.
- **Assinaturas**: `subscriptions` registra o aluno, período, `mp_subscription_id`, status e `acesso_ate`; renovações usam o período da compra e cancelamento/refund preservam o acesso pago.
- **Entitlements**: concessão somente durante o processamento de evento externo já validado; venda única é permanente, assinatura tem `acesso_ate`.
- **Eventos**: `webhook_events` persiste payload e unicidade por provedor + recurso + tipo; este serviço não valida HMAC. O evento é persistido em transação curta e separada **antes** dos efeitos; criação concorrente da mesma chave recupera o evento existente (race do unique). `processado` é terminal (no-op duplicado); `recebido`/`falhou` podem reprocessar até 1+3 tentativas. Falhas de domínio são persistidas **dentro da mesma transação que retém o lock `FOR UPDATE`** (não após soltá-lo): o evento passa a `falhou`, `tentativas` é incrementado e `ultimo_erro` sanitizado (≤2000 chars, sem payload/segredo) é gravado via `updateMany` com `where` condicional. Somente se essa transação abortar (ex.: a própria persistência da falha falhou ou houve serialização) é acionado um **fallback condicional separado** (`registrarFalha`, em nova transação) — que também usa `updateMany` com `where: { status: { not: "processado" }, tentativas: { lt: 4 } }`, jamais sobrescrevendo `processado`, jamais lançando P2025 e jamais permitindo a 5ª tentativa.
- **Locks**: efeitos rodam em transação com `SELECT ... FOR UPDATE` explícito na ordem evento → purchase → subscription → entitlement. Chamadas externas nunca entram na transação.
- **Máquina de estados**: `pendente→aprovado` uma vez; `pendente→recusado`; `aprovado→reembolsado`; recusada/reembolsada não reativam; refund de pendente falha reprocessável; refund de recusada é no-op (mantém estado, não cancela assinatura); aprovação atrasada após refund/cancelamento é no-op sem entitlement adicional. Refund decide venda única vs assinatura pelo **tipo do produto** (carregado da purchase). Em refund de **assinatura**, se o evento traz `subscription_id` divergente do da compra, lança `DomainError` e **não cancela nem reembolsa nada**; para venda única o `subscription_id` do evento é ignorado (decisão pelo tipo do produto). `subscription.updated` sem `subscription_status` falha (não reativa `expirada`).
- **Aprovação confia no snapshot da purchase**: não revalida preço/ativo do produto na aprovação (validação ocorre em `criarCompraPendente`). Se `mp_payment_id` da compra divergir do `recurso_id` do evento, a aprovação lança erro de integridade (não concede acesso silenciosamente).
- **Retry**: limite 1+3 (`MAX_TENTATIVAS=4`); tentativas contam a tentativa inicial (sucesso também incrementa). Falha registrada com `where: { id, status: { not: "processado" } }` (não sobrescreve evento já processado) e o erro é propagado para a rota responder 500.
- **Renovação**: decide pelo tipo do produto; assinatura exige `purchase.subscription_id`, evento e período snapshot, com base `max(now, acesso_ate)` + 30/365 dias; unicidade/lock impedem perda de período e entitlement duplicado. Pagamento não reativa assinatura cancelada nem limpa `cancelada_em`; pausada mantém-se pausada; expirada volta a ativa só por nova compra pendente aprovada. Refund de assinatura cancela continuidade mas preserva acesso; venda única remove o entitlement.
- **Expiração**: `marcarAssinaturasExpiradas(now)` marca ativa/pausada vencida como `expirada` (domínio puro, sem job/rota).

| # | Regra |
|---|---|
| P1 | Entitlement concedido **somente** via webhook validado — nunca por estado do checkout na UI. |
| P2 | Renovação soma ao fim atual (R8) — nunca ao presente. |
| P3 | Idempotência por provedor + recurso externo + tipo de evento; `mp_payment_id` sozinho não basta. |
| P4 | Refund revoga entitlement permanente; em assinatura, encerra a continuidade e mantém acesso até `acesso_ate`. |
| P5 | Produto inativo não afeta entitlements já concedidos. |
| P6 | Compra avulsa duplicada bloqueada (R9). |

- **Provedores**: apenas persistência e regras de domínio estão neste slice; Checkout Pro e Subscriptions/preapproval são S6.2.

## Decisões tomadas

| Data | Decisão |
|---|---|
| 2026-08-14 | `pagamentos/` concentra produtos, compras, cupons e entitlements (modelo-de-dados.md §2.6); integração Mercado Pago vive em `lib/pagamento` |
| 2026-08-12 | D-P1 revogada: passa a existir **1 assinatura com 2 períodos** (mensal e anual), não 2 produtos |
| 2026-08-12 | D-K1: desconto do cupom incide somente na 1ª cobrança; D-K2: 1 cupom por compra, não acumula com trial |
| 2026-08-12 | Trial: sem cartão, 7 dias, 1 por usuário (`users.trial_usado`), não renovável |

## Informações úteis

- Spec de domínio: [../../../docs/specs/SPEC-pagamentos.md](../../../docs/specs/SPEC-pagamentos.md) v0.7 — contrato funcional aprovado.
- Modelo de dados: [../../../docs/modelo-de-dados.md](../../../docs/modelo-de-dados.md) §2.6 v0.6 **aprovado** (`products`, `purchases`, `subscriptions`, `webhook_events`, `entitlements`).
- Slice: [../../../docs/plano-de-implementacao.md](../../../docs/plano-de-implementacao.md):72-79 (S6 — Mercado Pago, trial, Pix; US-45/46 cupons).
- Testes S6.1: `tests/unit/services-pagamentos.test.ts` cobre validações de produto, máquina de estados, não-reativação, refund, expiração e retry persistido. **Evidência de locks/unique parcial/concurrency em banco PostgreSQL real EXISTE** — suíte de integração `tests/integration/pagamentos.test.ts` (10 testes, `npm run test:pg`), executada contra o banco de teste isolado `concursfoco_test` (porta 5433), provando retry ≤4, renovações sem perda de período, 1 entitlement concorrente, registro+aprovação 30/365d, refund divergente e invariantes de schema; os mesmos invariantes são garantidos pela migration `20260819210000_s6_pagamentos_invariantes`.
- Anti-padrão: conceder entitlement por estado do checkout na UI (viola P1); aplicar desconto em renovações (viola D-K1).
