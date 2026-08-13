# SPEC-PAGAMENTOS — Produtos, Checkout e Webhooks (Mercado Pago)

- **Versão**: 0.3
- **Data**: 2026-08-13
- **Status**: [APROVADO — 2026-08-12 · revisado 2026-08-13]
- **Domínio master**: US-10, US-16, US-17, US-18, US-32, US-33, US-34 (SPEC master v2.1 §4)

---

## 1. Objetivo

Definir o comportamento de produtos comerciais (assinatura mensal/anual e venda única), trial gratuito, checkout via Mercado Pago (cartão + Pix), processamento de webhooks e ciclo de vida do entitlement (concessão, renovação, expiração).

---

## 2. User Stories Cobertas

| US | Título | Origem |
|---|---|---|
| US-10 | Admin gerencia produtos | Master v1.0 |
| US-16 | Aluno compra (Checkout MP) | Master v1.0 |
| US-17 | Webhook processa pagamento | Master v1.0 |
| US-18 | Renovação e expiração de assinatura | Master v1.0 |
| US-32 | Trial gratuito (7 dias, sem cartão) | Master v2.1 |
| US-33 | Assinatura anual configurável | Master v2.1 |
| US-34 | Pagamento via Pix | Master v2.1 |
| US-45 | Admin cria cupons de desconto | Master v2.5 |
| US-46 | Aluno aplica cupom no checkout | Master v2.5 |

---

## 3. Comportamento Detalhado

### 3.1 Produtos (US-10)
- **Assinatura**: nome, preço mensal, **preço anual (configurável; default = 10x mensal, ou seja, 2 meses grátis — P0-2)**, `status` (ativo/inativo). **1 assinatura com 2 períodos (mensal e anual)** — decisão D-P1 revogada em 2026-08-12 (antes: 1 plano único).
- **Venda única**: nome, preço, curso vinculado (1:1 curso), `status`.
- Produtos inativos: ocultos da página de preços; entitlements existentes continuam válidos até expiração (não revoga retroativamente).
- Alterar preço: afeta novas compras apenas; renovações de assinatura seguem o preço vigente na renovação.

### 3.1b Trial gratuito (US-32)
- **7 dias, sem cartão** (P0-1): aluno ativa trial em 1 clique na página de preços (ou no CTA de material bloqueado).
- Trial concede acesso equivalente a assinatura ativa por 7 dias (mesmos cursos `incluido_assinatura`).
- Regras:
  - 1 trial por usuário (campo `users.trial_usado`); tentar ativar de novo → erro "trial já utilizado".
  - Trial não é renovável; não se converte automaticamente em cobrança (sem cartão salvo).
  - Aluno pode assinar/renovar normalmente durante ou após o trial — compra não é bloqueada.
  - Expiração do trial: mesmo mecanismo de expiração de assinatura (gating por demanda + job diário).
  - Trial não acumula com assinatura: ativar assinatura durante trial encerra o trial (substituído pelo entitlement de pagamento).

### 3.2 Checkout (US-16)
- Página de preços: assinatura (mensal + anual com badge de economia) e cursos avulsos.
- Fluxo: escolher produto → criar intenção de compra no servidor → redirecionar ao Checkout Pro do MP → retorno (success/pending) à plataforma com estado `pendente`.
- **Meios de pagamento**: cartão de crédito e **Pix** (US-34) — ambos suportados nativamente pelo Checkout Pro do MP; Pix sem custo extra para o aluno, QR code/copia-e-cola exibido no checkout.
- Bloqueio de compra duplicada: aluno com `venda_unica` permanente do curso não vê/compra novamente (R9).
- Aluno com assinatura ativa pode comprar venda única (acúmulo permitido — acesso soma, não substitui).
- Compra de venda única por aluno sem conta: exigir login/cadastro antes do checkout (D-P2).
- Assinatura anual: ao comprar, entitlement `acesso_ate = now + 365 dias` (via webhook, P1); renovação anual idem (R8 adaptado: +365).

### 3.3 Webhook (US-17)
- Validação HMAC das chamadas do MP; rejeitar não autenticadas (resposta 401, sem processar).
- Eventos tratados:
  - `payment.approved` (venda única) → cria entitlement permanente (R3).
  - `subscription.updated`/`payment.approved` (renovação) → renova `acesso_ate = max(now, acesso_ate) + 30 dias` (R8 — soma a partir do fim atual).
  - `payment.refused`/`subscription.cancelled` → sem concessão; em cancelamento, acesso permanece até `acesso_ate`.
  - `subscription.paused` → marca produto do aluno como pausado; acesso mantido até fim do período pago.
- **Idempotência**: processamento por `payment_id`/`subscription_id` + tipo de evento; eventos duplicados não alteram estado duas vezes (E2E-6).
- Falha de processamento: resposta 500 ao MP + retry (até 3) + log para reconciliação manual.

### 3.4 Ciclo de vida do entitlement (US-18)
- Renovação: apenas via webhook (nunca job manual) — R8.
- Expiração: avaliação por demanda (a cada requisição de gating, `acesso_ate >= now`) + job diário de limpeza/marcadores.
- Aluno vê status da assinatura na UI: ativa (data fim), expirando (≤3 dias — notificação US-23), expirada (CTA renovar).
- Refund (reembolso): webhook de refund → revoga entitlement da compra (permanente volta a bloqueado; assinatura: trata como cancelamento).

### 3.5 Cupons de desconto (US-45, US-46)
- **Admin (US-45)**: CRUD de cupons — código único (case-insensitive), tipo `percentual` (1–100) ou `fixo` (R$), valor, escopo (`assinatura` | `venda_unica` | produto específico), validade (`valido_de`/`valido_ate`), limite de uso (opcional), status ativo/inativo.
- **Checkout (US-46)**: campo de cupom na página de checkout; validação no servidor:
  - Ativo, dentro da validade, com uso disponível, escopo compatível com o produto.
  - Erros amigáveis: "cupom expirado" · "cupom esgotado" · "cupom inválido".
  - **1 cupom por compra**; não acumula com trial (D-K2) — aluno em trial que aplica cupom: desconto vale para a 1ª cobrança da compra efetiva.
- **Cálculo**: valor final = preço − desconto (nunca negativo); refletido na tela antes do redirecionamento ao MP; MP recebe o valor final.
- **Desconto apenas na 1ª cobrança (D-K1)**: renovações de assinatura seguem o preço cheio vigente — o Checkout Pro de assinatura cobra o valor do item na criação; renovações do plano não incluem o cupom.
- **Registro**: `purchases.coupon_id` (nullable) + contador de usos no cupom; limite de uso validado atomicamente (evita estouro por concorrência).

---

## 4. Regras Específicas do Domínio

| # | Regra |
|---|---|
| P1 | Entitlement concedido **somente** via webhook validado — nunca por estado do checkout na UI. |
| P2 | Renovação soma ao fim atual (R8) — nunca ao presente. |
| P3 | Idempotência por `payment_id` + tipo de evento. |
| P4 | Refund revoga o entitlement correspondente. |
| P5 | Produto inativo não afeta entitlements já concedidos. |
| P6 | Compra avulsa duplicada bloqueada (R9). |
| P7 | 1 trial por usuário, sem cartão, 7 dias; trial não renovável nem conversível automaticamente. |
| P8 | Assinatura anual: +365 dias na renovação (R8 adaptado); preço anual configurável (default 10x mensal). |
| P9 | Pix disponível no checkout; pagamento Pix segue fluxo de webhook idêntico ao cartão (P1–P3). |
| P10 | Cupom válido = ativo + dentro da validade + uso disponível + escopo compatível; validação no servidor. |
| P11 | Desconto do cupom incide somente na 1ª cobrança (D-K1); renovações a preço cheio. |
| P12 | 1 cupom por compra; não acumula com trial nem com outro cupom (D-K2); uso registrado em `purchases.coupon_id`. |

---

## 5. Exemplos End-to-End

### E2E-P1 — Renovação soma ao fim (E2E-5 da master)
**Given** assinatura com `acesso_ate = 15/09`
**When** renovação aprovada em 10/09
**Then** `acesso_ate` = 15/10

### E2E-P2 — Refund revoga
**Given** aluno com venda única aprovada
**When** webhook de refund chega
**Then** entitlement removido; materiais do curso voltam a `bloqueado`

### E2E-P3 — Webhook inválido rejeitado
**Given** chamada ao endpoint de webhook sem assinatura HMAC válida
**When** o servidor processa
**Then** responde 401 e nenhum estado é alterado

### E2E-P4 — Duplicidade não duplica
**Given** webhook `payment.approved` entregue 2x (idempotência)
**When** processado 2x
**Then** entitlement criado uma única vez

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
| 2026-08-12 | Reembolso tratado via webhook (revogação automática) |
| 2026-08-12 | P0-1: trial 7 dias sem cartão, 1 por usuário |
| 2026-08-13 | D-K1: cupom desconta somente a 1ª cobrança (renovações a preço cheio) |
| 2026-08-13 | D-K2: 1 cupom por compra; não acumula com trial nem com outro cupom |

---

## 7. Histórico

| Versão | Data | Mudança |
|---|---|---|
| 0.1 | 2026-08-12 | Versão inicial para aprovação |
| 0.2 | 2026-08-12 | Trial 7 dias sem cartão (US-32), período anual configurável (US-33, D-P1 revogada), Pix (US-34) |
| 0.2 | 2026-08-12 | **APROVADA** — revisão de aplicabilidade concluída |
| 0.3 | 2026-08-13 | **Cupons de desconto (US-45/46)** — §3.5, regras P10–P12, E2E-P7/P8 (D-K1/D-K2) |
