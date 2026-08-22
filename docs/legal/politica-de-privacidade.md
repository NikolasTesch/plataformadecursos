# Política de Privacidade — ConcursFoco

- **Status:** [PENDENTE — revisão jurídica e preenchimento obrigatório]
- **Versão:** 0.4
- **Data:** 2026-08-19
- **Vigência:** [PREENCHER ANTES DO LANÇAMENTO]
- **Última atualização:** 2026-08-19

> **Rascunho.** Este documento não está aprovado e não deve ser publicado sem revisão jurídica, validação das bases legais e preenchimento dos campos obrigatórios. Não constitui aconselhamento jurídico.

## 1. Quem trata os dados

- **Controlador/identificação legal:** [PREENCHER ANTES DO LANÇAMENTO]
- **CNPJ ou CPF:** [PREENCHER ANTES DO LANÇAMENTO]
- **Endereço:** [PREENCHER ANTES DO LANÇAMENTO]
- **Encarregado/DPO:** [PREENCHER ANTES DO LANÇAMENTO]
- **Canal do DPO/LGPD:** [PREENCHER ANTES DO LANÇAMENTO]
- **Canal de suporte geral:** [PREENCHER ANTES DO LANÇAMENTO]

Esta Política explica como dados pessoais são tratados no site, no cadastro, no SaaS de estudos, no painel administrativo e nos fluxos de contratação.

## 2. Dados tratados

Conforme o recurso utilizado, podem ser tratados:

- **Cadastro e autenticação:** nome, email, senha em formato de hash, status da conta, sessões, tokens de verificação e registros de segurança.
- **Uso educacional:** cursos e materiais acessados, incluindo resumos quando disponíveis, progresso, conclusões, posição de vídeo, anotações privadas, respostas, tentativas, favoritas, simulados, flashcards e trilhas.
- **Contratação:** produto, período, status do pagamento, valor, cupom, identificadores de compra e eventos recebidos do Mercado Pago. Dados completos de cartão não são armazenados pelo ConcursFoco.
- **Atendimento e comunicações:** dados enviados pelo usuário, solicitações, preferências e registros necessários para responder.
- **Técnicos e segurança:** endereço IP, data e hora, navegador/dispositivo, sessão, logs e eventos necessários à prevenção de abuso e operação.
- **Medição da landing:** eventos de funil e informações técnicas associadas por Vercel Analytics, somente após opt-in explícito e conforme a Política de Cookies; GA4 não é uma decisão ativa deste escopo.
- **Dados de publicação e validação:** comentários, respostas, avaliações e dados mínimos de certificado que possam ser exibidos publicamente conforme a configuração do produto e o consentimento aplicável.

O ConcursFoco não deve solicitar dados sensíveis para o cadastro ou estudo. Se o usuário os inserir voluntariamente em uma anotação, comentário ou atendimento, o tratamento seguirá a necessidade de remover, proteger ou responder conforme análise do caso.

## 3. Fontes e finalidades

Os dados podem ser obtidos diretamente do usuário, gerados pelo uso do serviço, enviados por administradores autorizados ou recebidos de parceiros de pagamento.

As finalidades incluem:

1. criar e proteger a conta, autenticar e manter sessões;
2. entregar cursos, materiais, progresso, anotações e funcionalidades contratadas;
3. processar pagamentos, assinaturas, trial, cupons, renovações, cancelamentos e reembolsos;
4. atender solicitações, enviar comunicações transacionais e responder suporte;
5. prevenir fraude, abuso, acesso indevido e incidentes de segurança;
6. cumprir obrigações legais, regulatórias, fiscais e exercer direitos;
7. medir a conversão e melhorar a landing e o serviço, somente após opt-in explícito e quando permitido;
8. cumprir uma solicitação de exportação ou exclusão do titular.

As bases legais aplicáveis a cada finalidade devem ser confirmadas na revisão jurídica: **[PREENCHER ANTES DO LANÇAMENTO — matriz de finalidades, bases legais e prazos]**.

## 4. Consentimento e preferências

O cadastro exige aceite do consentimento LGPD apresentado no momento do registro. O usuário pode retirar consentimentos não necessários pelo canal indicado, sem afetar tratamentos anteriores realizados legitimamente.

Analytics e cookies não necessários não são carregados nem coletados sem opt-in explícito. O banner e os controles descritos na Política de Cookies registram a escolha do usuário. Comunicações transacionais podem ser necessárias à conta; comunicações opcionais devem respeitar as preferências e a legislação aplicável.

## 4.1 Dados que podem ser públicos

Dependendo do recurso e da configuração publicada:

- a verificação pública de certificado pode exibir nome, curso, data e código de verificação;
- comentários em materiais podem ser visíveis a alunos que tenham acesso ao material e a administradores;
- avaliações de cursos podem ser exibidas publicamente conforme a configuração do produto e o consentimento aplicável.

O inventário exato de campos, a escolha de publicação e o mecanismo de consentimento devem ser confirmados antes do lançamento: **[PREENCHER ANTES DO LANÇAMENTO — validar campos públicos e configurações]**.

## 5. Compartilhamento e subprocessadores conhecidos e planejados

O compartilhamento é limitado ao necessário para operar o serviço, cumprir obrigações, proteger direitos ou atender ordem válida. A lista abaixo reúne provedores conhecidos no escopo e provedores planejados/decididos. A inclusão de um provedor planejado/decidido **não significa que ele esteja configurado, contratado, ativado ou coletando dados**.

| Provedor | Função prevista | Dados/fluxo relacionado |
|---|---|---|
| **Vercel** | Hospedagem e observabilidade via Vercel; configuração e ativação a confirmar | Somente se ativado: dados técnicos, logs e requisições necessários ao serviço |
| **Vercel Analytics** | Analytics de funil e uso da landing | Eventos de navegação e conversão, conforme consentimento/configuração |
| **Resend** | E-mail transacional planejado/decidido; configuração e ativação a confirmar | Somente se ativado: dados necessários ao envio de mensagens transacionais |
| **Sentry** | Monitoramento de erros planejado/decidido; configuração e ativação a confirmar | Somente se ativado: dados técnicos e diagnósticos necessários ao monitoramento |
| **Supabase** | PostgreSQL de produção decidido; plano, região, contrato e ativação a confirmar | Somente se ativado: dados persistidos e metadados necessários ao serviço |
| **Mercado Pago** | Checkout Pro, cartão, Pix, pagamentos e webhooks | Dados necessários à identificação da compra e processamento do pagamento |
| **Cloudflare R2** | Armazenamento privado de PDFs e arquivos | Arquivos de conteúdo e metadados necessários ao acesso assinado |
| **Bunny Stream** | Hospedagem, transcodificação e streaming HLS de vídeos | Arquivos de vídeo, identificadores e dados técnicos de reprodução |

**Provedor de banco de dados em produção:** Supabase, decisão registrada em 2026-08-19. Confirmar antes da publicação plano contratado, região, contrato, finalidade, localização, retenção e controles de acesso.

**Provedor(es) de email:** Resend, decisão registrada em 2026-08-19. Não há outro provedor decidido; confirmar antes da publicação finalidade, localização, contrato e ativação.

Antes da publicação, confirmar quais provedores foram efetivamente contratados ou ativados, nomes legais, subcontratados, localidades, transferências internacionais, medidas contratuais, retenções e atualização desta tabela. Supabase, Resend, Sentry e Vercel permanecem decisões de arquitetura/operação, sem afirmação de configuração ou coleta atual.

**Ambientes:** staging/teste deve permanecer isolado de produção, com banco,
credenciais e integrações de teste separados. Esta exigência é operacional e
continua pendente de validação antes do lançamento; não constitui aprovação
jurídica nem afirma que a separação já esteja configurada.

## 6. Transferências internacionais

Alguns fornecedores de infraestrutura ou subprocessadores podem processar dados fora do Brasil. A existência, os países/regiões e o mecanismo jurídico aplicável devem ser confirmados antes do lançamento: **[PREENCHER ANTES DO LANÇAMENTO — mapa de transferências internacionais e salvaguardas]**.

## 7. Retenção, anonimização e exclusão

Os dados são mantidos pelo tempo necessário às finalidades informadas, à segurança, ao atendimento e às obrigações legais. Prazos específicos devem ser preenchidos após validação:

- conta e dados de autenticação: **[PREENCHER ANTES DO LANÇAMENTO]**;
- logs e segurança: **[PREENCHER ANTES DO LANÇAMENTO]**;
- dados de pagamento e registros fiscais: **[PREENCHER ANTES DO LANÇAMENTO — validar obrigação de retenção]**;
- exportação temporária: até o download ou **[PREENCHER ANTES DO LANÇAMENTO]**;
- cookies/analytics: conforme tabela da Política de Cookies.

O titular pode solicitar exclusão pela plataforma, com confirmação explícita. A exclusão remove dados pessoais, sessões, anotações e progresso, mas registros de compra podem ser anonimizados e mantidos quando necessário para obrigação fiscal, prevenção de fraude ou defesa de direitos. O email poderá ser substituído por identificador não reversível, conforme validação jurídica e implementação.

## 8. Direitos do titular

Observados os requisitos e limites legais, o titular pode solicitar confirmação e acesso, correção, informação sobre compartilhamento, portabilidade/exportação, revisão de decisões automatizadas quando aplicável, eliminação, oposição e revogação de consentimento.

O produto prevê:

- exportação via UI em pacote ZIP/JSON com dados pessoais, progresso, anotações, tentativas e compras anonimizadas conforme aplicável;
- exclusão irreversível via UI, com confirmação digitando `EXCLUIR`;
- atendimento pelo canal LGPD: **[PREENCHER ANTES DO LANÇAMENTO]**.

Prazo e procedimento de atendimento: **[PREENCHER ANTES DO LANÇAMENTO — validar juridicamente e operacionalmente]**.

## 9. Segurança

São adotadas medidas compatíveis com o risco, incluindo senha com hash forte, sessão em cookie protegido, autorização no servidor, rate limiting, URLs assinadas para arquivos privados, validação de uploads e controles de acesso. Nenhum método é absolutamente seguro; o usuário deve proteger suas credenciais e comunicar incidentes pelo canal de suporte.

## 10. Crianças e adolescentes

**[PREENCHER ANTES DO LANÇAMENTO — política de público, idade mínima, consentimento e procedimento aplicável].** Não inserir neste documento uma idade ou regra sem validação jurídica e operacional.

## 11. Cookies e analytics

Cookies e tecnologias semelhantes são detalhados na [Política de Cookies](./politica-de-cookies.md). Analytics da landing somente pode ser ativado após opt-in explícito no banner de consentimento. A ausência de escolha ou a recusa impedem o carregamento e o registro de analytics.

## 12. Incidentes e alterações

Em caso de incidente relevante envolvendo dados pessoais, serão avaliadas as medidas de contenção, investigação e comunicações exigidas pela legislação aplicável. Canal para reporte pelo titular: **[PREENCHER ANTES DO LANÇAMENTO]**.

Esta Política pode ser atualizada para refletir mudanças no serviço, subprocessadores ou legislação. A versão, data e vigência serão indicadas no topo; mudanças relevantes serão comunicadas pelo canal adequado.

## Histórico

| Versão | Data | Mudança |
|---|---|---|
| 0.1 | 2026-08-19 | Criação do rascunho sobre dados pessoais, direitos, consentimento e subprocessadores conhecidos. |
| 0.2 | 2026-08-19 | Analytics condicionado a opt-in explícito e incluídos dados públicos potenciais de certificados, comentários e avaliações, com campos pendentes. |
| 0.3 | 2026-08-19 | Registrados Resend, Sentry e Vercel como subprocessadores planejados/decididos, sem alegação de configuração ou coleta atual. |
| 0.4 | 2026-08-19 | Supabase consolidado para produção, Resend como email, Sentry + Vercel como monitoramento e staging isolado obrigatório; pendências jurídicas/operacionais preservadas. |
