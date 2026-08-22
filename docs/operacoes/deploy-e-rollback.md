# Deploy e rollback

- **Versão**: 0.4
- **Data**: 2026-08-19
- **Status**: [PENDENTE — decisão técnica/validação operacional]
- **Escopo**: aplicação Next.js, migrations Prisma e dependências de runtime

## 1. Objetivo e limites

Padronizar uma publicação em Vercel e a recuperação de uma versão defeituosa.
Vercel é o deploy alvo confirmado no PRD e Supabase foi decidido para o
PostgreSQL de produção; projeto, plano, região, URLs, domínio e credenciais
ainda precisam ser confirmados. Mercado Pago, Bunny Stream, R2 e email
aparecem nas specs como integrações-alvo, não como integrações operacionais
confirmadas.

Staging isolado é obrigatório antes de produção. O banco, credenciais e
integrações de teste devem ser separados dos equivalentes de produção. Resend
e Sentry + Vercel são decisões de provedor, mas suas configurações operacionais
continuam pendentes.

## 2. Decisões pendentes antes do uso

- [ ] Identificar projetos/ambientes Vercel (staging e produção) e
      responsáveis por aprovação.
- [ ] Confirmar staging isolado: banco Supabase de teste separado, credenciais
      próprias e integrações de teste sem acesso a dados/contas de produção.
- [ ] Confirmar no Supabase o plano contratado, projeto/região, acesso de
      produção, janela de migration, PITR/backups, retenção e procedimento de
      conexão sem expor `DATABASE_URL`.
- [ ] Confirmar credenciais separadas e acesso mínimo para runtime, migrations
      e operação; armazenar segredos fora desta documentação.
- [ ] No Resend, confirmar domínio/remetente, SPF/DKIM/DMARC e ambientes de
      teste/produção separados; não registrar credenciais.
- [ ] No Sentry + Vercel, confirmar DSN(s), alertas, donos, retenção e
      separação de ambientes; não registrar DSN.
- [ ] Confirmar domínio, TLS e URLs de callback, webhook, retorno e health check.
- [ ] Definir estratégia de preview/staging para R2, Bunny Stream e Mercado
      Pago sem misturar dados reais.
- [ ] Definir política de aprovação, janela de mudança e contato de plantão.

## 3. Pré-deploy executável

- [ ] Confirmar que a mudança está coberta por spec aprovada; mudança de
      escopo volta para a fase de especificação.
- [ ] Registrar commit/tag a publicar e conferir `git diff --check`.
- [ ] Executar `npm ci` em ambiente limpo.
- [ ] Executar `npm run lint`.
- [ ] Executar `npm run test`.
- [ ] Executar `npm run test:e2e` com dependências explicitamente disponíveis;
      se não for possível, registrar o motivo e o risco.
- [ ] Executar `npm run build`.
- [ ] Conferir variáveis necessárias no ambiente de destino contra
      `.env.example`; não colar valores nesta documentação.
- [ ] Confirmar backup recente e restauração ensaiada conforme
      `backup-e-restauracao.md`.
- [ ] Executar e aprovar QA/UAT no staging isolado antes de autorizar qualquer
      deploy em produção.
- [ ] Confirmar plano de rollback e pessoa autorizada a executá-lo.

## 4. Estratégia de migration e tráfego — pendente de decisão

A ordem abaixo é uma estratégia segura proposta, ainda não aprovada para um
provedor específico. O mecanismo de impedimento/drenagem de tráfego e a forma
de liberar a versão precisam ser escolhidos antes do uso comercial.

1. Confirmar o **GO PRÉ-DEPLOY** de `go-live.md`, registrar horário, commit e
   executor e impedir/drenar tráfego novo por mecanismo a decidir.
2. Revisar a migration como **expand-contract**: adicionar campos/tabelas,
   índices e compatibilidades sem remover ou renomear o que a versão anterior
   ainda usa.
3. Aplicar a etapa expand com `npx prisma migrate deploy` contra o banco
   correto. Não usar `migrate dev`, `db push` ou reset em produção.
4. Publicar na Vercel o código que funciona tanto com schema anterior quanto
   com schema expandido; executar `npx prisma generate` quando necessário,
   pois Prisma 7 não gera automaticamente após migrate.
5. Validar migration, integridade e smoke tests com tráfego controlado.
6. Liberar/trocar tráfego apenas após aprovação operacional.
7. Executar remoções, renomes e limpeza **contract** em mudança posterior,
   separada, após confirmar que nenhum código/worker antigo depende deles.
8. Registrar migration(s), etapa, duração, tráfego, resultado e evidência.

Se o impedimento de tráfego ou a compatibilidade expand-contract não estiverem
decididos, o procedimento é **NO-GO**. Migrations já aplicadas não são
apagadas/editadas para simular rollback.

> **Regra de dados:** rollback de código não implica rollback de banco. Para
> schema incompatível, preferir correção para frente e migration compatível;
> restauração de backup é decisão de incidente com avaliação de perda de
> dados.

## 5. Smoke test pós-deploy

Preencher as URLs somente quando domínio/ambientes forem definidos.

- [ ] `GET <URL-BASE>/` retorna página pública sem erro 5xx.
- [ ] `GET <URL-BASE>/api/health` (se existir no release) retorna saudável;
      caso não exista, registrar o endpoint alternativo validado.
- [ ] Login de teste funciona e respeita a role esperada.
- [ ] Uma rota protegida rejeita visitante e uma rota admin rejeita aluno.
- [ ] Um material público/amostra não expõe conteúdo de rascunho ou bloqueado.
- [ ] O acesso a um material protegido reavalia gating no servidor.
- [ ] Criar/consultar uma anotação ou progresso de teste, se o slice incluir
      essa área, e conferir persistência.
- [ ] Confirmar logs sem tokens, senhas, hashes ou dados sensíveis.
- [ ] Se a integração estiver habilitada no ambiente, validar callback de vídeo,
      email e webhook de pagamento conforme os roteiros próprios; se não,
      marcar como não executado, nunca como aprovado.

## 6. Rollback

### 6.1 Aplicação

- [ ] Declarar incidente/mudança e preservar logs, commit e horário.
- [ ] Interromper novas liberações e identificar o último commit saudável.
- [ ] Reverter a implantação na Vercel pelo mecanismo aprovado ou publicar o
      commit saudável conhecido.
- [ ] Repetir smoke tests, especialmente login, gating e checkout/retorno se
      disponíveis.
- [ ] Confirmar que o erro não é causado por migration já aplicada.

### 6.2 Banco

- [ ] Não executar `prisma migrate reset`, `db push` ou remoção manual em
      produção.
- [ ] Se compatível, aplicar migration corretiva para frente.
- [ ] Se houver corrupção/perda, abrir SEV-1/SEV-2 e seguir
      `backup-e-restauracao.md`, com aprovação explícita e registro do impacto.
- [ ] Após qualquer recuperação, reconciliar pagamentos, entitlements,
      notificações e jobs antes de declarar normalização.

## 7. Critério de conclusão

O deploy só é concluído quando commit, migration, smoke test, aprovador,
horários e eventuais exceções estão registrados no histórico de mudança.

## Histórico

| Versão | Data | Mudança |
|---|---|---|
| 0.1 | 2026-08-19 | Rascunho inicial para Vercel, migrations Prisma e rollback |
| 0.2 | 2026-08-19 | Estratégia pendente e segura de expand-contract com impedimento de tráfego |
| 0.3 | 2026-08-19 | Supabase definido como PostgreSQL de produção; plano, região, acessos e backup permanecem gates de validação |
| 0.4 | 2026-08-19 | Staging isolado obrigatório; Resend e Sentry + Vercel incluídos nos pré-requisitos sem adicionar segredos |
