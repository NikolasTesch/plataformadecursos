# Migration `20260819210000_s6_pagamentos_invariantes`

## Propósito

Aplica os invariantes de persistência do S6.1 aprovados em `docs/modelo-de-dados.md` §2.6 v0.6 (aprovação explícita do usuário em 2026-08-19). É **incremental e independente** da migration histórica `20260819180000_s6_pagamentos_dominio`, que não foi editada.

## O que faz

1. **`webhook_events`**: adiciona `tentativas` (default 0) e `ultimo_erro` (text) para retry persistido em `recebido`/`falhou` (máx. 1 tentativa inicial + 3 reprocessamentos; `processado` é terminal).
2. **`entitlements.subscription_id`**: torna-se **único** (substitui o índice não-único criado pela migration histórica).
3. **CHECK constraints**:
   - `purchases`: `subscription_id` não-nulo ⇒ `periodicidade` não-nula.
   - `purchases`: `status = 'aprovado'` ⇒ `entitlement_id` não-nulo.
   - `entitlements`: `subscription_id` não-nulo ⇒ `acesso_ate` não-nulo.
4. **Índice parcial único** `purchases_venda_unica_aprovada_key` em `(user_id, product_id)` onde `tipo='checkout' AND status='aprovado' AND subscription_id IS NULL` — garante uma única venda única aprovada por aluno/produto (R9/P6).
5. **FKs de `user_id`** em `purchases` e `subscriptions` recriadas com `ON DELETE CASCADE` (alinhadas ao `onDelete: Cascade` do schema Prisma). Não foram ampliados outros cascades.

## Preflights (abortam sem correção)

Blocos `DO $$` executados antes de qualquer alteração; se encontrarem dados inconsistentes (entitlement duplicado por assinatura, venda única aprovada duplicada, ou violação das novas constraints), a transação é abortada. **Nenhuma correção financeira automática é aplicada.**

## Limitação conhecida

Índices parciais únicos e CHECK constraints não são representáveis de forma declarativa no schema Prisma; por isso vivem exclusivamente neste SQL. O serviço de domínio (`src/services/pagamentos/index.ts`) reforça as mesmas regras em nível de aplicação, mas o banco é a fonte autoritativa.
