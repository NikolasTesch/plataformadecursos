# SPEC-PAGAMENTOS — Produtos, Checkout e Webhooks (Mercado Pago)

- **Versão**: 0.7
- **Data**: 2026-08-19
- **Status**: [APROVADO — 2026-08-19]
- **Domínio master**: US-10, US-16, US-17, US-18, US-32, US-33, US-34 (SPEC master v2.1 §4)

---

## 1. Objetivo

Definir o comportamento de produtos comerciais (assinatura mensal/anual e venda única), compra pendente como intenção de checkout, contratação recorrente via Mercado Pago Subscriptions/preapproval, venda única via Checkout Pro (cartão e Pix), processamento de webhooks, assinatura do aluno e ciclo de vida do entitlement (concessão, renovação, expiração, cancelamento e reembolso).

> **Revisão v0.7 aprovada explicitamente em 2026-08-19:** a v0.6 permaneceu pendente e nunca foi aprovada. Assinaturas mensais/anuais usam Mercado Pago Subscriptions/preapproval; vendas únicas usam Checkout Pro; Pix fica restrito à venda única; webhooks `subscription` e `payment` são tratados separadamente. A aprovação documental não implica que o S6 esteja implementado.

---

## 2. User Stories Cobertas

| US | Título | Origem |
|---|---|---|
| US-10 | Admin gerencia produtos | Master v1.0 |
| US-16 | Aluno compra (Checkout Pro para venda única e Subscriptions/preapproval para recorrência) | Master v1.0 |
| US-17 | Webhook processa pagamento | Master v1.0 |
| US-18 | Renovação e expiração de assinatura | Master v1.0 |
| US-32 | Trial gratuito (7 dias, sem cartão) | Master v2.1 |
| US-33 | Assinatura anual configurável | Master v2.1 |
| US-34 | Pagamento via Pix | Master v2.1 |
| US-45 | Admin cria cupons de desconto | Master v2.5 |
| US-46 | Aluno aplica cupom no checkout | Master v2.5 |

## 3. Comportamento Detalhado

### 3.1 Produtos (US-10)
- **Assinatura**: nome, preço mensal, **preço anual (configurável; default = 10x mensal, ou seja, 2 meses grátis — P0-2)**, `status` (ativo/inativo). **1 assinatura com 2 períodos (mensal e anual)** — decisão D-P1 revogada em 2026-08-12 (antes: 1 plano único).
- **Venda única**: nome, `preco_unico_cents`, curso vinculado com unicidade 1:1, `status`.
- Produtos inativos: ocultos da página de preços; entitlements existentes continuam válidos até expiração (não revoga retroativamente).
- Alterar preço: afeta novas compras apenas; renovações de assinatura seguem o preço vigente na renovação.

### 3.1b Trial gratuito (US-32)
- **7 dias, sem cartão** (P0-1): aluno ativa trial em 1 clique na página de preços (ou no CTA de material bloqueado).
- Trial concede acesso equivalente a assinatura ativa por 7 dias (mesmos cursos `incluido_assinatura`).
- Regras:
  - 1 trial por usuário (campo `users.trial_usado`); tentar ativar de novo → erro "trial já utilizado".
  - Trial não é renovável; não se converte automaticamente em cobrança (sem cartão salvo).
  - Trial não cria Checkout Pro, pagamento ou preapproval; ao terminar, expira pelo gating.
  - Aluno pode assinar/renovar normalmente durante ou após o trial — compra não é bloqueada.
  - Expiração do trial: mesmo mecanismo de expiração de assinatura (gating por demanda + job diário).
  - Trial não acumula com assinatura: ativar assinatura durante trial encerra o trial (substituído pelo entitlement de pagamento).

### 3.2 Checkout (US-16)
- Página de preços: assinatura (mensal + anual com badge de economia) e cursos avulsos.
- Fluxo comum: escolher produto/período → criar e persistir uma `purchase` com status `pendente` no servidor → iniciar a cobrança no provedor correspondente → retorno à plataforma com estado `pendente`.
- A `purchase` pendente é a intenção de checkout: identifica o aluno autenticado, o produto, o período escolhido, o valor e eventual cupom. Seu `purchases.id` é a referência externa única enviada ao provedor; a compra pendente não concede acesso.
- **Venda única**: usar Mercado Pago Checkout Pro, com cartão de crédito e **Pix** (US-34); o retorno do Checkout Pro não aprova a compra nem concede acesso.
- **Assinatura recorrente**: usar Mercado Pago Subscriptions/preapproval, com período mensal ou anual; não usar Checkout Pro para criar a cobrança recorrente.
- **Métodos da assinatura**: oferecer somente os métodos efetivamente suportados pelo checkout da assinatura/preapproval. **Pix não é método de assinatura nesta revisão** e permanece restrito à venda única.
- Bloqueio de compra duplicada: aluno com `venda_unica` permanente do curso não vê/compra novamente (R9).
- Aluno com assinatura ativa pode comprar venda única (acúmulo permitido — acesso soma, não substitui).
- Compra de venda única por aluno sem conta: exigir login/cadastro antes do checkout (D-P2).
- O período `mensal` ou `anual` pertence a cada compra de assinatura; a mesma assinatura comercial oferece os dois períodos, e a escolha não é uma propriedade fixa do produto.
- Assinatura mensal: ao comprar, entitlement `acesso_ate = now + 30 dias` (via webhook, P1); renovação soma 30 dias ao fim vigente.
- Assinatura anual: ao comprar, entitlement `acesso_ate = now + 365 dias` (via webhook, P1); renovação soma 365 dias ao fim vigente.

### 3.2a Compra pendente como intenção de checkout
- Toda tentativa de checkout cria uma `purchase` pendente antes do redirecionamento ao MP.
- A `purchase` mantém o estado do fluxo (`pendente`, `aprovado`, `recusado` ou `reembolsado`) e usa seu `id` como referência externa única; retornos de navegador apenas exibem o estado, sem aprovar a compra.
- O webhook validado atualiza a mesma `purchase`, preservando o período e o valor registrados. Uma mesma compra não pode originar dois efeitos de concessão.
- A compra registra o `payment_id` quando houver pagamento e referencia o entitlement concedido ou atualizado; a assinatura do aluno registra o `mp_subscription_id` da preapproval.

### 3.3 Webhook (US-17)
- Validação HMAC das chamadas do MP; rejeitar não autenticadas (resposta 401, sem processar).
- O fluxo de venda única processa eventos `payment.*` do Checkout Pro; o fluxo recorrente processa eventos `subscription.*` da preapproval e pagamentos recorrentes vinculados à `subscription_id`. Os recursos e tipos de evento permanecem separados para idempotência e reconciliação.
- Eventos tratados:
  - Eventos `payment.*` do Checkout Pro → `payment.approved` em venda única cria entitlement permanente (R3); `payment.refused` não concede acesso; `refund` revoga o entitlement permanente.
  - Eventos de pagamento recorrente → pagamento aprovado vinculado à `subscription_id` atualiza a compra do ciclo e renova `acesso_ate = max(now, acesso_ate) + período da compra` (30 ou 365 dias, R8).
  - Eventos `subscription.*` da preapproval → `subscription.updated` atualiza o estado da assinatura; `subscription.cancelled` marca a assinatura como cancelada, impede nova renovação e mantém o acesso até `acesso_ate`; `subscription.paused` marca a assinatura do aluno como pausada, com acesso mantido até o fim do período pago.
  - `refund` de cobrança recorrente encerra a continuidade da assinatura, mas mantém o acesso até `acesso_ate`.
- **Idempotência**: cada evento é identificado por provedor + recurso externo (`payment_id`, `subscription_id` ou outro recurso informado) + tipo de evento. Eventos duplicados com a mesma combinação não alteram estado duas vezes (E2E-6); `mp_payment_id` isoladamente não é chave suficiente.
- Falha de processamento: resposta 500 ao MP + retry (até 3) + log para reconciliação manual.

### 3.4 Assinatura do aluno (US-18)
- A assinatura do aluno vincula `user`, produto, período vigente, `mp_subscription_id` da preapproval no Mercado Pago, status e `acesso_ate`.
- Uma assinatura ativa pode ser mensal ou anual conforme a compra que a originou; renovações preservam esse período até nova compra/alteração explícita.
- Cancelamento normal não revoga o período já pago: marca a assinatura como cancelada, não agenda nova cobrança e mantém o entitlement utilizável até `acesso_ate`.
- Refund de uma cobrança de assinatura produz o mesmo comportamento de acesso do cancelamento normal: encerra a continuidade da assinatura, mas mantém o acesso até `acesso_ate`. O gating continua avaliando a data, não apenas o status.

### 3.5 Ciclo de vida do entitlement (US-18)
- Renovação: apenas via webhook (nunca job manual) — R8.
- Expiração: avaliação por demanda (a cada requisição de gating, `acesso_ate >= now`) + job diário de limpeza/marcadores.
- Aluno vê status da assinatura na UI: ativa (data fim), expirando (≤3 dias — notificação US-23), expirada (CTA renovar).
- Refund (reembolso): webhook de refund → venda única revoga o entitlement permanente; assinatura encerra a continuidade e mantém o acesso até `acesso_ate`.

### 3.6 Cupons de desconto (US-45, US-46)
- **Admin (US-45)**: CRUD de cupons — código único (case-insensitive), tipo `percentual` (1–100) ou `fixo` (R$), valor, escopo (`assinatura` | `venda_unica` | produto específico), validade (`valido_de`/`valido_ate`), limite de uso (opcional), status ativo/inativo.
- **Checkout (US-46)**: campo de cupom na página de checkout; validação no servidor:
  - Ativo, dentro da validade, com uso disponível, escopo compatível com o produto.
  - Erros amigáveis: "cupom expirado" · "cupom esgotado" · "cupom inválido".
  - **1 cupom por compra**; não acumula com trial (D-K2) — aluno em trial que aplica cupom: desconto vale para a 1ª cobrança da compra efetiva.
- **Cálculo**: valor final = preço − desconto (nunca negativo); refletido na tela antes do redirecionamento ao MP; MP recebe o valor final.
- **Desconto apenas na 1ª cobrança (D-K1)**: renovações de assinatura seguem o preço cheio vigente — a criação da preapproval usa o valor do item; renovações do plano não incluem o cupom.
- **Registro**: `purchases.coupon_id` (nullable) + contador de usos no cupom; limite de uso validado atomicamente (evita estouro por concorrência).

---

## 4. Regras Específicas do Domínio

| # | Regra |
|---|---|
| P1 | Entitlement concedido **somente** via webhook validado — nunca por estado do checkout na UI. |
| P2 | Renovação soma ao fim atual (R8) — nunca ao presente. |
| P3 | Idempotência por provedor + recurso externo + tipo de evento; `mp_payment_id` isoladamente não basta. |
| P4 | Refund revoga imediatamente entitlement permanente; em assinatura, encerra a continuidade e mantém acesso até `acesso_ate`. |
| P5 | Produto inativo não afeta entitlements já concedidos. |
| P6 | Compra avulsa duplicada bloqueada (R9). |
| P7 | 1 trial por usuário, sem cartão, 7 dias; trial não renovável nem conversível automaticamente. |
| P8 | Assinatura anual: +365 dias na renovação (R8 adaptado); preço anual configurável (default 10x mensal). |
| P9 | Pix e cartão via Checkout Pro somente para venda única; assinaturas recorrentes usam Subscriptions/preapproval e seus eventos próprios. |
| P10 | Cupom válido = ativo + dentro da validade + uso disponível + escopo compatível; validação no servidor. |
| P11 | Desconto do cupom incide somente na 1ª cobrança (D-K1); renovações a preço cheio. |
| P12 | 1 cupom por compra; não acumula com trial nem com outro cupom (D-K2); uso registrado em `purchases.coupon_id`. |
| P13 | Todo checkout começa por uma `purchase` pendente persistida, vinculada ao aluno, produto, período e valor; `purchases.id` é a referência externa e retorno de UI não concede acesso. |
| P14 | O período mensal/anual é registrado por compra e determina a duração da concessão/renovação. |
| P15 | A assinatura do aluno mantém status, período, recurso externo e entitlement; cancelamento normal e refund preservam acesso até `acesso_ate`. |
| P16 | Cada compra efetiva referencia o entitlement concedido ou atualizado, permitindo rastrear compra → acesso. |
| P17 | `payment_id` identifica pagamentos/ciclos; `subscription_id` identifica a assinatura recorrente; cada evento usa a chave única `(provedor, recurso_id, tipo_evento)`. |
| P18 | Cancelamento de assinatura é solicitado exclusivamente via suporte nesta versão; cancelamento/refund de assinatura preserva acesso até `acesso_ate` quando o período estiver pago. |
| P19 | Pix é aceito somente na venda única via Checkout Pro; assinatura usa apenas métodos suportados pelo checkout da preapproval. |
| P20 | Código S6, schema físico e integração não são implementados antes da aprovação explícita desta revisão v0.7. |

---

## 5. Exemplos End-to-End

### E2E-P1 — Renovação soma ao fim (E2E-5 da master)
**Given** assinatura com `acesso_ate = 15/09`
**When** pagamento recorrente aprovado em 10/09 e vinculado à `subscription_id` da preapproval
**Then** `acesso_ate` = 15/10

### E2E-P2 — Refund de venda única revoga
**Given** aluno com venda única aprovada
**When** webhook de refund do pagamento do Checkout Pro chega
**Then** entitlement removido; materiais do curso voltam a `bloqueado`

### E2E-P3 — Webhook inválido rejeitado
**Given** chamada ao endpoint de webhook sem assinatura HMAC válida
**When** o servidor processa
**Then** responde 401 e nenhum estado é alterado

### E2E-P4 — Duplicidade não duplica
**Given** webhook `payment.approved` do mesmo recurso, com o mesmo tipo de evento, entregue 2x
**When** processado 2x
**Then** entitlement criado uma única vez

### E2E-P11 — Provedores separados
**Given** uma venda única e uma assinatura mensal
**When** o aluno inicia os dois fluxos
**Then** a venda única usa Checkout Pro e a assinatura usa Subscriptions/preapproval, sem criar assinatura recorrente pelo Checkout Pro

### E2E-P9 — Refund de assinatura mantém acesso até o fim
**Given** assinatura com entitlement válido até 15/09 e refund aprovado em 10/09
**When** webhook de refund é processado
**Then** assinatura não terá nova cobrança, mas o aluno mantém acesso até 15/09

### E2E-P10 — Cancelamento normal mantém acesso até o fim
**Given** assinatura mensal com `acesso_ate = 15/09`
**When** aluno cancela em 10/09
**Then** assinatura fica cancelada, não renova e o acesso permanece disponível até 15/09

### E2E-P5 — Trial único e expirante
**Given** aluno ativou trial de 7 dias
**When** tenta ativar trial novamente no dia seguinte
**Then** erro "trial já utilizado"; entitlement do 1º trial segue valendo até expirar

### E2E-P6 — Renovação anual soma 365 dias
**Given** assinatura anual com `acesso_ate = 15/03/2027`
**When** renovação anual aprovada em 10/03/2027
**Then** `acesso_ate = 15/03/2028`

### E2E-P7 — Cupom expirado rejeitado
**Given** cupom com `valido_ate` no passado, escopo compatível
**When** aluno aplica o cupom no checkout
**Then** erro "cupom expirado" e o valor permanece cheio

### E2E-P8 — Desconto só na primeira cobrança
**Given** aluno compra assinatura mensal com cupom de 50% (valor da 1ª cobrança = metade)
**When** ocorre a 1ª renovação mensal via webhook
**Then** a renovação cobra o preço cheio vigente e o entitlement renova normalmente (R8)

---

## 6. Decisões do Domínio

| Data | Decisão |
|---|---|
| 2026-08-12 | D-P1 **revogada**: 1 assinatura com 2 períodos (mensal/anual); anual configurável, default 10x mensal (P0-2) |
| 2026-08-12 | D-P2: compra exige conta (login/cadastro antes do checkout) |
| 2026-08-12 | Reembolso tratado via webhook; a consequência de acesso depende do tipo da compra |
| 2026-08-12 | P0-1: trial 7 dias sem cartão, 1 por usuário |
| 2026-08-13 | D-K1: cupom desconta somente a 1ª cobrança (renovações a preço cheio) |
| 2026-08-13 | D-K2: 1 cupom por compra; não acumula com trial nem com outro cupom |
| 2026-08-19 | Revisão [PENDENTE]: refund de assinatura e cancelamento normal mantêm acesso até `acesso_ate`; compra pendente como intenção, período por compra, assinatura do aluno, idempotência por recurso + evento e vínculo compra → entitlement explicitados |
| 2026-08-19 | Revisão [PENDENTE] v0.6: assinaturas recorrentes usam Subscriptions/preapproval; vendas únicas usam Checkout Pro; IDs e eventos permanecem separados. |
| 2026-08-19 | Revisão [APROVADA] v0.7: Pix somente em venda única; assinatura somente com métodos suportados pela preapproval; cancelamento exclusivamente via suporte; webhooks `subscription` e `payment` distintos; S6 ainda não implementado. |

---

## 7. Histórico

| Versão | Data | Mudança |
|---|---|---|
| 0.1 | 2026-08-12 | Versão inicial para aprovação |
| 0.2 | 2026-08-12 | Trial 7 dias sem cartão (US-32), período anual configurável (US-33, D-P1 revogada), Pix (US-34) |
| 0.2 | 2026-08-12 | **APROVADA** — revisão de aplicabilidade concluída |
| 0.3 | 2026-08-13 | **Cupons de desconto (US-45/46)** — §3.5, regras P10–P12, E2E-P7/P8 (D-K1/D-K2) |
| 0.5 | 2026-08-19 | **PENDENTE — aguardando aprovação**: contrato mínimo de checkout, período por compra, assinatura, idempotência e vínculo compra → entitlement. |
| 0.5 | 2026-08-19 | **APROVADO — aprovação explícita do usuário**: contrato mínimo de S6 confirmado, incluindo refund/cancelamento de assinatura com acesso até `acesso_ate`. |
| 0.6 | 2026-08-19 | **PENDENTE**: aprovação v0.5 supersedida pela separação entre Subscriptions/preapproval para recorrência e Checkout Pro para vendas únicas. |
| 0.6 | 2026-08-19 | **PENDENTE — nunca aprovada**: revisão de separação de provedores, IDs e eventos; foi supersedida pela v0.7. |
| 0.7 | 2026-08-19 | **APROVADO — aprovação explícita do usuário; único contrato vigente**: contrato financeiro revisado; Pix somente na venda única, métodos da assinatura limitados à preapproval, cancelamento via suporte e webhooks distintos; S6 permanece não implementado. |
| 0.6 | 2026-08-19 | **CORRIGIDO — nunca aprovada**: a revisão v0.6 permaneceu pendente e foi supersedida pela v0.7. |
| 0.7 | 2026-08-19 | **APROVADO — aprovação explícita do usuário**: v0.7 é o único contrato vigente para implementação futura; S6 permanece não implementado. |
