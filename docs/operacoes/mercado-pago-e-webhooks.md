# Mercado Pago e webhooks

- **Versão**: 0.3
- **Data**: 2026-08-19
- **Status**: [PENDENTE — decisão técnica/validação operacional]

## 1. Escopo e estado atual

`docs/SPEC.md` e `docs/specs/SPEC-pagamentos.md` registram o contrato financeiro
v0.7 aprovado: Subscriptions/preapproval para assinaturas mensais/anuais e
Checkout Pro para vendas únicas, com Pix somente na venda única. A operação,
credenciais e validações deste runbook permanecem pendentes.
Este documento prepara a operação, mas **não afirma que conta, aplicação,
credenciais, endpoint público ou integração estejam ativos hoje**. Os nomes de
ambiente, URLs e segredos devem ser preenchidos somente após decisão e uso de
cofre apropriado.

## 2. Decisões pendentes

- [ ] Confirmar conta e modalidade Mercado Pago para cada ambiente, sem
      misturar sandbox e produção.
- [ ] Confirmar URL pública HTTPS do webhook, URL de retorno e domínio.
- [ ] Confirmar armazenamento seguro de `MP_ACCESS_TOKEN` e
      `MP_WEBHOOK_SECRET`, previstos em `.env.example`.
- [ ] Confirmar política de acesso ao painel, usuários autorizados e auditoria.
- [ ] Confirmar como consultar pagamentos/subscrições para reconciliação e a
      retenção dos registros internos.

### 2.1 Contrato financeiro pendente

- [x] Registrar a aprovação explícita de `SPEC-pagamentos.md` v0.7 e `modelo-de-dados.md` §2.6 v0.5; a aprovação não implica implementação.
- [ ] Confirmar os métodos de pagamento suportados pelo checkout da assinatura/preapproval; não oferecer Pix na assinatura.
- [ ] Confirmar que o cancelamento de assinatura será solicitado exclusivamente via suporte nesta versão.
- [ ] Manter o primeiro lançamento comercial bloqueado até a conclusão de S1–S8.
- [ ] Não alterar código S6, dependências, env, migration ou schema físico neste registro documental; S6 permanece não implementado.

## 3. Contrato operacional

- Intenção de compra é criada no servidor; o retorno do provedor mostra estado
  `pendente` e não concede entitlement.
- Venda única usa Checkout Pro; seus eventos `payment.*` tratam cartão e Pix.
- Assinatura mensal/anual usa Subscriptions/preapproval; seus eventos
  `subscription.*` e os pagamentos recorrentes vinculados são processados
  separadamente dos eventos da venda única.
- Cancelamento de assinatura é solicitado exclusivamente via suporte; o período
  pago permanece acessível até `acesso_ate` quando aplicável.
- A concessão ocorre apenas por webhook autenticado e processado com sucesso.
- Pagamento aprovado de venda única cria entitlement permanente.
- Aprovação de assinatura renova a partir do fim atual (`max(now,
  acesso_ate) + 30 dias`, ou +365 dias no plano anual).
- Recusa não concede acesso. Cancelamento/refund de assinatura encerra a
  continuidade e preserva acesso até `acesso_ate`; refund de venda única revoga
  o entitlement permanente.
- O mesmo evento não pode alterar o estado duas vezes: idempotência por
  identificador do pagamento/assinatura + tipo de evento.
- Webhook com HMAC inválido responde 401 e não altera dados.
- Falha transitória de processamento responde 500 para permitir retry, registra
  o evento para reconciliação e não cria concessão parcial.

## 4. Checklist de configuração segura

- [ ] Criar/identificar aplicação no ambiente correto e registrar somente IDs
      não secretos no inventário operacional.
- [ ] Configurar o endpoint HTTPS sem inventar URL neste documento.
- [ ] Armazenar tokens/segredos no cofre escolhido; injetar apenas no runtime.
- [ ] Testar rotação/revogação sem imprimir o valor do segredo.
- [ ] Validar relógio, assinatura HMAC, corpo bruto e rejeição de replay conforme
      contrato do Mercado Pago.
- [ ] Definir retenção de eventos, logs e dados mínimos para LGPD.

## 5. Reconciliação executável

Executar após falha, atraso, duplicidade, refund ou divergência entre MP e
registros internos:

- [ ] Definir janela de análise e extrair eventos internos sem dados sensíveis
      desnecessários.
- [ ] Comparar cada pagamento/subscrição com compra, evento idempotente e
      entitlement correspondente.
- [ ] Separar estados: aprovado, pendente, recusado, cancelado, pausado,
      reembolsado e sem correspondência.
- [ ] Para item sem webhook, consultar a fonte oficial do MP antes de qualquer
      ação manual.
- [ ] Para duplicidade, confirmar que o entitlement só foi criado/renovado uma
      vez e marcar a segunda entrega como processada/idempotente.
- [ ] Para aprovado sem entitlement, corrigir por fluxo idempotente auditado;
      nunca editar acesso diretamente sem registro do motivo.
- [ ] Para entitlement sem pagamento aprovado, suspender concessão suspeita,
      preservar evidências e abrir incidente.
- [ ] Registrar divergências, decisão, executor e validação pós-correção.

## 6. QA de checkout e webhook

- [ ] Produto ativo aparece; produto inativo não aparece.
- [ ] Compra avulsa duplicada é bloqueada para quem já possui entitlement.
- [ ] Assinatura mensal e anual mostram o valor correto.
- [ ] Cupom compatível altera o valor da primeira cobrança; renovação volta ao
      preço cheio; cupom expirado/esgotado é recusado.
- [ ] Cartão aprovado em venda única retorna pendente e só o webhook `payment.*` concede acesso.
- [ ] Pix pendente em venda única permanece sem entitlement; aprovação posterior via webhook `payment.*` concede acesso.
- [ ] Assinatura mensal/anual usa somente métodos suportados pela preapproval; Pix não aparece como método da assinatura.
- [ ] Webhook HMAC inválido retorna 401 sem alteração.
- [ ] Reentrega do mesmo webhook é idempotente.
- [ ] Refund de venda avulsa revoga acesso; refund/cancelamento de assinatura preserva acesso até `acesso_ate`.
- [ ] Renovação antes do vencimento soma ao fim atual, nunca ao presente.
- [ ] Falha transitória gera retry e item reconcilável.
- [ ] Repetir os casos em sandbox e, para produção, somente com compra/teste
      autorizado e evidência financeira definida.

Se sandbox, endpoint ou credenciais ainda não estiverem disponíveis, marcar os
itens como **não executados — dependência pendente**, jamais como aprovados.

## Histórico

| Versão | Data | Mudança |
|---|---|---|
| 0.1 | 2026-08-19 | Rascunho de operação, reconciliação e QA sem alegar integração ativa |
| 0.2 | 2026-08-19 | **PENDENTE**: sincronização com `SPEC-pagamentos.md` v0.7; provedores, métodos, webhooks, cancelamento via suporte e bloqueio de implementação S6 explicitados. |
| 0.3 | 2026-08-19 | Referência financeira v0.7 aprovada explicitamente; validações operacionais, credenciais e integração continuam pendentes e S6 não foi implementado. |
