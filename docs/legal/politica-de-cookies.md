# Política de Cookies — ConcursFoco

- **Status:** [PENDENTE — revisão jurídica e preenchimento obrigatório]
- **Versão:** 0.3
- **Data:** 2026-08-19
- **Vigência:** [PREENCHER ANTES DO LANÇAMENTO]
- **Última atualização:** 2026-08-19

> **Rascunho.** Este documento não está aprovado e não deve ser publicado sem revisão jurídica, inventário técnico no ambiente de produção e preenchimento dos campos obrigatórios. Não constitui aconselhamento jurídico.

## 1. Identificação e contato

- **Responsável/controlador:** [PREENCHER ANTES DO LANÇAMENTO]
- **CNPJ ou CPF:** [PREENCHER ANTES DO LANÇAMENTO]
- **Endereço:** [PREENCHER ANTES DO LANÇAMENTO]
- **Canal de suporte:** [PREENCHER ANTES DO LANÇAMENTO]
- **Canal LGPD/DPO:** [PREENCHER ANTES DO LANÇAMENTO]

Esta Política explica como o ConcursFoco utiliza cookies e tecnologias semelhantes no site, na landing, no cadastro, no checkout e na área autenticada.

## 2. O que são cookies

Cookies são pequenos arquivos ou identificadores armazenados no navegador ou dispositivo. Tecnologias semelhantes podem incluir armazenamento local, identificadores de sessão e eventos de analytics. Elas podem ser necessárias para manter a sessão, proteger a conta, lembrar preferências ou medir o uso da landing.

## 3. Categorias utilizadas

| Categoria | Finalidade | Base/controle | Status |
|---|---|---|---|
| Necessários | Sessão, autenticação, segurança, preferências essenciais e funcionamento do serviço | Necessidade do serviço, conforme validação jurídica | [PREENCHER ANTES DO LANÇAMENTO — nomes e retenção] |
| Analytics | Eventos da landing e funil: visualização, CTAs, preços, cadastro, trial, checkout e compra aprovada | **Opt-in explícito obrigatório**; ausência de escolha ou recusa impede carregamento e coleta | Vercel Analytics; GA4 não é decisão ativa |
| Marketing/publicidade | [PREENCHER ANTES DO LANÇAMENTO — não presumir uso] | [PREENCHER ANTES DO LANÇAMENTO] | Não definido nas specs atuais |

Não devem ser usados cookies de marketing ou publicidade antes de serem inventariados, aprovados e descritos neste documento.

## 4. Inventário técnico a completar

O inventário abaixo deve ser confirmado no ambiente publicado. Os nomes são campos obrigatórios e não devem ser preenchidos por suposição:

| Nome/chave | Provedor | Categoria | Finalidade | Duração | Próprio/terceiro | Obrigatório? |
|---|---|---|---|---|---|---|
| [PREENCHER ANTES DO LANÇAMENTO] | [PREENCHER ANTES DO LANÇAMENTO] | Necessário | Sessão/autenticação | [PREENCHER ANTES DO LANÇAMENTO] | [PREENCHER ANTES DO LANÇAMENTO] | [PREENCHER ANTES DO LANÇAMENTO] |
| [PREENCHER ANTES DO LANÇAMENTO] | Vercel Analytics | Analytics | Medição de navegação e conversão | [PREENCHER ANTES DO LANÇAMENTO] | Terceiro | Não — sujeito ao consentimento/configuração |
| [PREENCHER ANTES DO LANÇAMENTO] | [PREENCHER ANTES DO LANÇAMENTO] | [PREENCHER ANTES DO LANÇAMENTO] | [PREENCHER ANTES DO LANÇAMENTO] | [PREENCHER ANTES DO LANÇAMENTO] | [PREENCHER ANTES DO LANÇAMENTO] | [PREENCHER ANTES DO LANÇAMENTO] |

O inventário também deve cobrir armazenamento local, identificadores de sessão, pixels, SDKs, tags e cookies criados pelo Checkout Pro do Mercado Pago quando o usuário for redirecionado.

## 5. Consentimento e gerenciamento

Ao primeiro acesso, o banner deve informar as categorias não necessárias e permitir **aceitar expressamente ou recusar analytics**, sem bloquear cookies estritamente necessários. Analytics não pode ser carregado antes da escolha afirmativa. O usuário deve conseguir alterar sua escolha por **[PREENCHER ANTES DO LANÇAMENTO — link/controle de preferências]**.

A recusa, a ausência de escolha ou a retirada do opt-in de analytics não devem impedir o acesso ao conteúdo ou ao checkout. A retirada de consentimento interrompe os cookies não necessários futuros; os efeitos sobre dados já coletados devem seguir a Política de Privacidade e a validação jurídica.

O navegador também permite bloquear ou apagar cookies, mas isso pode encerrar sessões ou afetar funções essenciais. Instruções por navegador: **[PREENCHER ANTES DO LANÇAMENTO — opcional]**.

## 6. Terceiros e subprocessadores conhecidos

No escopo atual, são conhecidos os seguintes provedores relacionados a infraestrutura, pagamentos, vídeo, arquivos e medição:

- **Vercel:** hospedagem e execução da aplicação;
- **Vercel Analytics:** analytics previsto para a landing;
- **Supabase:** PostgreSQL de produção decidido; não presumir cookies ou identificadores sem inventário técnico;
- **Resend:** email transacional decidido; não presumir cookies ou identificadores de navegador sem inventário técnico;
- **Sentry:** monitoramento decidido com Sentry + Vercel; não presumir cookies ou identificadores de navegador sem inventário técnico;
- **Mercado Pago:** Checkout Pro, Pix, cartão e páginas/fluxos de pagamento;
- **Cloudflare R2:** armazenamento privado de arquivos;
- **Bunny Stream:** vídeo, transcodificação e streaming HLS.

O uso efetivo de cookies e tecnologias de cada provedor deve ser confirmado no
ambiente publicado e refletido no inventário. Supabase, Resend, Sentry e Vercel
Analytics são decisões registradas, não evidência de configuração ativa. GA4 não
é uma decisão ativa neste escopo.

Staging/teste deve permanecer isolado de produção, inclusive banco, credenciais
e integrações; o inventário de cookies deve ser validado separadamente em cada
ambiente antes do lançamento.

## 7. Dados, retenção e dúvidas

Eventos de analytics e identificadores podem ser associados a informações técnicas ou de conversão. Finalidades, compartilhamentos, direitos e exclusão estão na [Política de Privacidade](./politica-de-privacidade.md).

- **Prazo de retenção de cookies necessários:** [PREENCHER ANTES DO LANÇAMENTO]
- **Prazo de retenção de analytics:** [PREENCHER ANTES DO LANÇAMENTO]
- **Canal de suporte:** [PREENCHER ANTES DO LANÇAMENTO]
- **Canal DPO/LGPD:** [PREENCHER ANTES DO LANÇAMENTO]

## 8. Alterações

Esta Política pode ser atualizada quando houver alteração de cookies, analytics, fornecedores ou legislação. A nova versão e a data serão informadas no topo; mudanças relevantes podem exigir novo consentimento.

## Histórico

| Versão | Data | Mudança |
|---|---|---|
| 0.1 | 2026-08-19 | Criação do rascunho sobre categorias, banner, analytics e inventário técnico pendente. |
| 0.2 | 2026-08-19 | Analytics condicionado a opt-in explícito, sem carregamento antes da escolha afirmativa. |
| 0.3 | 2026-08-19 | Vercel Analytics consolidado sem GA4 ativo; Supabase, Resend, Sentry e staging isolado registrados como decisões/pendências operacionais. |
