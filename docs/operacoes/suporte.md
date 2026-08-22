# Suporte operacional

- **Versão**: 0.2
- **Data**: 2026-08-19
- **Status**: [PENDENTE — decisão técnica/validação operacional]

## 1. Função e limites

Definir a triagem e o escalonamento de solicitações de cancelamento,
reembolso, privacidade e cobrança. Este documento não cria política legal nem
afirma que Mercado Pago, email, banco gerenciado ou ferramenta de atendimento
estejam configurados.

Contatos ainda pendentes:

| Papel | Contato/canal |
|---|---|
| Suporte de primeiro nível | `<CONTATO_SUPORTE_N1>` |
| Operação/plantão | `<CONTATO_OPERACAO>` |
| Financeiro/cobrança | `<CONTATO_FINANCEIRO>` |
| Privacidade/encarregado | `<CONTATO_PRIVACIDADE>` |
| Técnico/incidentes | `<CONTATO_TECNICO>` |
| Escalonamento Mercado Pago | `<CONTATO_MERCADO_PAGO>` |

- [ ] Escolher ferramenta/canal de atendimento e preencher os contatos.
- [ ] Definir SLAs por severidade, horário de atendimento e idioma.
- [ ] Definir política aprovada de cancelamento, reembolso e retenção.

## 2. Triagem inicial

- [ ] Criar protocolo `<ID-ATENDIMENTO>` e registrar data/hora, canal, usuário
      e categoria.
- [ ] Confirmar identidade com o mínimo necessário; nunca pedir senha,
      `AUTH_SECRET`, token, CVV, código Pix ou segredo de webhook.
- [ ] Coletar produto, `payment_id`/referência não sensível, valor/data e
      descrição; mascarar dados pessoais nos registros.
- [ ] Classificar: cancelamento, reembolso, privacidade, cobrança, acesso,
      incidente ou outro.
- [ ] Verificar duplicidade de solicitação e incidente aberto relacionado.
- [ ] Atribuir severidade conforme `resposta-a-incidentes.md` e encaminhar pelo
      contato definido; contato não preenchido é pendência operacional.

## 3. Cancelamento exclusivamente por suporte

Nesta versão, o cancelamento de assinatura é solicitado exclusivamente ao
suporte. Não há autoatendimento para cancelamento: o aluno deve abrir um
protocolo e o suporte conduz o encaminhamento. Este runbook não cria contrato
financeiro novo nem define elegibilidade, prazo ou efeito econômico; apenas
organiza o atendimento e a evidência. A regra operacional documentada é não
alterar entitlement diretamente.

- [ ] Confirmar titularidade e assinatura/produto correto.
- [ ] Registrar pedido, motivo opcional e instante do pedido.
- [ ] Encaminhar a solicitação pelo processo operacional aprovado quando a
      integração estiver disponível; não oferecer fluxo de autoatendimento nem
      alterar entitlement diretamente.
- [ ] Confirmar ao aluno o estado: solicitado, cancelado, pendente ou erro;
      informar a data de fim conhecida sem prometer processamento inexistente.
- [ ] Conferir webhook/estado interno e registrar reconciliação.
- [ ] Se houver cobrança posterior ao cancelamento, abrir categoria de cobrança
      e escalar ao financeiro/provedor.
- [ ] Se a solicitação não puder ser processada, não fechar o protocolo: escalar
      e comunicar o próximo passo.

## 4. Reembolso — triagem sem novo contrato

Este procedimento apenas recebe e escala a solicitação conforme a política
aprovada e o fluxo existente; não decide novo prazo, elegibilidade ou condição
financeira.

- [ ] Confirmar compra, titularidade, produto, status e existência de
      solicitação duplicada.
- [ ] Verificar a política aprovada e a autorização do responsável financeiro;
      esta documentação não define prazo ou elegibilidade legal.
- [ ] Solicitar/processar reembolso somente pelo fluxo oficial definido para o
      Mercado Pago, se configurado.
- [ ] Não conceder reembolso manual nem editar entitlement sem trilha de
      aprovação e identificação do pagamento.
- [ ] Aguardar/validar webhook de refund; então confirmar revogação conforme
      SPEC-pagamentos P4 ou abrir reconciliação se houver divergência.
- [ ] Informar ao aluno o estado e o próximo acompanhamento, sem afirmar que o
      provedor processou algo quando não houver evidência.

## 5. Privacidade e LGPD

- [ ] Verificar identidade antes de exportar, corrigir ou excluir dados.
- [ ] Registrar o pedido com acesso restrito e prazo `<SLA_PRIVACIDADE_A_DEFINIR>`.
- [ ] Para exportação, encaminhar ao fluxo US-24; entregar apenas por canal
      autorizado e URL temporária, sem anexar dados ao ticket comum.
- [ ] Para exclusão, encaminhar ao fluxo aprovado: remover dados pessoais,
      progresso e anotações; preservar apenas registros de compra anonimizados
      quando houver obrigação fiscal.
- [ ] Não excluir dados por pedido informal de terceiro ou sem confirmação de
      escopo.
- [ ] Registrar conclusão, exceções de retenção e responsável; não registrar o
      conteúdo completo dos dados eliminados.
- [ ] Escalar dúvida de titularidade, incidente de exposição ou pedido legal ao
      contato de privacidade; tratar exposição como incidente de segurança.

## 6. Cobrança e divergência

- [ ] Identificar se é cobrança pendente, recusada, duplicada, renovação,
      cupom, Pix ou diferença entre MP e plataforma.
- [ ] Conferir compra interna, evento webhook, idempotência e entitlement;
      nunca liberar acesso apenas por comprovante enviado pelo usuário.
- [ ] Para aprovado sem acesso ou acesso sem aprovado, abrir reconciliação em
      `mercado-pago-e-webhooks.md` e escalar ao financeiro/técnico.
- [ ] Para cobrança recorrente após cancelamento, preservar evidências e
      escalar sem prometer estorno automático.
- [ ] Para dados de cartão, orientar o canal oficial e não armazenar dados
      completos no suporte.

## 7. Escalonamento e encerramento

| Situação | Escalonar para | Condição de encerramento |
|---|---|---|
| Solicitação simples de cancelamento | `<CONTATO_OPERACAO>` | Estado confirmado e aluno informado |
| Reembolso/duplicidade/cobrança | `<CONTATO_FINANCEIRO>` + `<CONTATO_MERCADO_PAGO>` | Resultado do provedor e reconciliação registrados |
| Exportação/exclusão/retificação | `<CONTATO_PRIVACIDADE>` | Escopo, execução e retenções documentados |
| Exposição, acesso indevido ou perda de dados | `<CONTATO_TECNICO>` | Incidente encerrado conforme runbook |
| Falha ampla ou múltiplos tickets | `<CONTATO_OPERACAO>` | Severidade e comunicação controladas |

- [ ] Registrar dono, prazo a definir, última atualização e próxima ação.
- [ ] Manter o protocolo aberto enquanto houver dependência externa ou
      reconciliação pendente.
- [ ] Encerrar somente com resultado, evidência mínima, comunicação e motivo.
- [ ] Remover/mascarar dados pessoais desnecessários após a retenção aprovada.

## Histórico

| Versão | Data | Mudança |
|---|---|---|
| 0.1 | 2026-08-19 | Rascunho de triagem, escalonamento, cancelamento, reembolso, privacidade e cobrança |
| 0.2 | 2026-08-19 | Cancelamento de assinatura consolidado como solicitação exclusivamente via suporte; reembolso mantido como triagem sem novo contrato |
