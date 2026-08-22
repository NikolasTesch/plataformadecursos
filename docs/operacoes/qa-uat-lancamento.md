# QA/UAT de lançamento

- **Versão**: 0.3
- **Data**: 2026-08-19
- **Status**: [PENDENTE — decisão técnica/validação operacional]

## 1. Objetivo e regra de release

Validar o comportamento contratado antes do go-live. A matriz abaixo é por
user story e release/slice aplicável. Todo release comercial deve preencher
**RC-S1 a RC-S8**; um release parcial de slice pode servir apenas para QA
técnico interno e não autoriza lançamento comercial.

O UAT deve ocorrer primeiro em **staging isolado**, com banco, credenciais e
integrações de teste separados de produção. Resend deve usar ambiente de teste
separado; Sentry + Vercel devem distinguir staging de produção. Sem essa
separação, o caso é bloqueado.

Cada caso deve registrar **data, ambiente, commit, executor, resultado,
evidência e defeito**, quando houver. Ausência de Mercado Pago, email, vídeo,
storage, banco gerenciado ou domínio deve ser marcada como **bloqueio/
dependência não executada**, nunca como aprovação.

## 2. Preparação

- [ ] Registrar URL/ambiente, commit e release/slice sob teste.
- [ ] Confirmar banco isolado, dados de teste e limpeza pós-teste.
- [ ] Confirmar usuários aluno/admin e autorização para o meio de pagamento.
- [ ] Confirmar segredos injetados fora do repositório, se a integração for
      objeto do teste.
- [ ] Confirmar banco de staging separado do Supabase de produção, credenciais
      próprias e integrações externas de teste sem dados reais.
- [ ] Confirmar no Resend domínio/remetente de teste, SPF/DKIM/DMARC e
      separação do ambiente de produção.
- [ ] Confirmar Sentry + Vercel com ambiente, DSN(s), alertas, donos e retenção
      identificados sem registrar DSN na evidência.
- [ ] Executar `npm run lint`, `npm run test`, `npm run test:e2e` e
      `npm run build`; anexar saída.
- [ ] Confirmar migrations aplicadas por `npx prisma migrate deploy` e estado
      Prisma conhecido.

## 3. Matriz UAT por US e release aplicável

| Release/slice | US aplicável | Cenários UAT mínimos | Evidência/resultado |
|---|---|---|---|
| RC-S1 / S1 | US-01, US-02, US-20 | Cadastro, login/logout, rate limit, bloqueio e role/admin | [ ] |
| RC-S2 / S2 | US-03, US-04, US-05, US-06, US-09, US-40, US-41, US-44 | CRUD e ordenação; PDF/texto/resumo; publicação; impressão; sales page sem vazamento | [ ] |
| RC-S3 / S3 | US-11, US-12, US-14, US-15, US-29 | Navegação, R1–R12, bloqueio, progresso, anotações privadas e certificado/verificação | [ ] |
| RC-S4 / S4 | US-08, US-13, US-37, US-38, US-39 | CRUD de questões, feedback, tentativas, banco de erros, favoritas e modos prova/estudo | [ ] |
| RC-S5 / S5 | US-07, US-10 (vídeo) | Upload direto, callback/webhook Bunny, processando/pronto/erro, HLS, retomada e conclusão | [ ] |
| RC-S6 / S6 | US-10 (produtos), US-16, US-17, US-18, US-32, US-33, US-34, US-45, US-46 | Produtos, trial, mensal/anual, cartão/Pix, cupons, webhook HMAC/idempotente, refund e expiração | [ ] |
| RC-S7 / S7 | US-25, US-26, US-27, US-28, US-30, US-42, US-43, US-47, US-48 | Trilhas, flashcards, simulados, comentários, PWA/sync, editais, ZIP, avaliações e moderação | [ ] |
| RC-S8 / S8 | US-19, US-21, US-22, US-23, US-24, US-31, US-35 | Dashboard, busca/PDF, verificação, notificações, exportação/exclusão LGPD, relatórios e streak/meta | [ ] |

US-36 (relatório semanal) está removida e não recebe caso UAT. US-10 aparece
em S5 e S6 porque cobre vídeo e produtos; ambos os aspectos devem passar para o
baseline comercial.

## 4. Casos críticos transversais

- [ ] **Gating:** aluno sem entitlement recebe título/CTA, nunca PDF, vídeo,
      texto, resposta ou link de material bloqueado.
- [ ] **RBAC:** autorização é validada no servidor; manipulação de UI não
      libera rota, conteúdo ou administração.
- [ ] **Migrations/deploy:** validar sequência expand-contract e tráfego
      controlado antes de qualquer etapa contract.
- [ ] **Pagamentos:** retorno do checkout permanece pendente; somente webhook
      autenticado concede acesso; duplicidade não altera o estado duas vezes.
- [ ] **Jobs:** retry, idempotência, expiração/limpeza, LGPD, comentários e
      editais deixam evidência e alertam falha final.
- [ ] **Privacidade:** exportação, exclusão/anonimização e retenção não expõem
      dados pessoais ou removem registro obrigatório.
- [ ] **Resiliência:** falha de banco/provedor não concede acesso nem entra em
      loop de retry sem limite.
- [ ] **Observabilidade:** erro controlado em staging aparece no Sentry/Vercel
      correto, alerta o dono definido e respeita a retenção aprovada.
- [ ] **Acessibilidade/mobile:** teclado, foco, contraste, mensagens e
      experiência mobile-first verificadas conforme PRD/SPEC.

## 5. Checkout e pagamentos — RC-S6

Executar somente com sandbox/ambiente e endpoint identificados. Caso contrário,
registrar dependência pendente no caso correspondente.

- [ ] Produto ativo aparece e inativo não aparece; compra avulsa duplicada é
      bloqueada.
- [ ] Preços mensal/anual e cupom válido estão corretos antes do redirecionamento;
      renovação não mantém desconto.
- [ ] Cartão aprovado retorna `pendente`; acesso só surge após webhook.
- [ ] Pix pendente não concede acesso; aprovação posterior via webhook concede.
- [ ] HMAC inválido recebe 401 e não altera o banco.
- [ ] Reentrega do mesmo webhook não duplica entitlement.
- [ ] Refund/cancelamento/pausa respeitam o período pago e o contrato.
- [ ] Reconciliação encontra aprovado sem entitlement e permite correção
      auditada.

## 6. Aceite e bloqueios

- [ ] Todas as linhas RC-S1 a RC-S8 têm resultado e evidência.
- [ ] Todas as US ativas aplicáveis passaram; ausência de integração é bloqueio.
- [ ] Defeitos SEV-1/SEV-2 estão resolvidos antes do go-live.
- [ ] Evidências estão em local autorizado, sem dados sensíveis.
- [ ] Produto, técnico e operação assinaram o aceite.
- [ ] Resultado e pendências foram registrados em `go-live.md`.

## Histórico

| Versão | Data | Mudança |
|---|---|---|
| 0.1 | 2026-08-19 | Rascunho de QA/UAT, checkout e critérios de aceite |
| 0.2 | 2026-08-19 | Matriz por US/release S1–S8 e regra de bloqueio comercial |
| 0.3 | 2026-08-19 | Staging isolado obrigatório e gates de Resend/Sentry + Vercel incluídos |
