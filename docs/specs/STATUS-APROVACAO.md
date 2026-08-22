# STATUS DE APROVAÇÃO — Specs de Domínio

- **Data**: 2026-08-19 (atualizado: SPEC funcional S6 v0.7 aprovada; refinamentos de persistência S6 pendentes; landing aprovada; S4 concluído/aprovado)
- **Uso**: checklist de revisão/aprovação SDD (AGENTS.md §2). Marcar `[APROVADO]` somente após revisão do usuário. Nenhum slice inicia sem sua spec `[APROVADO]`.

---

## 1. Decisões Finais da Revisão de Pendências (2026-08-12)

Todas as pendências foram decididas pelo usuário. Registro para consulta:

| Pendência | Decisão final |
|---|---|
| C1 — Busca em PDFs | **Indexar conteúdo interno de PDFs** (texto extraído no upload) |
| D-Q1 — Alternativas | Ordem fixa (sem embaralhar) |
| D-Q2 — Montagem de simulados | Seleção manual pelo admin |
| D-Q3 — Saída do banco de erros | Após **2 acertos seguidos** |
| D-A1 — Offline vs. revogação | Manter downloads até **30 dias** após download |
| D-A3 — Gabarito no ZIP | **Sem gabarito** no ZIP |
| D-A4 — Vídeos no ZIP | **Fora do ZIP** (download individual via PWA) |
| T3 — Edital publicado alterado | **Versionar** (aluno mantém versão antiga) |
| T4 — Trilhas simultâneas | **Múltiplas ativas** permitidas |
| F1 — Intervalos SM-2 | 1/3/7/16/35/90 dias |
| F3 — Sugestão de cartão | Exige **confirmação** do aluno |
| D-C1 — Anexos em comentários | Sem anexos |
| D-C2 — Threads | 1 nível (resposta do admin fixada) |
| D-C4 — Denúncias | Sem denúncias no MVP |
| N5 / US-36 — Relatório semanal | **REMOVIDO do escopo** (US-36 excluída da master) |
| D-N2 — Email de novos materiais | Digest diário agrupado |
| D-E1 — Streak no dia atual | Não quebra até o fim do dia |
| E3 — Meta diária padrão | **30 min** (opções 15–90) |
| ED1 — Scraping de concursos | Fica `proposto` → **aprovação do admin** |
| A4 — Rate limits | Login 5/min · reenvio 3/dia · registro 10/hora |
| AD4 — Relatórios admin | Cache/agregação ≤ 1h |

**Documentos atualizados com estas decisões**: SPEC master v2.2 · PRD v2.2 · SPEC-conteudo 0.2 · SPEC-trilhas 0.2 · SPEC-notificacoes 0.3 · modelo-de-dados 0.1 · plano-de-implementacao 0.1.

---

## 2. Matriz de Aprovação (specs de domínio)

As versões anteriores de 15 specs foram aprovadas (13 domínios em 2026-08-12 + `SPEC-frontend.md` e `SPEC-landing.md` em 2026-08-13). `SPEC-mobile.md`: idealização. **Novas US aprovadas em 2026-08-13**: US-44 (sales page), US-45/46 (cupons), US-47/48 (avaliações de curso) — master v2.5. A revisão v0.3 de landing permanece aprovada; a revisão S6 v0.7 de pagamentos permanece aprovada. O modelo/tarefas de persistência S6 estão pendentes de nova aprovação.

| # | Spec | Versão | US cobertas | Status |
|---|---|---|---|---|
| 1 | `SPEC-auth.md` | 0.1 | US-01, 02, 20, 22, 24 | ✅ [APROVADO] |
| 2 | `SPEC-conteudo.md` | 0.2 | US-03, 04, 05, 06, 09, 21, 40, 41 | ✅ [APROVADO] |
| 3 | `SPEC-video.md` | 0.1 | US-07, 10 | ✅ [APROVADO] |
| 4 | `SPEC-questoes.md` | 0.2 | US-08, 13, 27, 37, 38, 39 | ✅ [APROVADO] (Q4 alinhada ao modelo de dados) |
| 5 | `SPEC-aluno.md` | 0.2 | US-11, 12, 14, 15, 29, 30, 43 | ✅ [APROVADO] |
| 6 | `SPEC-pagamentos.md` | 0.7 | US-10, 16, 17, 18, 32, 33, 34 | ✅ [APROVADO] — aprovação explícita em 2026-08-19 |
| 7 | `SPEC-admin.md` | 0.1 | US-19, 31 | ✅ [APROVADO] |
| 8 | `SPEC-trilhas.md` | 0.2 | US-25 | ✅ [APROVADO] (cabeçalho v0.2 corrigido) |
| 9 | `SPEC-flashcards.md` | 0.1 | US-26 | ✅ [APROVADO] |
| 10 | `SPEC-comunidade.md` | 0.1 | US-28 | ✅ [APROVADO] |
| 11 | `SPEC-notificacoes.md` | 0.3 | US-22, 23 | ✅ [APROVADO] |
| 12 | `SPEC-engajamento.md` | 0.1 | US-35 | ✅ [APROVADO] |
| 13 | `SPEC-editais.md` | 0.1 | US-42 | ✅ [APROVADO] |
| 14 | `SPEC-frontend.md` | 0.2 | Transversal (UI/design system) | ✅ [APROVADO — 2026-08-13] |
| 15 | `SPEC-mobile.md` | 0.1 | — (idealização) | [IDEALIZAÇÃO] — sem aprovação necessária |
| 16 | `SPEC-landing.md` | 0.3 | Transversal (landing de alta conversão) | ✅ [APROVADO] — revisão aprovada em 2026-08-19 |

## 3. Documentos de Apoio

| Doc | Versão | Conteúdo | Status |
|---|---|---|---|
| `../modelo-de-dados.md` | 0.8 | Schema consolidado + `user_trilhas.plano_snapshot` + `versao_ativacao` (S7.1, T3/E2E-T2; correção da v0.7) | ✅ [APROVADO] — aprovação explícita em 2026-08-19 |
| `../plano-de-implementacao.md` | 0.5 | Slices S1–S8 (S7 dividido em S7.1/S7.2; migration S7.1 com `plano_snapshot` + `versao_ativacao`) | ✅ [APROVADO] |
| `../DESIGN.md` | 0.7 | Direção visual e arte (prototipagem Pencil, dark mode) | ✅ [APROVADO — 2026-08-13] |

---

## 4. Ordem de Aprovação Recomendada

1. **`SPEC-auth.md`** + **`modelo-de-dados.md`** + **`plano-de-implementacao.md`** → habilita **S1**
2. `SPEC-conteudo.md` → **S2** · `SPEC-aluno.md` → **S3**
3. `SPEC-questoes.md` → **S4** · `SPEC-video.md` → **S5** · `SPEC-pagamentos.md` → **S6**
4. `SPEC-trilhas.md`, `SPEC-flashcards.md`, `SPEC-comunidade.md`, `SPEC-editais.md` → **S7**
5. `SPEC-engajamento.md`, `SPEC-notificacoes.md`, `SPEC-admin.md` → **S8**

---

## 5. Como aprovar

- ~~Em lote / parcial / com ajuste~~ — as versões-base das 15 specs de domínio + 3 documentos de apoio foram aprovadas. S1 concluído em 2026-08-15, S2 concluído em 2026-08-17, S3 implementado em 2026-08-18 e S4 concluído/aprovado em 2026-08-19, com 341 testes unitários, 23 cenários E2E, gate técnico e QA manual integrado F1–F4 aprovados. A revisão v0.3 de landing e a SPEC funcional S6 v0.7 permanecem aprovadas; refinamentos de persistência e itens de implementação S6 permanecem pendentes.

## 6. Pendência residual de validação do S3

O S3 permanece com gate formal pendente, sem reabrir ou alterar nenhuma spec aprovada. O conjunto de testes atualmente presente cobre E1–E4, E7, AL1 e AL2, mas não há registro comprovado de execução/aprovação integral de E1–E7/AL1/AL2 nem da revisão final; E5/E6 não estão cobertos no conjunto atual. A aprovação do S4 é registrada separadamente e não deve ser interpretada como encerramento dessa pendência do S3.

## 7. Decisões do responsável — revisão aprovada (2026-08-19)

| Decisão | Registro documental | Estado |
|---|---|---|
| Primeiro lançamento comercial | Somente após a conclusão de S1–S8 | ✅ [APROVADO] |
| Analytics | Opt-in explícito; ausência de escolha ou recusa não registra analytics | ✅ [APROVADO] |
| Cancelamento de assinatura | Solicitação inicialmente somente via suporte | ✅ [APROVADO] |
| Revisão de ordem do S7 | Divisão em S7.1 (núcleo — trilhas US-25, simulados US-27, flashcards US-26; liberado para implementação após S5, sem dependência de S6) e S7.2 (restante — comentários US-28, avaliações US-47/48, PWA/ZIP US-30/43, editais US-42; condicionado a S6 para *entitlements* e à decisão de jobs/scheduler para PWA sync offline, geração assíncrona de ZIP e rastreamento/scraping de editais) | ✅ [APROVADO — 2026-08-19] |
| Revisão mínima S7.1 (snapshot + `versao_ativacao`) | **Correção da v0.2**: `versao_ativacao` isolada não preserva v1 (editals não versiona histórico). Adição de `user_trilhas.plano_snapshot JsonB` (disciplinas `{id,nome,peso}` + materiais `{id,ordem}` da `materials.ordem` — sem `material_edital.ordem`) criado **junto com** `versao_ativacao int` (cópia explícita, sem default) na ativação e lido como fonte do plano após republicar o edital; `modelo-de-dados.md` v0.8 e `plano-de-implementacao.md` v0.5 atualizados. Não altera specs de domínio. Sem tabelas versionadas, scraping, rollback/admin audit. | ✅ [APROVADO — 2026-08-19] |

As implementações devem respeitar exatamente estas decisões; o lançamento comercial continua bloqueado até a conclusão de S1–S8. A revisão de ordem do S7 (`docs/specs/REVISAO-S7-NUCLEO.md`, aprovada em 2026-08-19) **não altera nenhuma spec de domínio aprovada**: S7.1 está liberado para implementação após S5 e S7.2 permanece condicionado a S6 (entitlements) e à decisão de jobs/scheduler. O `plano-de-implementacao.md` foi atualizado para v0.3 refletindo a divisão.

A aprovação é documental: o S6 ainda não foi implementado, e decisões operacionais ou jurídicas pendentes permanecem pendentes.

## 8. Histórico

| Versão | Data | Mudança |
|---|---|---|
| 0.1 | 2026-08-12 | Criação do checklist de revisão (14 specs + 2 docs de apoio) |
| 0.2 | 2026-08-12 | Registro das decisões finais da revisão de pendências (21 decisões); US-36 removida; T4 múltiplas trilhas; busca indexa PDFs |
| 0.3 | 2026-08-12 | **Todas as specs aprovadas** (13 domínios + modelo de dados + plano). Corrigido: Q4 alinhada ao modelo de dados; cabeçalho SPEC-trilhas v0.2 |
| 0.4 | 2026-08-13 | **`SPEC-frontend.md` aprovada** (v0.2) e `DESIGN.md` v0.7 aprovado — documentação 100% aprovada (14 specs + 3 docs de apoio); única idealização: mobile |
| 0.5 | 2026-08-13 | **`SPEC-landing.md` v0.1 adicionada** — landing de alta conversão [PENDENTE] (funil, CRO, SEO, analytics) |
| 0.6 | 2026-08-13 | **`SPEC-landing.md` v0.2 aprovada** (15 specs aprovadas) + **novas US aprovadas**: US-44 (sales page), US-45/46 (cupons), US-47/48 (avaliações) — specs conteudo 0.3, pagamentos 0.3, comunidade 0.2 revisadas |
| 0.9 | 2026-08-19 | S4 aprovado após gate técnico e QA manual integrado F1–F4; nenhuma spec aprovada foi alterada |
| 1.0 | 2026-08-19 | Status atualizado com 341 testes unitários, 23 E2E e próximo slice S5 — Vídeo |
| 1.1 | 2026-08-19 | Pendência residual do gate S3 explicitada; S4 permanece concluído/aprovado e nenhuma spec aprovada foi alterada |
| 1.2 | 2026-08-19 | Registradas as decisões do responsável: lançamento comercial após S1–S8, analytics por opt-in explícito e cancelamento inicialmente via suporte; revisão de pagamentos v0.5 então pendente. |
| 1.3 | 2026-08-19 | A aprovação da `SPEC-pagamentos.md` v0.5 foi supersedida; a revisão v0.6 permaneceu pendente até nova aprovação explícita. |
| 1.4 | 2026-08-19 | Registrada a correção documental de provedores: Subscriptions/preapproval para recorrência e Checkout Pro para venda única; status S6 rebaixado para [PENDENTE]. |
| 1.5 | 2026-08-19 | **CORRIGIDO** — a revisão S6 v0.6 nunca recebeu aprovação explícita; a aprovação anterior foi somente da v0.5, e os itens de implementação permanecem pendentes. |
| 1.6 | 2026-08-19 | Nova revisão financeira `SPEC-pagamentos.md` v0.7 [PENDENTE — AGUARDANDO APROVAÇÃO]; sincronizados modelo de dados, tarefas S6, política comercial e runbook, sem autorização para implementação. |
| 1.7 | 2026-08-19 | **APROVADO** — aprovação explícita do usuário da revisão financeira `SPEC-pagamentos.md` v0.7; v0.6 nunca foi aprovada, S6 continua não implementado e lançamento condicionado a S1–S8. |
| 1.7 | 2026-08-19 | Correção de histórico: v0.6 permaneceu pendente e foi supersedida pela v0.7, único contrato vigente então pendente de aprovação. |
| 1.8 | 2026-08-19 | **CORRIGIDO** — removida alegação indevida de aprovação da revisão S6 v0.6. |
| 1.9 | 2026-08-19 | **APROVADO** — SPEC funcional S6 v0.7 permanece aprovada; refinamentos de persistência do modelo/tarefas ficam pendentes de nova aprovação. |
| 2.0 | 2026-08-19 | **APROVADO** — modelo/tarefas S6 v0.6 aprovados explicitamente; implementação S6.1 liberada, itens marcados após verificação. |
| 2.1 | 2026-08-19 | **APROVADO** — revisão de ordem do S7 (`REVISAO-S7-NUCLEO.md` v0.1) aprovada pelo usuário: S7 dividido em S7.1 (núcleo, liberado para implementação após S5, sem dependência de S6) e S7.2 (restante, condicionado a S6 para *entitlements* e à decisão de jobs/scheduler para PWA sync offline, geração assíncrona de ZIP e rastreamento/scraping de editais). Nenhuma spec de domínio ou modelo de dados foi alterada; `plano-de-implementacao.md` atualizado para v0.3. |
| 2.2 | 2026-08-19 | **APROVADO** — revisão mínima S7.1 aprovada pelo usuário: `user_trilhas.versao_ativacao int` (cópia de `editals.versao` na ativação) para cumprir T3/E2E-T2 (preservação de v1 no re-publicar do edital); migration futura no S7.1 antes de serviço/UI. `modelo-de-dados.md` → v0.7, `plano-de-implementacao.md` → v0.4, `REVISAO-S7-NUCLEO.md` → v0.2; nenhuma spec de domínio alterada. |
| 2.3 | 2026-08-19 | **APROVADO** — **correção da revisão mínima S7.1 (v0.2/2.2)**: `versao_ativacao` isolada não preserva v1 (a tabela `editals` guarda só o estado atual, sem histórico de versões). O usuário aprovou explicitamente o snapshot imutável `user_trilhas.plano_snapshot JsonB` (disciplinas `{id,nome,peso}` + materiais `{id,ordem}` da `materials.ordem` — sem `material_edital.ordem`) criado **junto com** `versao_ativacao` (cópia explícita, sem default) na ativação e lido como fonte do plano após republicar o edital. `modelo-de-dados.md` → v0.8, `plano-de-implementacao.md` → v0.5, `REVISAO-S7-NUCLEO.md` → v0.3. Sem tabelas versionadas, scraping, rollback/admin audit. |
