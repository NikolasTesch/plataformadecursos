# Política Comercial e de Reembolsos — ConcursFoco

- **Status:** [PENDENTE — revisão jurídica e preenchimento obrigatório]
- **Versão:** 0.4
- **Data:** 2026-08-19
- **Vigência:** [PREENCHER ANTES DO LANÇAMENTO]
- **Última atualização:** 2026-08-19

> **Rascunho.** Este documento não está aprovado e não deve ser publicado sem revisão jurídica, conferência da oferta e preenchimento dos campos obrigatórios. Não constitui aconselhamento jurídico.

## 1. Identificação e canais

- **Responsável pela oferta:** [PREENCHER ANTES DO LANÇAMENTO]
- **Razão social/nome empresarial:** [PREENCHER ANTES DO LANÇAMENTO]
- **CNPJ ou CPF:** [PREENCHER ANTES DO LANÇAMENTO]
- **Endereço:** [PREENCHER ANTES DO LANÇAMENTO]
- **Canal de suporte comercial:** [PREENCHER ANTES DO LANÇAMENTO]
- **Canal de cancelamento/reembolso:** [PREENCHER ANTES DO LANÇAMENTO]
- **Prazo operacional de resposta:** [PREENCHER ANTES DO LANÇAMENTO — validar juridicamente]

Esta Política complementa os Termos de Uso e descreve a oferta de trial, assinatura, compra única, pagamentos, cancelamento e reembolso.

## 2. Produtos e preços

Os produtos ativos e seus valores são exibidos na página de preços e no checkout antes da confirmação. O administrador pode oferecer:

- **Assinatura:** acesso aos cursos marcados como incluídos na assinatura enquanto o período estiver ativo. Há período mensal e anual configuráveis; o preço anual pode seguir a oferta exibida, com referência prevista de 10 vezes o preço mensal (equivalente a 2 meses grátis), se assim anunciado.
- **Venda única:** acesso permanente ao curso vinculado, sujeito à confirmação do pagamento e à regra de reembolso confirmado prevista nesta Política.

Preços, tributos, descontos e condições efetivamente praticados no lançamento: **[PREENCHER ANTES DO LANÇAMENTO — conferir ofertas, tributos e apresentação ao consumidor]**.

Alteração de preço vale para novas compras; renovação de assinatura segue o preço vigente na renovação, conforme oferta e informação apresentada.

## 3. Trial gratuito

O trial previsto é de **7 dias**, sem cartão, concedido uma única vez por usuário. Ele libera acesso equivalente ao da assinatura aos cursos incluídos na assinatura.

O trial:

- não é renovável;
- não gera cobrança automática;
- não exige cartão salvo;
- não cria Checkout Pro, cobrança ou preapproval automaticamente;
- pode ser encerrado quando uma assinatura paga for ativada;
- expira automaticamente ao fim do período, quando o acesso retorna às regras do produto;
- não impede o aluno de contratar uma assinatura durante ou depois do período.

Elegibilidade e eventuais limitações antifraude: **[PREENCHER ANTES DO LANÇAMENTO — validar critérios operacionais e jurídicos]**.

## 4. Checkout e meios de pagamento

O fluxo é: escolha do produto/período, criação da intenção no servidor, início da cobrança no fluxo correspondente e retorno à plataforma com estado pendente até a confirmação. O retorno do navegador não confirma pagamento nem libera acesso.

Para **venda única**, o fluxo usa Checkout Pro do Mercado Pago e pode oferecer:

- cartão de crédito;
- Pix, com QR Code ou código de copia e cola exibido pelo checkout, quando disponível.

Para **assinatura mensal/anual**, o fluxo usa Mercado Pago Subscriptions/preapproval. A assinatura oferece somente os métodos efetivamente suportados pelo checkout da assinatura; Pix fica restrito à venda única nesta versão.

O Mercado Pago processa os dados de pagamento. O ConcursFoco não deve armazenar dados completos de cartão. Eventos `payment.*` da venda única e eventos `subscription.*`/pagamentos vinculados da preapproval são tratados em fluxos distintos. O acesso só é liberado ou renovado após webhook validado do Mercado Pago; a tela de retorno, isoladamente, não confirma pagamento.

Pagamento recusado, cancelado, expirado ou não confirmado não concede acesso. Webhooks duplicados não devem duplicar a compra ou o entitlement.

## 5. Cupons

Quando oferecido, o cupom deve ser aplicado no checkout e validado no servidor. É permitido um cupom por compra, sem acumulação com outro cupom **nem com o trial**. O cupom pode ter percentual ou valor fixo, escopo, validade, limite de uso e condições exibidas na oferta.

O desconto não pode tornar o valor negativo. Para assinaturas, o desconto previsto incide somente na primeira cobrança; renovações seguem o preço cheio vigente, conforme informação da oferta.

## 6. Cancelamento de assinatura

Nesta versão, o aluno deve solicitar o cancelamento da assinatura exclusivamente pelo canal de suporte/cancelamento indicado. O cancelamento impede cobranças futuras conforme o processamento do provedor e da oferta, mas o acesso pago normalmente permanece até o fim do período já confirmado. **[PREENCHER ANTES DO LANÇAMENTO — descrever canal, confirmação e efeitos exatos].**

Cancelamento de assinatura não transforma uma compra única em assinatura nem apaga automaticamente a conta. A exclusão de dados segue a Política de Privacidade.

## 7. Reembolso e direito de arrependimento

Pedidos de reembolso devem ser enviados pelo canal indicado, com identificação da compra e informações necessárias para localizar a transação. O pedido será analisado conforme a legislação aplicável, a oferta contratada, o meio de pagamento e as regras do Mercado Pago.

- **Prazo e condições legais de arrependimento:** [PREENCHER ANTES DO LANÇAMENTO — validação jurídica obrigatória].
- **Prazo para solicitação em cada produto:** [PREENCHER ANTES DO LANÇAMENTO].
- **Procedimento, documentos e exceções:** [PREENCHER ANTES DO LANÇAMENTO — validar juridicamente].
- **Prazo e forma de devolução:** [PREENCHER ANTES DO LANÇAMENTO — validar com Mercado Pago].

Quando o reembolso for aprovado e confirmado, o webhook de refund aplica a regra correspondente: a venda única tem o entitlement permanente revogado; na assinatura, a continuidade é encerrada e o acesso permanece até `acesso_ate`, conforme a spec de pagamentos. O momento de visualização do estorno pode depender do Mercado Pago e do emissor do cartão.

Não serão inventadas exceções, prazos ou renúncias de direitos nesta versão pendente.

## 8. Falhas, indisponibilidade e cobrança indevida

Se o pagamento aparecer como aprovado no provedor, mas o acesso não for liberado, o aluno deve contatar o suporte com o identificador da compra. O ConcursFoco poderá realizar reconciliação com o Mercado Pago.

Em caso de cobrança não reconhecida, duplicidade ou divergência de valor, o usuário deve comunicar o suporte imediatamente e também poderá utilizar os canais do Mercado Pago e do emissor, quando aplicável.

## 9. Acesso e perda de acesso

Assinatura ativa ou trial válido libera cursos incluídos na assinatura. Compra única libera o curso vinculado de forma permanente; a regra vigente de alteração desse entitlement é o reembolso confirmado pelo webhook correspondente. Assinatura vencida volta a bloquear os materiais.

## 10. Subprocessadores comerciais conhecidos

O **Mercado Pago** é o provedor conhecido para Checkout Pro, Pix, cartão, notificações de pagamento e webhooks. Outros fornecedores de infraestrutura conhecidos no escopo são Vercel, Cloudflare R2, Bunny Stream e Vercel Analytics, conforme a Política de Privacidade e a Política de Cookies.

**Identificador público da conta comercial, termos do Mercado Pago e canais de contestação:** [PREENCHER ANTES DO LANÇAMENTO — não inventar dados].

## 11. Alterações da política

Alterações de preço, produto, trial ou condições comerciais serão apresentadas antes da contratação e registradas na versão aplicável. Esta Política poderá ser atualizada para refletir mudanças no catálogo, provedor de pagamento ou legislação.

## Histórico

| Versão | Data | Mudança |
|---|---|---|
| 0.1 | 2026-08-19 | Criação do rascunho sobre trial, assinaturas, compra única, Pix, cartão, cancelamento e reembolso. |
| 0.2 | 2026-08-19 | Cancelamento inicialmente via suporte, cupom não acumulável com trial e preservação da regra vigente de venda única sem revogação adicional por bloqueio/fraude. |
| 0.3 | 2026-08-19 | **PENDENTE**: assinatura via Subscriptions/preapproval, venda única via Checkout Pro, Pix somente na venda única, métodos da assinatura limitados ao checkout da assinatura e webhooks distintos. |
| 0.4 | 2026-08-19 | Referência técnica `SPEC-pagamentos.md` v0.7 aprovada explicitamente; esta política permanece **PENDENTE — revisão jurídica e preenchimento obrigatório**. |
