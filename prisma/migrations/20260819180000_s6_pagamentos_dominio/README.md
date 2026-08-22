# Migration S6 — Domínio de Pagamentos

## Função

Adiciona o contrato persistente mínimo do domínio S6.1: periodicidade e preço único, compras pendentes, assinaturas do aluno, entitlements vinculados e eventos externos idempotentes.

## Arquitetura

Esta migration histórica adiciona as estruturas-base de `purchases`, `subscriptions` e `webhook_events`, além de tornar `mp_payment_id` nullable, sem remover dados. Ela **não contém ainda** `tentativas`/`ultimo_erro`, checks/índices parciais de compra/entitlement ou cascades corretivos.

## Decisões tomadas

| Data | Decisão |
|---|---|
| 2026-08-19 | S6.1 usa `subscriptions` para recorrência, Checkout Pro fica fora desta migration e eventos são únicos por provedor + recurso + tipo |
| 2026-08-19 | Refinamentos pendentes para a próxima migration incremental: máximo de 1 tentativa + 3 reprocessamentos, checks/índices/cascades SQL e nenhum retry financeiro automático |

## Informações úteis

- Contrato funcional aprovado: `docs/specs/SPEC-pagamentos.md` v0.7.
- Modelo de persistência S6.1 implementado: `docs/modelo-de-dados.md` §2.6 v0.6 (checks/índice parcial/cascade aplicados pela migration `20260819210000_s6_pagamentos_invariantes`).
- Próxima migration (S6.2/S6.3): após aprovação, executar preflight de duplicidades/violações e aplicar os refinamentos incrementalmente. Não usar reset ou db push, nem fazer reconciliação financeira automática.
