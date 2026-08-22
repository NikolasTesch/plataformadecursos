# Monitoramento e alertas

- **Versão**: 0.2
- **Data**: 2026-08-19
- **Status**: [PENDENTE — decisão técnica/validação operacional]

## 1. Objetivo e dependências

Definir o que deve ser observado para o alvo Vercel e para as dependências do
produto. O usuário decidiu por **Sentry + Vercel** para monitoramento, mas DSN,
alertas, donos, canal e retenção ainda precisam ser configurados e validados.
Nenhuma métrica, dashboard ou alerta é presumido como existente.

## 2. Decisões pendentes

- [ ] Confirmar projeto/ambiente Sentry, DSN(s) por ambiente quando aplicável e
      armazenamento seguro; nunca registrar DSN no repositório ou em logs.
- [ ] Configurar Sentry e Vercel sem misturar staging e produção.
- [ ] Definir canal de alerta, plantão, escalonamento, donos por alerta e
      retenção de eventos/logs.
- [ ] Confirmar domínio/URL de health check e origem dos dados.
- [ ] Definir limites finais após medir baseline em staging.
- [ ] Definir política de mascaramento para logs e correlação de incidentes.
- [ ] Confirmar que staging envia eventos identificados como teste e não
      dispara comunicação ou escalonamento de produção indevidamente.

## 3. Sinais mínimos

| Área | Sinal | Alerta inicial a validar |
|---|---|---|
| Web/Vercel | taxa de 5xx e latência P95 | 5xx acima de 2% por 5 min ou P95 acima de 2s |
| Disponibilidade | health check | 3 falhas consecutivas |
| Banco | erro de conexão, saturação, idade do backup | qualquer erro sustentado; backup além de 24h |
| Pagamentos | webhook 401/5xx, backlog e aprovados sem entitlement | 1 falha repetida ou divergência não reconciliada |
| Jobs | falhas, retries, idade do item mais antigo | retry esgotado ou atraso acima do SLA a definir |
| Vídeo | callback inválido, `processando` antigo, erro de transcodificação | item além da janela definida sem transição |
| Email | falha final, bounce e fila | retry esgotado ou aumento anormal |
| Segurança | login bloqueado, erro de autorização, segredo exposto | qualquer evidência de exposição; investigar como incidente |

Os limites são pontos de partida para validação, não SLOs aprovados.

## 4. Logs e privacidade

- [ ] Correlacionar requisição, job e webhook com identificador não sensível.
- [ ] Registrar estado e duração, não token, senha, hash, corpo completo de
      pagamento ou dados pessoais desnecessários.
- [ ] Garantir sincronização de horário e retenção compatível com investigação.
- [ ] Testar acesso restrito e exportação de evidências.
- [ ] Definir quem revisa alertas e quem pode silenciá-los.

## 5. Checklist de alerta

- [ ] Cada alerta tem condição, severidade, dono, runbook e ação de teste.
- [ ] Cada alerta Sentry/Vercel tem dono nominal ou placeholder aprovado,
      canal, retenção e teste de acionamento registrados.
- [ ] Existe alerta para backup vencido e restauração não testada.
- [ ] Existe alerta para webhook com falha, repetição e divergência.
- [ ] Existe alerta para job parado/retry esgotado.
- [ ] Existe alerta de disponibilidade externo ao processo monitorado, quando o
      provedor for escolhido.
- [ ] Testar alerta em staging sem notificar usuários reais.
- [ ] Confirmar que alertas não geram loop, spam ou segredo em payload.

## 6. Resposta inicial

1. Abrir incidente com horário, sinal e link da evidência.
2. Consultar `resposta-a-incidentes.md` e o runbook da área.
3. Comparar com o último deploy/migration e dependências externas.
4. Fazer apenas ação reversível até classificar impacto.
5. Registrar falso positivo e ajustar limite somente após revisão.

## Histórico

| Versão | Data | Mudança |
|---|---|---|
| 0.1 | 2026-08-19 | Rascunho de sinais, alertas e dependências ainda não escolhidas |
| 0.2 | 2026-08-19 | Sentry + Vercel definidos; DSN, alertas, donos e retenção mantidos como gates pendentes |
