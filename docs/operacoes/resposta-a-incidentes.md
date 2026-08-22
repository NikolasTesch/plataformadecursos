# Resposta a incidentes

- **Versão**: 0.1
- **Data**: 2026-08-19
- **Status**: [PENDENTE — decisão técnica/validação operacional]

## 1. Objetivo

Fornecer um roteiro único para detectar, conter, recuperar e aprender com
falhas de aplicação, banco, conteúdo, pagamentos, jobs ou provedores externos.
Não há ainda equipe de plantão, canal, ferramenta de incidentes ou contatos
operacionais identificados.

## 2. Severidade

| Nível | Critério operacional | Exemplo |
|---|---|---|
| SEV-1 | Indisponibilidade ampla, perda/corrupção de dados, exposição de segredo ou pagamentos/entitlements incorretos em escala | banco indisponível ou webhook concedendo acesso indevido |
| SEV-2 | Função crítica degradada para parte relevante dos alunos ou checkout sem confirmação | checkout pendente sem processamento, gating indisponível |
| SEV-3 | Impacto limitado com contorno conhecido | job de notificação atrasado ou upload de vídeo em erro |
| SEV-4 | Falha menor, documental ou sem impacto imediato ao usuário | alerta ruidoso, mensagem operacional incorreta |

- [ ] Validar níveis, metas de resposta e janela de atendimento.
- [ ] Definir canal primário, canal de escalonamento, comandante e substituto.
- [ ] Definir quem pode suspender checkout, publicação, jobs ou deploy.

## 3. Procedimento executável

### Detectar e declarar

- [ ] Registrar horário, sintoma, ambiente, URL/rota e primeira evidência.
- [ ] Atribuir severidade provisória; elevar sem esperar diagnóstico perfeito.
- [ ] Nomear comandante do incidente e responsável técnico/comunicação.
- [ ] Abrir uma linha do tempo única; não alterar evidências originais.

### Conter

- [ ] Reduzir escopo: pausar deploy, job, publicação ou fluxo afetado.
- [ ] Proteger usuários: bloquear concessão de entitlement suspeita e invalidar
      segredos apenas se houver evidência de exposição.
- [ ] Para pagamento, preservar eventos e seguir reconciliação, sem conceder
      acesso manual baseado somente na tela de retorno.
- [ ] Para dados, preservar backup e considerar isolamento antes de restaurar.
- [ ] Comunicar o impacto conhecido e o que ainda está sendo investigado;
      não especular causa ou prazo.

### Recuperar e validar

- [ ] Aplicar correção reversível ou rollback conforme
      `deploy-e-rollback.md`.
- [ ] Se envolver dados, seguir `backup-e-restauracao.md` e registrar RPO/RTO.
- [ ] Executar smoke tests de login, RBAC, gating, persistência e pagamentos
      quando aplicável.
- [ ] Reprocessar somente eventos/jobs idempotentes após confirmar o estado.
- [ ] Confirmar estabilidade por uma janela a definir antes de encerrar.

### Encerrar e aprender

- [ ] Registrar causa raiz, fatores contribuintes, impacto e duração.
- [ ] Quantificar usuários, compras, entitlements e dados afetados.
- [ ] Documentar ações corretivas com dono e prazo.
- [ ] Avaliar comunicação a usuários, parceiros e requisitos legais.
- [ ] Atualizar este documento e as specs se houver mudança de escopo.

## 4. Comunicação mínima

Toda atualização deve conter: **o que ocorreu, impacto confirmado, início,
mitigação em curso, próximo marco e incertezas**. Não incluir credenciais,
dados pessoais, tokens ou payloads integrais de pagamento.

## 5. Evidências a preservar

- commit/deploy e migrations envolvidos;
- logs com correlação e horários;
- identificadores de pagamento/webhook sem dados sensíveis desnecessários;
- estado anterior/posterior de entitlement e job;
- backup usado, se houver;
- decisões e aprovações.

## Histórico

| Versão | Data | Mudança |
|---|---|---|
| 0.1 | 2026-08-19 | Rascunho com severidade, contenção, recuperação e pós-incidente |
