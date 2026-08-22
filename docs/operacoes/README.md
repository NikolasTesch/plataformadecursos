# Operações

- **Versão**: 0.4
- **Data**: 2026-08-19
- **Status**: [PENDENTE — decisão técnica/validação operacional]

## Função

Esta pasta reúne os rascunhos operacionais necessários para colocar, manter,
monitorar e retirar do ar o ConcursFoco com segurança. Os documentos descrevem
checklists executáveis, critérios de decisão e procedimentos de contingência;
não constituem evidência de que qualquer integração externa já esteja
provisionada ou ativa.

## Arquitetura

O fluxo operacional é: **baseline S1–S8 e QA/UAT → go/no-go pré-deploy → deploy
controlado → validação pós-deploy → declaração de lançamento → monitoramento,
suporte e incidentes/rollback**. O lançamento comercial não pode ocorrer antes
da conclusão de todos os slices S1–S8. O banco PostgreSQL e as migrations Prisma
são tratados como estado persistente; pagamentos, vídeo, storage e email são
dependências externas com configuração ainda pendente. Cada procedimento aponta
para os demais quando uma ação cruza fronteiras.

| Documento | Uso principal |
|---|---|
| `deploy-e-rollback.md` | Publicar versão, aplicar migrations e reverter aplicação |
| `backup-e-restauracao.md` | Definir cópias, RPO/RTO e ensaiar restauração |
| `resposta-a-incidentes.md` | Classificar, conter, comunicar e encerrar incidentes |
| `mercado-pago-e-webhooks.md` | Operar checkout, webhook e reconciliação |
| `monitoramento-e-alertas.md` | Definir sinais, alertas e resposta inicial |
| `jobs-e-operacoes-assincronas.md` | Operar tarefas agendadas, retries e callbacks |
| `go-live.md` | Gate de decisão para lançamento |
| `qa-uat-lancamento.md` | Roteiro de QA/UAT e evidências de aceite |
| `suporte.md` | Triagem e escalonamento de cancelamento, reembolso, privacidade e cobrança |

## Decisões tomadas

- Deploy alvo: Vercel, conforme `docs/PRD.md` §9; detalhes de projeto,
  domínio e ambientes ainda não foram identificados (2026-08-19).
- PostgreSQL de produção: **Supabase**, decisão do usuário em 2026-08-19. O
  plano contratado, região, PITR/backups, retenção, credenciais, acesso mínimo
  e restauração ainda precisam ser confirmados; isso mantém os runbooks
  pendentes.
- Email transacional: **Resend**, decisão do usuário em 2026-08-19. Domínio,
  remetente, SPF/DKIM/DMARC e separação de ambientes ainda precisam ser
  validados; nenhuma conta ou credencial é presumida.
- Monitoramento: **Sentry + Vercel**, decisão do usuário em 2026-08-19. DSN,
  alertas, donos e retenção ainda precisam ser configurados e validados.
- Staging isolado é obrigatório antes de produção: banco, credenciais e
  integrações de teste não podem compartilhar estado de produção (2026-08-19).
- Jobs/scheduler continuam `[PENDENTE]` por decisão do usuário; esta pasta não
  escolhe mecanismo, fila, worker ou agenda (2026-08-19).
- Mercado Pago, Bunny Stream e Cloudflare R2 são referências de arquitetura
  nas specs aprovadas, mas estes documentos não afirmam que contas,
  credenciais ou integrações estejam prontas hoje (2026-08-19).
- Lançamento comercial somente após baseline completo e aprovado de S1–S8;
  esta decisão operacional permanece pendente até haver evidências de cada
  slice (2026-08-19).

## Informações úteis

- Fonte comportamental: `docs/PRD.md`, `docs/SPEC.md` e specs em
  `docs/specs/`, especialmente pagamentos, vídeo e notificações.
- Variáveis atualmente documentadas: `.env.example`. Nunca copiar valores
  reais para esta pasta; nomes de contas, URLs, tokens e segredos ficam
  pendentes ou em cofre a ser escolhido.
- Comandos disponíveis no projeto: `npm run lint`, `npm run test`,
  `npm run test:e2e`, `npm run build`, `npx prisma migrate deploy` e
  `npx prisma generate`.
- Toda alteração deve seguir `ESPECIFICAR → APROVAR → IMPLEMENTAR → REVISAR`
  de `AGENTS.md`. Atualize a tabela de histórico do documento alterado.

## Checklist de aprovação desta pasta

- [ ] Confirmar no Supabase o plano contratado, projeto de produção, região,
      PITR/backups, retenção, credenciais e acesso mínimo.
- [ ] Executar teste de restauração do Supabase antes do go-live e registrar
      evidência de integridade e RPO/RTO.
- [ ] Confirmar no Resend o domínio/remetente e a separação operacional dos
      ambientes; a escolha do provedor já foi decidida pelo usuário.
- [ ] No Resend, confirmar domínio/remetente, SPF, DKIM e DMARC, ambientes de
      teste/produção separados e teste sem destinatários reais indevidos.
- [ ] No Sentry + Vercel, confirmar DSN(s), alertas, donos, canal,
      integração/ambientes e retenção; não registrar DSN neste repositório.
- [ ] Confirmar staging isolado com banco, credenciais e integrações de teste
      separados antes de qualquer validação de produção.
- [ ] Confirmar domínio, DNS, TLS e URLs de retorno/webhook.
- [ ] Executar os checklists de `go-live.md` e `qa-uat-lancamento.md` em
      ambiente identificável, anexando evidências.
- [ ] Definir contatos e SLAs de `suporte.md` para cancelamento, reembolso,
      privacidade e cobrança.
- [ ] Aprovar formalmente cada documento antes de usá-lo como procedimento.

## Histórico

| Versão | Data | Mudança |
|---|---|---|
| 0.1 | 2026-08-19 | Criação da pasta e dos rascunhos operacionais; todos pendentes |
| 0.2 | 2026-08-19 | Baseline S1–S8, fases de go-live, jobs ampliados e runbook de suporte |
| 0.3 | 2026-08-19 | Decisão de PostgreSQL de produção no Supabase; requisitos operacionais pendentes e scheduler mantido sem mecanismo definido |
| 0.4 | 2026-08-19 | Resend, Sentry + Vercel e staging isolado definidos; gates de configuração permanecem pendentes |
