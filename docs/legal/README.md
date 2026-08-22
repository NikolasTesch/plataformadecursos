# Documentos legais — ConcursFoco

- **Status:** [PENDENTE — revisão jurídica e preenchimento obrigatório]
- **Versão:** 0.4
- **Data:** 2026-08-19

## Função

Esta pasta reúne os rascunhos dos documentos públicos necessários para a operação do SaaS de estudos ConcursFoco: termos de uso, privacidade, cookies e política comercial/reembolsos.

Os arquivos descrevem, em pt-BR, a relação com visitantes, alunos, administradores e compradores, sem substituir a revisão jurídica ou criar dados cadastrais não confirmados.

## Arquitetura

- `termos-de-uso.md`: regras de acesso e utilização da plataforma, conteúdos, conta e limitações.
- `politica-de-privacidade.md`: tratamento de dados pessoais, direitos do titular, consentimento, exportação e exclusão.
- `politica-de-cookies.md`: cookies, armazenamento local, analytics e gestão de consentimento.
- `politica-comercial-e-reembolsos.md`: trial, assinatura, compra única, pagamentos, cancelamento e reembolsos.

Os documentos são complementares. Os Termos incorporam as políticas por referência; a Política Comercial detalha as condições econômicas; a Política de Cookies detalha tecnologias de medição; e a Política de Privacidade prevalece para o tratamento de dados pessoais quando houver conflito de interpretação, sujeito à validação jurídica.

## Decisões tomadas

- **2026-08-19:** os quatro documentos foram criados como rascunhos pendentes, sem status de aprovação.
- **2026-08-19:** campos cadastrais, responsáveis, contatos, prazos e demais informações que dependem de confirmação jurídica ou operacional aparecem como `[PREENCHER ANTES DO LANÇAMENTO]`.
- **2026-08-19:** a Política de Privacidade registra Supabase, Vercel, Resend e Sentry como subprocessadores planejados/decididos, sem afirmar configuração, contratação, ativação ou coleta atual; Vercel Analytics, Mercado Pago, Cloudflare R2 e Bunny Stream permanecem referências conhecidas do escopo.
- **2026-08-19:** staging/teste deve ser isolado de produção, com banco, credenciais e integrações separados; a validação operacional permanece pendente.
- **2026-08-19:** analytics exige opt-in explícito; ausência de escolha ou recusa não autoriza coleta de analytics.
- **2026-08-19:** o cancelamento de assinatura é solicitado inicialmente via suporte.
- **2026-08-19:** o primeiro lançamento comercial somente ocorrerá após S1–S8; os documentos legais permanecem pendentes de revisão jurídica e preenchimento obrigatório.

## Informações úteis

- As bases de comportamento são `docs/PRD.md`, `docs/SPEC.md`, `docs/specs/SPEC-auth.md`, `docs/specs/SPEC-pagamentos.md` e `docs/specs/SPEC-landing.md`.
- O cadastro exige aceite do consentimento LGPD; a exportação gera pacote com dados, progresso, anotações, tentativas e compras anonimizadas conforme a spec; a exclusão é irreversível e mantém registros de compra anonimizados quando necessário.
- A operação comercial prevista inclui trial de 7 dias sem cartão, assinatura mensal/anual, venda única por curso, Pix e cartão no Checkout Pro do Mercado Pago; cupons não acumulam com trial.
- Antes do lançamento, completar todos os campos marcados, revisar links, nomes de cookies, retenções, subprocessadores, transferências internacionais e fluxos de cancelamento/reembolso.
- Estes textos não devem ser publicados como se fossem aprovados: dependem de revisão jurídica e de preenchimento operacional.

## Histórico

| Versão | Data | Mudança |
|---|---|---|
| 0.1 | 2026-08-19 | Criação da pasta e dos quatro rascunhos legais pendentes. |
| 0.2 | 2026-08-19 | Atualização documental para opt-in de analytics, cancelamento via suporte e lançamento comercial somente após S1–S8. |
| 0.3 | 2026-08-19 | Registro de Resend, Sentry e Vercel como subprocessadores planejados/decididos, sem alegação de configuração ou coleta atual. |
| 0.4 | 2026-08-19 | Índice alinhado ao estado aprovado da landing; mantidos status jurídico e gates operacionais como pendentes. |
