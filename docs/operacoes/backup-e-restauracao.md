# Backup e restauração

- **Versão**: 0.2
- **Data**: 2026-08-19
- **Status**: [PENDENTE — decisão técnica/validação operacional]

## 1. Objetivo

Preservar dados necessários ao ConcursFoco e permitir recuperação verificável.
O PRD define backup diário do banco e alvo de disponibilidade de 99%. O usuário
decidiu que o PostgreSQL de produção será **Supabase**, mas o plano contratado,
região, capacidades efetivamente incluídas, retenção, credenciais e ferramenta
de restauração ainda precisam ser confirmados. Nada abaixo presume capacidade
do plano.

## 2. RPO/RTO propostos para aprovação

| Escopo | RPO a validar | RTO a validar | Observação |
|---|---:|---:|---|
| PostgreSQL/Supabase | ≤ 24 h, alinhado ao backup diário do PRD | ≤ 4 h | RPO/RTO e cobertura de backup/PITR dependem do plano contratado e da validação |
| Objetos privados | ≤ 24 h para metadados; confirmar cópia dos objetos | ≤ 8 h | R2 é referência da arquitetura, não provisionamento confirmado |
| Configuração/segredos | Sem backup de segredo em arquivo | ≤ 4 h | Recuperar por cofre a escolher; nunca versionar valores |

- [ ] Aprovar ou alterar RPO/RTO com responsáveis de produto e operação.
- [ ] Confirmar o projeto Supabase de produção e o plano contratado; registrar
      apenas identificador autorizado, nunca credenciais neste documento.
- [ ] Confirmar a região do projeto e os requisitos de residência/localização
      de dados aplicáveis.
- [ ] Confirmar se o plano contratado oferece backups automáticos, PITR,
      retenção, exportação e restauração point-in-time; se algum item não
      existir, registrar a alternativa aprovada sem inventar capacidade.
- [ ] Definir credenciais separadas para runtime, migrations e operação,
      armazenadas em cofre; não usar conta proprietária para a aplicação.
- [ ] Aplicar menor privilégio, revisar acessos e definir revogação/rotação.
- [ ] Decidir se arquivos R2 e vídeos Bunny terão cópia, retenção e restauração
      próprias; a aplicação não deve tratar URL assinada como backup.

## 3. Política mínima a validar

- [ ] Backup diário do PostgreSQL conforme capacidade confirmada do plano
      Supabase ou exportação complementar aprovada.
- [ ] Pelo menos uma cópia isolada do ambiente primário, com acesso restrito.
- [ ] Confirmar criptografia em trânsito e em repouso no plano Supabase
      contratado e registrar a evidência disponível.
- [ ] Retenção, região, custo e exclusão ao fim da retenção documentados.
- [ ] Monitoramento de sucesso, idade do último backup e espaço disponível.
- [ ] Testar restauração antes do go-live e periodicamente após ele; sem esse
      teste o gate de produção é NO-GO.
- [ ] Registro de quem pode restaurar e quem aprova uma perda de dados.

## 4. Backup executável

1. Confirmar o projeto/ambiente Supabase e a janela; não executar comandos
   destrutivos no banco errado.
2. Iniciar o backup pelo mecanismo disponível no plano contratado ou por
   exportação aprovada.
3. Registrar identificador, início/fim, tamanho, cobertura temporal e status.
4. Verificar que o artefato pode ser lido e que não contém segredos fora do
   escopo previsto.
5. Confirmar que o backup aparece em uma localização isolada e que o alerta de
   falha está configurado.

Para uma cópia lógica, o formato, o comando e o endpoint dependem do plano
Supabase e da estratégia aprovada; não fixar um comando ou credencial nesta
documentação.

## 5. Restauração executável

- [ ] Abrir incidente ou exercício identificado; registrar motivo e RPO/RTO.
- [ ] Confirmar que o plano Supabase contratado suporta o ponto escolhido;
      quando não suportar, usar somente alternativa previamente aprovada.
- [ ] Escolher ponto de restauração e preservar o banco original para
      investigação, quando possível.
- [ ] Restaurar primeiro em ambiente isolado, nunca diretamente sobre produção.
- [ ] Validar conectividade, schema e `npx prisma migrate status`.
- [ ] Executar testes de integridade: usuários/roles, cursos/materiais,
      entitlements, compras, notificações e registros de idempotência.
- [ ] Executar `npm run test` e smoke tests de
      `deploy-e-rollback.md` contra o ambiente restaurado.
- [ ] Reconciliar pagamentos e webhooks recebidos após o ponto restaurado;
      ver `mercado-pago-e-webhooks.md`.
- [ ] Obter aprovação para promover a restauração ou encerrar o exercício.
- [ ] Registrar dados potencialmente perdidos, horário de retorno e ações
      posteriores.

## 6. Proteções

- [ ] Nunca registrar `DATABASE_URL`, tokens, chaves ou conteúdo de backup em
      issues, chat ou logs.
- [ ] Limitar acesso ao backup e ao projeto Supabase por menor privilégio e
      revisar acessos.
- [ ] Em restauração com dados pessoais, aplicar controles LGPD e não usar
      produção em QA sem anonimização/aprovação.
- [ ] Não considerar `prisma migrate reset` como recuperação operacional.

## 7. Evidência de aceite

O procedimento só é operacional quando o plano Supabase, região, backup/PITR,
retenção, credenciais e acessos estiverem confirmados, houver backup bem-sucedido,
teste de restauração medido antes do go-live, evidência de integridade e
aprovação dos RPO/RTO.

## Histórico

| Versão | Data | Mudança |
|---|---|---|
| 0.1 | 2026-08-19 | Rascunho com backup diário, RPO/RTO e teste de restauração |
| 0.2 | 2026-08-19 | Supabase definido para produção; requisitos de plano, região, PITR/backups, retenção, credenciais, menor privilégio e restauração explicitados |
