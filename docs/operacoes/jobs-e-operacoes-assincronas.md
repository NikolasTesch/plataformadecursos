# Jobs e operações assíncronas

- **Versão**: 0.3
- **Data**: 2026-08-19
- **Status**: [PENDENTE — decisão técnica/validação operacional]

## 1. Objetivo

Catalogar trabalhos que não devem depender de uma única requisição web e
definir execução segura. As specs exigem idempotência, retries e processamento
assíncrono em alguns fluxos, mas, por decisão do usuário, scheduler/fila,
workers, frequência e mecanismo continuam `[PENDENTE]`. Não escolher mecanismo
nem presumir que estes jobs existam ou estejam rodando.

## 2. Inventário operacional a validar

| Trabalho | Origem | Frequência/evento | Idempotência/estado |
|---|---|---|---|
| Expiração/marcadores de assinatura e trial | SPEC-pagamentos P7 | Diário + gating sob demanda | usuário/entitlement + data |
| Aviso de expiração T-3 | SPEC-notificacoes N1/N2 | Diário | `notification_key` |
| Agrupamento de novo material | SPEC-notificacoes N3 | Diário/evento | usuário + evento |
| Retry de email | SPEC-notificacoes §3.2 | Backoff, até 3 tentativas | evento + tentativa |
| Processamento de webhook MP | SPEC-pagamentos P1–P3 | Evento externo | pagamento/assinatura + tipo |
| Webhook/callback de transcodificação Bunny Stream | SPEC-video §3.1, V1/V2 | Evento externo | vídeo + transição de estado |
| Indexação de PDF e conteúdo | PRD §5.2b / US-21 | Após publicação/upload | material + versão |
| ZIP de curso | SPEC master US-43 | Sob solicitação | aluno + curso + solicitação |
| Exportação e exclusão LGPD | SPEC master US-24, SPEC-auth | Sob solicitação/evento | usuário + solicitação + estado |
| Limpeza de artefatos temporários | SPEC master US-43 e storage/vídeo | Expiração/rotina periódica | artefato + expiração |
| Alertas de editais e prazos | SPEC-editais / US-42 | Diário/evento de mudança | concurso + aluno + alerta |
| Coleta/scraping de editais | SPEC-editais / P0-3 | Agenda a definir | fonte + execução + aprovação |
| Notificação de resposta a comentário | SPEC-notificacoes N1/N2, US-28 | Evento de resposta admin | comentário + usuário + evento |

O inventário não transforma funcionalidade ainda não implementada em operação
disponível; cada item deve receber status no release.

## 3. Decisões pendentes

- [ ] Escolher scheduler/fila/worker e sua execução compatível com Vercel.
- [ ] Definir lock, concorrência, timeout, backoff, retenção e fila de falhas.
- [ ] Definir métricas, alertas e executor autorizado para replay.
- [ ] Definir se chamadas externas precisam de assinatura, timeout e circuit
      breaker no provedor escolhido.
- [ ] Definir como pausar/reiniciar jobs sem perder eventos.

> **Decisão do usuário (2026-08-19):** jobs/scheduler seguem `[PENDENTE]`.
> Os itens desta seção são requisitos para decisão futura, não autorização para
> selecionar ou implementar um mecanismo.
- [ ] Definir retenção e eliminação de exportações, ZIPs, uploads incompletos,
      índices temporários e logs, com validação LGPD.
- [ ] Definir fontes permitidas, frequência, limites e aprovação do scraping de
      editais; nenhum scraping é pressuposto como ativo.

## 4. Regras de execução

- [ ] Todo job recebe identificador de execução e registra início/fim/resultado.
- [ ] Operações de pagamento, notificação, expiração e callback são idempotentes.
- [ ] Retry trata falha transitória; não repete indefinidamente falha de dados
      inválidos ou autenticação.
- [ ] Falha final vai para lista/fila de reconciliação e gera alerta.
- [ ] Não executar replay em massa sem janela, limite e consulta prévia.
- [ ] Não colocar segredo ou payload sensível integral em log.
- [ ] Jobs que tratam dados pessoais devem registrar apenas o identificador
      mínimo, aplicar autorização no servidor e respeitar exclusão/anonimização
      prevista no contrato LGPD.

## 5. Dados pessoais e limpeza de artefatos

- [ ] Exportação LGPD produz o pacote solicitado uma única vez, com gating,
      URL assinada e prazo de expiração definidos pela spec; após expirar,
      remover o arquivo e seus temporários.
- [ ] Exclusão de conta remove dados pessoais, progresso e anotações; compras
      ficam apenas anonimizadas quando houver obrigação fiscal, conforme R10.
- [ ] Job de limpeza procura exportações, ZIPs, arquivos temporários de
      upload/transcodificação/indexação e artefatos expirados.
- [ ] Limpeza é idempotente, auditável e não remove material publicado nem
      registro fiscal sem a retenção aprovada.
- [ ] Falha de limpeza gera alerta; não prolongar acesso por manter URL/arquivo
      fora do prazo.

## 6. Editais, scraping e alertas

- [ ] Executar somente sobre fontes previamente aprovadas e registradas.
- [ ] Aplicar timeout, limite, identificação da fonte e proteção contra loop;
      falha de uma fonte não interrompe as demais.
- [ ] Mudança coletada fica pendente de aprovação do admin antes de alterar o
      conteúdo público, quando a SPEC exigir aprovação.
- [ ] Alertas de inscrição/prova são deduplicados por concurso, aluno, evento
      e data; alteração ou cancelamento gera novo evento auditável.
- [ ] Atualizar a trilha/seguimento do aluno apenas após validação da fonte.
- [ ] Scraping indisponível, ambíguo ou proibido vira item de revisão manual,
      não dado publicado automaticamente.

## 7. Comentários e respostas

- [ ] Evento de resposta do admin cria notificação in-app e email somente
      conforme verificação/preferências da SPEC-notificacoes.
- [ ] Usar `notification_key` idempotente para não notificar duas vezes a
      mesma resposta.
- [ ] Se o comentário for excluído, o job não deve entregar conteúdo que não
      esteja mais autorizado; registrar o descarte.
- [ ] Falha final de email não bloqueia a resposta no material; gera alerta e
      reconciliação.

## 8. Checklist de operação/replay

- [ ] Identificar job, versão, janela e dependência que falhou.
- [ ] Medir quantidade pendente e selecionar amostra segura.
- [ ] Confirmar que o handler é idempotente antes de reprocessar.
- [ ] Pausar o produtor se ele continuar gerando falhas.
- [ ] Reprocessar com limite e observar sucesso/duplicidade/efeitos colaterais.
- [ ] Reconciliar entitlements, notificações e arquivos resultantes.
- [ ] Encerrar pendências ou abrir incidente com causa e correção.

## 9. Critérios por classe

- **Webhook:** validar HMAC antes da fila; responder 500 apenas para retry de
  falha transitória; consultar `mercado-pago-e-webhooks.md`.
- **Notificação:** três tentativas com backoff; falha final não bloqueia o
  fluxo principal, conforme SPEC-notificacoes.
- **Expiração:** gating continua avaliando `acesso_ate` em cada requisição;
  o job diário não é a única barreira de acesso.
- **Vídeo:** o webhook/callback de transcodificação do **Bunny Stream** deve
  ser validado conforme o mecanismo decidido; material `processando`/`erro`
  não é publicável e callback inválido não libera player.
- **ZIP/indexação:** validar gating no início e na entrega; links devem ter
  validade conforme a spec, sem transformar artefato em acesso permanente.
- **LGPD/limpeza:** falha não pode expor pacote, prolongar URL assinada ou
  remover registro que precise ser retido.
- **Editais:** fonte, aprovação e deduplicação devem estar registradas antes do
  alerta ao aluno.
- **Comentários:** resposta persistida é independente do sucesso do email;
  retry só ocorre para a entrega idempotente da notificação.

## Histórico

| Versão | Data | Mudança |
|---|---|---|
| 0.1 | 2026-08-19 | Rascunho de inventário, idempotência e replay |
| 0.2 | 2026-08-19 | Inclusão de LGPD, limpeza de artefatos, editais, comentários e referência correta ao webhook/callback Bunny |
| 0.3 | 2026-08-19 | Scheduler/jobs mantidos `[PENDENTE]` por decisão do usuário, sem escolha de mecanismo |
