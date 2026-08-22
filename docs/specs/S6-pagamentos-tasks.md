# S6 — Tarefas de Pagamentos

- **Versão**: 0.4
- **Data**: 2026-08-19
- **Status**: [APROVADO — 2026-08-19]
- **Spec comportamental**: [SPEC-pagamentos.md](SPEC-pagamentos.md) v0.7 [APROVADO]
- **Modelo mínimo**: [../modelo-de-dados.md](../modelo-de-dados.md) §2.6 v0.6 [APROVADO]

> Checklist liberado após aprovação explícita do modelo S6 v0.6. Itens de implementação serão marcados somente após suas verificações.

## Gate de aprovação

- [x] Usuário aprovou explicitamente `SPEC-pagamentos.md` v0.7.
- [x] Usuário aprovou explicitamente o contrato refinado de `modelo-de-dados.md` §2.6 v0.6.
- [x] Orquestrador registrou a aprovação do refinamento e liberou sua implementação.

## Slices mínimos

### S6.1 — Schema e serviço de domínio

- [x] Implementar o contrato aprovado de `purchases`, `subscriptions`, `webhook_events` e `entitlements`.
- [x] Persistir uma `purchase` pendente antes do redirecionamento, com aluno, produto, período, valor, cupom e `purchases.id` como referência externa.
- [x] Atualizar o estado da compra e conceder acesso somente a partir de evento externo validado.
- [x] Manter `periodicidade` mensal/anual por compra e vincular compra → entitlement.
- [x] Implementar assinatura do aluno, renovação somando 30/365 dias e estados de cancelamento/pausa/expiração.
- [x] Cancelamento normal e refund de assinatura encerram continuidade, mas mantêm acesso até `acesso_ate`; refund de venda única revoga acesso permanente.
- [x] Persistir `webhook_events.tentativas`/`ultimo_erro`, com uma tentativa inicial e até 3 reprocessamentos; `recebido`/`falhou` reprocessáveis e `processado` terminal.
- [x] Aplicar unicidade de entitlement por subscription, checks de compra/entitlement e índice parcial de venda única aprovada via SQL da migration.
- [x] Executar preflight da migration; não realizar reconciliação financeira automática.
  - **Evidências**:
    - [x] Migration/schema revisado contra §2.6 aprovado (`prisma/migrations/20260819210000_s6_pagamentos_invariantes`).
    - [x] Serviço de domínio demonstrado sem concessão por retorno de UI (25 testes unitários em `tests/unit/services-pagamentos.test.ts`, com transação fake — sem banco real).
    - [x] Fluxo de compra, renovação, cancelamento e refund coberto por testes de domínio.
    - [x] **Evidência de locks/unique parcial/concurrency em banco PostgreSQL real**: suíte de integração em `tests/integration/pagamentos.test.ts` (10 testes, `npm run test:pg`), executada com sucesso contra o banco de teste isolado `concursfoco_test` (porta 5433, resolvido exclusivamente via `TEST_DATABASE_URL` validada). Mocks NÃO cobrem locks — a prova real está na integração. Ver seção "Execução PostgreSQL (evidência real)".

### Execução PostgreSQL (evidência real — S6.1)

Suíte: `tests/integration/pagamentos.test.ts` · Config: `vitest.integration.config.mts` ·
Comando: `npm run test:pg` · Banco alvo: `concursfoco_test` (PostgreSQL 16, porta 5433,
após reset autorizado e `prisma migrate status` = "Database schema is up to date!").

**Resultado factual (execução 2026-08-19): 10/10 testes passaram.**

| # | Prova | Resultado |
|---|---|---|
| 1 | Retry concorrente não excede 4 (1 inicial + 3 retries) — 10 chamadas simultâneas para o mesmo evento que falha de domínio; o lock `FOR UPDATE` serializa os incrementos de `tentativas` e o `where` condicional (`tentativas < 4`) impede a 5ª tentativa | `tentativas = 4`, `status = falhou` (nunca 5) |
| 2 | Duas renovações simultâneas não perdem período — lock `FOR UPDATE` em `subscriptions`/`entitlements` força re-leitura de `acesso_ate` após a 1ª concessão | `acesso_ate = T0 + 60d` (mensal), sem perda |
| 3 | Primeira concessão concorrente mantém um único entitlement — idempotência via estado `pendente → aprovado` sob lock | exatamente 1 entitlement; `purchase` `aprovado` |
| 4 | Registro + aprovação na sequência — `registrarAssinatura` cria com `acesso_ate = now` (sem data arbitrária); 1ª aprovação soma 30/365d | `acesso_ate = now + 30d` (mensal) |
| 5 | Refund recorrente com `subscription_id` divergente — `DomainError` antes de qualquer mutação | `subscription` segue `ativa`; `purchase` segue `aprovado` (nada cancelado/reembolsado) |
| 6 | Índice parcial único de venda única aprovada (`purchases_venda_unica_aprovada_key`) | 2ª insert viola → `P2002` |
| 7 | CHECK `purchases_subscription_periodicidade_chk` | insert com `subscription_id` sem `periodicidade` → rejeitado |
| 8 | CHECK `purchases_aprovado_entitlement_chk` | insert `aprovado` sem `entitlement_id` → rejeitado |
| 9 | CHECK `entitlements_subscription_acesso_chk` | insert de entitlement de subscription sem `acesso_ate` → rejeitado |
| 10 | Cascade de `user` → `purchases`/`subscriptions` (`ON DELETE CASCADE`) | delete de user remove ambos |

**Checksums de migration (SHA-256 local × `_prisma_migrations`):** os 7 migrations
aplicadas conferem integralmente (`verify-migrations.mjs`, 2026-08-19):
`20260815133031_init`, `20260815155324_busca_trgm`, `20260819160000_video_provider_id_unique`,
`20260819170000_video_publicado_pronto_check`, `20260819180000_s6_pagamentos_dominio`,
`20260819210000_s6_pagamentos_invariantes`, `20260819211041_s7_trilhas_versao` — todos `OK`.

**Nota de correção de documento (2026-08-19):** o cabeçalho deste checklist estava
marcado `[APROVADO]` enquanto a evidência de locks/concurrency em banco real
permanecia `[ ] PENDENTE` — estado contraditório. O gate S6.1 só é considerado
efetivamente aprovado após a verificação real acima, agora concluída. Linha
pendente removida e substituída por evidência factual.

### S6.2 — Adaptador Mercado Pago

- [ ] Criar assinatura recorrente mensal/anual via Mercado Pago Subscriptions/preapproval e registrar seu `mp_subscription_id`.
- [ ] Criar venda única via Mercado Pago Checkout Pro e enviar `purchases.id` como referência externa; suportar cartão e Pix nesse fluxo.
- [ ] Oferecer na assinatura somente métodos suportados pelo checkout da preapproval; Pix permanece exclusivo da venda única.
- [ ] Validar HMAC antes de qualquer alteração de estado.
- [ ] Normalizar `payment_id` de pagamento/ciclo e `subscription_id` de assinatura, além de refund e tipo de evento, para o serviço de domínio.
- [ ] Persistir idempotência por `provedor + recurso_id + tipo_evento`; `mp_payment_id` isolado não é suficiente.
- **Evidências**:
  - [ ] Testes/fixtures separados para pagamento Checkout Pro e eventos de Subscriptions/preapproval.
  - [ ] Teste de HMAC inválido retorna 401 sem mutação.
  - [ ] Teste de retry e evento duplicado demonstra processamento único.

### S6.3 — Rotas e UI

- [ ] Exibir assinatura mensal/anual e venda única.
- [ ] Criar `purchase` pendente no servidor antes de iniciar o provedor correspondente.
- [ ] Exibir estados `pendente`, aprovado, recusado e reembolsado sem liberar acesso pelo retorno do navegador.
- [ ] Exibir somente o status da assinatura e a data `acesso_ate`.
- [ ] Informar que cancelamento/refund de assinatura mantém acesso até o fim do período pago.
- **Evidências**:
  - [ ] Rota de criação de `purchase` pendente validada no servidor.
  - [ ] Rota de webhook fina: validação → serviço → resposta.
  - [ ] Evidência manual ou automatizada de UI mensal/anual, Checkout Pro para Pix/cartão somente na venda única e status da assinatura.

## Testes obrigatórios

### Unitários

- [ ] Compra pendente: vínculo ao aluno/produto/período e conversão única.
- [ ] Renovação mensal soma 30 dias ao fim vigente.
- [ ] Renovação anual soma 365 dias ao fim vigente.
- [ ] Compra referencia o entitlement correto.
- [ ] Idempotência distingue recurso e tipo de evento e ignora duplicidade.
- [ ] Seleção de provedor: recorrência usa preapproval; venda única usa Checkout Pro.
- [ ] Refund de venda única revoga; refund/cancelamento de assinatura preserva até `acesso_ate`.
- [ ] Trial único, cupom inválido/esgotado/expirado e desconto somente na primeira cobrança.

### E2E

- [ ] Venda única cartão: `purchase` pendente → Checkout Pro → evento de pagamento aprovado → entitlement.
- [ ] Venda única Pix: `purchase` pendente → Checkout Pro → evento de pagamento aprovado → entitlement.
- [ ] Assinatura mensal/anual: `purchase` pendente → preapproval → evento de assinatura/pagamento → entitlement.
- [ ] Webhook HMAC inválido não altera estado.
- [ ] Mesmo evento entregue duas vezes não duplica compra, assinatura ou acesso.
- [ ] Renovação mensal e anual respeita o período registrado na compra.
- [ ] Cancelamento normal mantém acesso até `acesso_ate`.
- [ ] Refund de assinatura mantém acesso até `acesso_ate`; refund de venda única bloqueia novamente.

## Fechamento do slice

- [ ] Unitários verdes e evidências anexadas ao registro do slice.
- [ ] E2E verdes em ambiente com Mercado Pago stub/sandbox.
- [ ] Revisão documental contra SPEC e modelo de dados concluída.
- [ ] Aprovação final do slice registrada pelo usuário/orquestrador.

## Histórico

| Versão | Data | Mudança |
|---|---|---|
| 0.1 | 2026-08-19 | Checklist S6 criado como [PENDENTE], condicionado à aprovação explícita da SPEC e do contrato de schema |
| 0.1 | 2026-08-19 | **APROVADO** — gate de aprovação concluído após aprovação explícita do usuário |
| 0.2 | 2026-08-19 | **PENDENTE** — aprovação v0.5 supersedida; tarefas separadas entre Subscriptions/preapproval e Checkout Pro. |
| 0.2 | 2026-08-19 | **CORRIGIDO** — gate v0.6 permaneceu pendente e nunca recebeu aprovação explícita; a aprovação anterior foi somente da v0.5. |
| 0.3 | 2026-08-19 | **APROVADO — aprovação explícita do usuário**: SPEC funcional v0.7 confirmada; não representa aprovação do modelo de persistência. |
| 0.4 | 2026-08-19 | **PENDENTE**: revisão de persistência com retry 1+3, invariantes, constraints SQL, preflight e ausência de reconciliação financeira automática. |
| 0.5 | 2026-08-19 | **APROVADO (evidência real)**: S6.1 concluído com suíte de integração PostgreSQL real (`tests/integration/pagamentos.test.ts`, 10/10) provando retry ≤4, renovações sem perda de período, 1 entitlement concorrente, registro+aprovação 30/365d, refund divergente e invariantes de schema; checksums das 7 migrations conferem com `_prisma_migrations`. Cabeçalho contraditório (aprovado + pendente) corrigido. |
