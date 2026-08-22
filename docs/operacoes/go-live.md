# Go-live

- **Versão**: 0.5
- **Data**: 2026-08-19
- **Status**: [PENDENTE — decisão técnica/validação operacional]

## 1. Regra comercial não dispensável

O lançamento comercial do ConcursFoco só pode ser declarado depois de **S1,
S2, S3, S4, S5, S6, S7 e S8** concluídos, aprovados e evidenciados. Não há
exceção operacional, lançamento parcial, feature flag ou aprovação provisória
que substitua um slice ausente.

Vercel é o alvo de deploy confirmado. PostgreSQL de produção será Supabase,
por decisão do usuário; plano contratado, região, PITR/backups, retenção,
credenciais e acesso mínimo ainda são pendências de validação. Email,
monitoramento e staging têm decisões de provedor/estratégia registradas:
Resend para email e Sentry + Vercel para monitoramento. Domínio, configuração,
DSNs, alertas, donos, retenção e demais contas continuam pendentes; nenhuma
conta, URL ou credencial é presumida.

## 2. Baseline obrigatório S1–S8

| Slice | Escopo mínimo do baseline | Critério de conclusão para o lançamento |
|---|---|---|
| S1 | Fundação, schema Prisma/PostgreSQL, Auth.js, roles e seed | US-01, US-02 e gestão de acesso base verificadas; migrations e testes evidenciados |
| S2 | Cursos, módulos, materiais, publicação, PDF/texto/resumo e sales page | US-03–06, US-09, US-40, US-41 e US-44 verificadas sem vazamento de conteúdo |
| S3 | Navegação do aluno, gating, progresso, anotações e certificados | US-11, US-12, US-14, US-15 e US-29; R1–R12 e E2E aplicáveis aprovados |
| S4 | Questões, feedback, tentativas, erros, favoritas e modos estudo/prova | US-08, US-13, US-37–39 verificadas |
| S5 | Bunny Stream, callback de transcodificação, HLS e posição | US-07 e US-10 (vídeo) verificadas; estados e gating de player aprovados |
| S6 | Produtos, trial, mensal/anual, checkout, Pix/cartão, cupons, webhooks e refund | US-10, US-16–18, US-32–34 e US-45–46; reconciliação e idempotência aprovadas |
| S7 | Trilhas, simulados, flashcards, comunidade, avaliações, PWA, ZIP e editais | US-25–30, US-42–43 e US-47–48 verificadas; operações assíncronas aprovadas |
| S8 | Streak/meta, notificações, busca, email, relatórios, verificação e LGPD | US-19, US-21–24, US-31 e US-35 verificadas; exportação/exclusão e jobs aprovados |

US-36 (relatório semanal) permanece removida do escopo conforme a SPEC. Uma
US que aparece em mais de um slice só é considerada concluída quando todos os
aspectos aplicáveis do baseline estiverem aprovados.

## 3. Gates não dispensáveis

- [ ] Todos os slices S1–S8 têm status de conclusão, revisão e evidência.
- [ ] Todas as US ativas aplicáveis estão cobertas na matriz de
      `qa-uat-lancamento.md`; US-36 não é requisito.
- [ ] Nenhum defeito SEV-1 ou SEV-2 aberto; riscos residuais têm decisão
      formal, sem dispensar um slice ou gate obrigatório.
- [ ] Specs e documentos legais aplicáveis estão aprovados; esta pasta não
      altera nem substitui documentos legais.
- [ ] Supabase de produção tem plano contratado, região, PITR/backups,
      retenção, credenciais e acesso mínimo confirmados.
- [ ] Backup/restauração, RPO/RTO e teste de restauração do Supabase estão
      concluídos antes do go-live.
- [ ] Staging isolado foi aprovado antes de produção, com banco, credenciais e
      integrações de teste separados.
- [ ] Resend tem domínio/remetente, SPF/DKIM/DMARC e ambientes de teste e
      produção separados confirmados.
- [ ] Sentry + Vercel têm DSN(s), alertas, donos, canais e retenção confirmados;
      DSNs não aparecem em documentação ou logs.
- [ ] Domínio, TLS, suporte e responsáveis estão identificados; pendências de
      configuração permanecem bloqueio.
- [ ] Segurança, LGPD, RBAC, gating R1–R12, rate limiting e não exposição de
      conteúdo bloqueado foram verificados.
- [ ] Checkout Mercado Pago, cartão, Pix, webhook, refund e reconciliação
      foram testados como parte obrigatória do S6 e do lançamento comercial.
- [ ] Plano de rollback, impedimento de tráfego, migrations compatíveis e
      backup estão aprovados.
- [ ] Aceite de produto, técnico e operação está registrado.

## 4. Fase A — Go/no-go pré-deploy

O resultado desta fase é **GO PRÉ-DEPLOY** ou **NO-GO**. GO não declara
lançamento; apenas autoriza a janela técnica.

- [ ] Baseline S1–S8 completo conforme a seção 2.
- [ ] Gates não dispensáveis acima concluídos e evidenciados.
- [ ] Commit/tag, migrations, janela, executor, aprovador e contatos
      registrados.
- [ ] Backup dentro do RPO e teste de restauração disponível.
- [ ] QA/UAT aprovado, incluindo dependências externas; itens não executados
      por falta de provedor são bloqueio, não aprovação.
- [ ] QA/UAT foi executado no staging isolado, com evidência de banco,
      credenciais e integrações de teste separadas.
- [ ] Decidir GO/NO-GO e registrar motivo, horário e assinatura.

## 5. Fase B — Deploy controlado

Executar conforme `deploy-e-rollback.md`. A ordem final depende da solução de
impedimento de tráfego a escolher, mas nunca deve expor código incompatível com
o schema:

1. Confirmar o **GO PRÉ-DEPLOY** e colocar tráfego novo em estado controlado
   (bloqueio, drenagem ou mecanismo equivalente ainda pendente de decisão).
2. Aplicar apenas migration **expand** retrocompatível com a versão anterior,
   usando `npx prisma migrate deploy`; não executar migration destrutiva no
   mesmo passo.
3. Publicar o código compatível com o schema antigo e expandido na Vercel.
4. Validar migrations e smoke tests com tráfego controlado.
5. Liberar/trocar tráfego somente após validação e decisão do responsável.
6. Em janela posterior, executar a etapa **contract** (remoção/limpeza) como
   mudança separada, com os mesmos gates; não depender de rollback destrutivo.

O mecanismo de bloqueio/drenagem, a ordem exata no provedor e o dono da chave
de liberação permanecem decisões técnicas pendentes. Sem essa solução
aprovada, o deploy comercial é NO-GO.

## 6. Fase C — Validação pós-deploy

- [ ] Smoke de página pública, health check, login, RBAC, gating e persistência.
- [ ] Confirmar status de migration, erros 5xx, latência, banco, jobs e alertas.
- [ ] Confirmar conteúdo amostra/bloqueado sem vazamento.
- [ ] Confirmar pagamentos, webhooks e estado de entitlements do S6.
- [ ] Confirmar callbacks Bunny, email e notificações dos slices S5/S8.
- [ ] Repetir casos críticos da matriz UAT em tráfego controlado.
- [ ] Observar o período pós-deploy aprovado e registrar evidências.
- [ ] Se falhar, interromper liberação e executar rollback/contensão; não
      declarar lançamento.

## 7. Fase D — Declaração de lançamento

Somente após A, B e C:

- [ ] Responsável técnico declara **DEPLOY VALIDADO**.
- [ ] Produto/operação confirmam baseline S1–S8 e ausência de bloqueadores.
- [ ] Liberar tráfego comercial pelo mecanismo aprovado.
- [ ] Registrar **LANÇAMENTO COMERCIAL DECLARADO**, com data/hora, versão,
      aprovadores, evidências e plano de monitoramento.
- [ ] Se qualquer gate falhar, registrar **NO-GO** ou **LANÇAMENTO NÃO
      DECLARADO** e manter o sistema fora do lançamento comercial.

## Histórico

| Versão | Data | Mudança |
|---|---|---|
| 0.1 | 2026-08-19 | Rascunho de gates para lançamento em Vercel |
| 0.2 | 2026-08-19 | Baseline S1–S8, gates não dispensáveis e fases separadas de go/no-go, deploy, validação e declaração |
| 0.3 | 2026-08-19 | Supabase definido para PostgreSQL de produção e requisitos de validação incluídos no gate de go-live |
| 0.4 | 2026-08-19 | Resend, Sentry + Vercel e staging isolado incorporados aos gates não dispensáveis |
| 0.5 | 2026-08-19 | S6 e integrações externas tratados como obrigatórios no lançamento S1–S8, sem condicionais opcionais |
