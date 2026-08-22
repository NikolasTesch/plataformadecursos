# REVISÃO DE ORDEM DO PLANO — Antecipação do Núcleo do S7

- **Versão**: 0.3
- **Data**: 2026-08-19
- **Status**: [APROVADO — 2026-08-19]
- **Alvo**: `docs/plano-de-implementacao.md` v0.2 [APROVADO]
- **Método**: SDD (AGENTS.md §2) — revisão de escopo via spec, sem alterar contratos comportamentais já aprovados.
- **Validação do conteúdo e aprovação**: responsabilidade do coordenador/usuário (não do agente de implementação).

---

## 1. Objetivo e Motivo

Antecipar a entrega do **núcleo independente do S7** (trilhas, simulados, flashcards) para que ele possa ser implementado **antes de S6** e **antes da decisão de jobs/scheduler**, sem tocar em nenhum contrato comportamental já aprovado (specs de domínio permanecem inalteradas; exceção de schema documentada em §10: S7.1 inclui a migration mínima `user_trilhas.plano_snapshot` + `user_trilhas.versao_ativacao` para cumprir T3/E2E-T2; a `versao_ativacao` isolada da v0.2 não preserva v1 e foi corrigida em §10).

**Motivo**: o núcleo de estudo — trilhas por edital, simulados cronometrados e flashcards SM-2 — é funcionalmente autônomo. Ele não depende de pagamentos (S6) nem de execução agendada em background (jobs/scheduler). Aprovar esta revisão permite iniciar o S7.1 imediatamente após S5, enquanto os itens que dependem de *entitlement* (S6) ou de agendamento permanecem no S7.2. Isso reduz o caminho crítico até um produto de estudo utilizável, sem abrir exceções de escopo.

---

## 2. Decisão Proposta

Dividir o S7 aprovado em duas partes ordenadas:

- **S7.1 — Núcleo** (independente de S6/jobs):
  - Trilhas por edital — **US-25** (T1–T5)
  - Simulados cronometrados e histórico — **US-27** (Q2–Q4)
  - Flashcards SM-2 — **US-26** (F1–F4)
- **S7.2 — Restante** (pós-S6 + decisão de jobs/scheduler): comentários (US-28), avaliações/moderação (US-47/48), PWA/offline e ZIP (US-30/43), editais e scraping (US-42).

O S7.1 **não altera nenhuma spec de domínio**: reutiliza `SPEC-trilhas.md` v0.2, `SPEC-questoes.md` v0.2 (§simulados) e `SPEC-flashcards.md` v0.1, todos já `[APROVADO]`. A divisão é de **ordem de entrega**; a única exceção é a adição de `user_trilhas.plano_snapshot JsonB` (snapshot imutável da composição/ordem da trilha) e de `user_trilhas.versao_ativacao Int` (cópia explícita de `editals.versao` na ativação), ambos criados na ativação e lidos para a trilha — migration mínima do S7.1, ver §10 — para viabilizar o versionamento T3/E2E-T2 sem alterar contratos de domínio. A `versao_ativacao` isolada (v0.2) foi corrigida porque não preserva v1 (§10).

---

## 3. Exclusões Explícitas (permanecem em S7.2)

Os seguintes itens são **excluídos do S7.1** e permanecem no S7.2, aguardando S6 e a decisão aprovada de jobs/scheduler:

- **Comentários** — US-28 (`SPEC-comunidade.md`)
- **Avaliações de curso e moderação** — US-47/48 (`SPEC-comunidade.md`)
- **PWA/offline e download em lote ZIP** — US-30/43 (`SPEC-aluno.md` §PWA)
- **Editais e scraping** — US-42 (`SPEC-editais.md`)

Nenhuma dessas US é removida do escopo do produto; apenas é **reordenada** para depois de S6 + jobs/scheduler. O conjunto de US do S7 (9 no total) é preservado integralmente.

---

## 4. Dependências

- **S7.1** depende de **S2** (materiais/questões), **S3** (gating/progresso), **S4** (questões/blocos) e de **S5** **apenas onde houver reutilização** de componentes ou serviços (ex.: posição/conclusão de vídeo em trilhas, se aplicável). **S6 não é requisito para o núcleo.**
- **S7.2** depende de **S6** (entitlement de pagamento para itens que exigem acesso comercial) e da **decisão aprovada de jobs/scheduler**, cujo pré-requisito técnico aplica-se a sync offline, geração assíncrona de ZIP e rastreamento/scraping de editais. Comentários e avaliações ficam em S7.2 pelo acoplamento de *entitlement* com S6, não por dependência de jobs/scheduler.
- **Explicação**: S6 é requisito de *entitlement* (concessão/revogação de acesso pago) para os itens de acesso comercial excluídos — comentários, avaliações, PWA/offline e download em lote ZIP. Editais e scraping (US-42) não são descritos como dependentes de *entitlement*; sua permanência em S7.2 deve-se à necessidade de execução agendada (jobs/scheduler) para rastreamento e scraping. O núcleo de estudo (S7.1) opera sobre conteúdo já liberado pelo gating de S3 e, portanto, não precisa de S6.

---

## 5. Proposta Exata de Alteração no Plano (`docs/plano-de-implementacao.md` v0.2)

### 5.1 Visão geral (diagrama ASCII, linha 17)

**Atual:**
```
S7 Expansão (trilhas, simulados, flashcards, comunidade, certificados, PWA, editais)
```

**Proposto** — remover "certificados" (certificados pertencem a S3/US-29, não a S7):
```
S7 Expansão (trilhas, simulados, flashcards, comunidade, PWA, editais)
```

> Nota: o desdobramento em S7.1/S7.2 ocorre na tabela (§5.3); a visão geral recebe apenas a correção de escopo (retirada de "certificados").

### 5.2 Linha de dependências (linha 21)

**Atual:**
> Slices com seta dupla: S5 depende do schema de materials (S2). S6 depende de S1 (auth) e S3 (gating). S7 depende de S2–S5. S8 acumula dados dos anteriores.

**Proposto:**
> Slices com seta dupla: S5 depende do schema de materials (S2). S6 depende de S1 (auth) e S3 (gating). S7.1 (núcleo) depende de S2–S4 e de S5 apenas onde houver reutilização de componentes/serviços; S6 não é requisito para o núcleo. S7.2 (restante) depende de S6 (entitlement de pagamento) e da decisão aprovada de jobs/scheduler. S8 acumula dados dos anteriores.

### 5.3 Tabela S7 desdobrada em S7.1 e S7.2 (preservando todas as US)

Substituir a seção `### S7 — Expansão (trilhas, simulados, flashcards, comunidade, certificados, PWA, editais)` (linhas 81–88) por duas seções:

**S7.1 — Núcleo (trilhas, simulados, flashcards)**
| Item | Conteúdo |
|---|---|
| **Escopo** | Trilhas por edital (versionamento T3); simulados cronometrados (entrega automática Q2, histórico Q3); flashcards SM-2 (F1–F4) |
| **Specs** | `SPEC-trilhas.md`, `SPEC-questoes.md` (§simulados), `SPEC-flashcards.md` |
| **US** | US-25, US-27, US-26 |
| **Testes** | Unit: T3 (versionamento), Q2 (entrega automática), F1/F2 (intervalos SM-2). E2E: E2E-T1..T3, E2E-Q2/Q3, E2E-F1..F3 |
| **Saída** | Núcleo de estudo independente: trilha por edital, simulado cronometrado e revisão espaçada |

**S7.2 — Restante (comunidade, avaliações, PWA, editais)**
| Item | Conteúdo |
|---|---|
| **Escopo** | Comentários (CO1–CO5); avaliações de curso (US-47/48 — nota média + moderação); PWA offline (AL4/AL5, download lote ZIP); rastreamento de editais manual + scraping (P0-3) |
| **Specs** | `SPEC-comunidade.md` (comentários + avaliações), `SPEC-aluno.md` (§PWA), `SPEC-editais.md` |
| **US** | US-28, US-30, US-42, US-43, US-47 (avaliação), US-48 (moderação) |
| **Testes** | Unit: fila de sync offline, CO6 (gating de avaliação) e nota média (apenas aprovadas). E2E: E2E-AL3, E2E-CO1..CO4 |
| **Saída** | Comunidade, avaliações, offline e editais — após S6 + decisão de jobs/scheduler |

> **US preservadas** (todas as 9 do S7 original): US-25, US-27, US-26 (S7.1) + US-28, US-30, US-42, US-43, US-47, US-48 (S7.2).

---

## 6. Critérios / Gates de Implementação (somente S7.1)

O S7.1 entra somente com os seguintes gates, alinhados à regra de entrega por slice (plano §3):

- **Testes unitários**: `T3` (versionamento de trilha), `Q2` (entrega automática de simulado), `F1/F2` (intervalos SM-2).
- **Testes E2E**: `E2E-T1..T3`, `E2E-Q2..Q3`, `E2E-F1..F3`.
- **Validação de build/tooling**: `npm run lint`, `npm run build`, `npx prisma validate` e `npx prisma migrate status` (ou `prisma migrate dev` por slice, nunca migration acumulada).
- **Revisão**: revisão contra spec (`revisor`) confirmando que nenhum contrato de `SPEC-trilhas.md`, `SPEC-questoes.md` (§simulados) e `SPEC-flashcards.md` foi alterado.

---

## 7. Impacto

- **Schema / modelo de dados**: exceção documentada em §10 — o S7.1 inclui a migration mínima `user_trilhas.plano_snapshot JsonB` + `user_trilhas.versao_ativacao int` (snapshot imutável da composição/ordem criado junto com a cópia da versão na ativação) para cumprir T3/E2E-T2; nenhuma outra tabela/campo muda. As specs de domínio citadas permanecem `[APROVADO]` inalteradas e o `modelo-de-dados.md` foi atualizado para v0.8 refletindo esses campos. A `versao_ativacao` isolada (v0.2) não preserva v1 e foi corrigida (§10).
- **Lançamento comercial**: continua exigindo S1–S8 concluídos e aprovados (decisão do responsável em `STATUS-APROVACAO.md` §7). Esta revisão apenas reordena S7; não antecipa o go-live.
- **Gate residual de S3**: não é encerrado por esta proposta. A pendência de validação do S3 (`STATUS-APROVACAO.md` §6) permanece aberta e independente do S7.1.

---

## 8. Aprovação

Esta revisão foi **aprovada explicitamente pelo usuário em 2026-08-19**. As alterações em `plano-de-implementacao.md` (v0.2 → v0.3 → v0.5) e `modelo-de-dados.md` (v0.7 → v0.8) foram aplicadas; S7.1 está liberado para implementação após S5. A v0.3 corrige a v0.2: `versao_ativacao` isolada não preserva v1, substituída pelo snapshot `plano_snapshot` + cópia explícita da versão.

- [x] Aprovar a revisão e aplicar as alterações em `docs/plano-de-implementacao.md` v0.2 → v0.3 (aplicado em 2026-08-19)
- [x] Aprovar S7.1 como slice liberado para implementação (após S5) — liberado em 2026-08-19
- [ ] Rejeitar / solicitar ajustes

Validado e aprovado por: Usuário (aprovação explícita)  Data: 2026-08-19

---

## 9. Histórico

| Versão | Data | Mudança |
|---|---|---|
| 0.1 | 2026-08-19 | Criação da proposta [PENDENTE] de revisão de ordem do S7 (antecipação do núcleo S7.1), sem alterar contratos comportamentais aprovados |
| 0.1 | 2026-08-19 | **APROVADA** pelo usuário — revisão de ordem S7.1/S7.2 aplicada em `plano-de-implementacao.md` v0.3; S7.1 liberado para implementação após S5; nenhuma spec de domínio alterada |
| 0.2 | 2026-08-19 | **APROVADA** pelo usuário — revisão mínima S7.1: adicionado `user_trilhas.versao_ativacao int` (migration no S7.1 antes de serviço/UI) para cumprir T3/E2E-T2; `modelo-de-dados.md` v0.7 e `plano-de-implementacao.md` v0.4 atualizados; nenhuma spec de domínio alterada |
| 0.3 | 2026-08-19 | **APROVADA** pelo usuário — **correção da v0.2**: `versao_ativacao` isolada não preserva v1 (a tabela `editals` guarda só o estado atual, sem histórico de versões). Substituída por `user_trilhas.plano_snapshot JsonB` (disciplinas `{id,nome,peso}` + materiais `{id,ordem}` copiados da `materials.ordem` existente — sem `material_edital.ordem`) criado **junto com** `versao_ativacao` na ativação e lido para a trilha; `versao_ativacao` copiada explicitamente (sem default). `modelo-de-dados.md` → v0.8, `plano-de-implementacao.md` → v0.5. Sem tabelas versionadas, scraping, rollback/admin audit ou `material_edital.ordem`. |

---

## 10. Revisão Mínima S7.1 — Snapshot imutável da trilha (`plano_snapshot` + `versao_ativacao`) (2026-08-19)

**Decisão aprovada (2026-08-19)**: o S7.1 inclui, na tabela `user_trilhas`, a adição de **`plano_snapshot JsonB`** e de **`versao_ativacao Int`**, com migration aplicada **antes de serviço/UI**, para cumprir **T3** (versionamento de edital) e **E2E-T2** (versionamento). Esta é a única alteração de schema do S7.1 e não modifica nenhuma spec de domínio.

**Correção da v0.2 — por que `versao_ativacao` isolada NÃO preserva v1**: o campo `editals.versao` é um contador que é **sobrescrito** quando o edital é republicado; a tabela `editals` guarda apenas o estado atual (disciplinas/pesos e vínculos de materiais), sem histórico das versões anteriores. Armazenar só o número da versão (ex.: `1`) não reconstitui a composição da v1 — ao republicar, as disciplinas, pesos e vínculos atuais sobrescrevem os da v1, e o aluno perde o plano que ativou. Por isso a v0.2 está **corrigida** por esta v0.3.

**Contrato mínimo (v0.3)**:
- **`plano_snapshot JsonB`** — criado **junto com** `versao_ativacao` no instante da ativação da trilha. Contém a composição congelada da trilha: `disciplinas: [{id, nome, peso}]` e `materiais: [{id, ordem}]`. A `ordem` copiada é a `materials.ordem` **existente** (não há `material_edital.ordem`).
- **`versao_ativacao Int`** — cópia **explícita** de `editals.versao` no momento da ativação. **Sem default**: deve ser preenchida pela aplicação no ato da ativação; a ausência de default impede que a coluna seja criada com valor nulo silencioso. Corrigida por migration adicional se necessário.
- **Leitura da trilha**: após a republicação do edital, o plano da trilha é lido **do `plano_snapshot`** (fonte da verdade do plano do aluno), e não recalculado a partir do `editals` atual. Novos alunos ativam com o snapshot da versão corrente.
- **Migration seguinte**: aplica também os **checks/constraints essenciais já recomendados** (ex.: `unique(user_id, edital_id)`, coerência de `ativo`) **somente se fizerem parte do contrato planejado** — sem prometer tabelas versionadas, scraping, rollback/admin audit ou `material_edital.ordem`.

**Limite do snapshot (explicado)**: o `plano_snapshot` preserva a **composição e a ordem** da trilha no instante da ativação (quais disciplinas/pesos e quais materiais/ordem compunham a v1). Ele **não versiona o conteúdo dos materiais**: se o conteúdo de um material (texto, PDF, vídeo) for alterado depois, o aluno vê o conteúdo atual daquele material — o snapshot congela o plano, não o conteúdo. Isso atende T3/E2E-T2 (aluno mantém o plano v1) sem prometer versionamento de conteúdo.

**Aprovação**: usuário aprovou explicitamente em 2026-08-19 (v0.2 e correção v0.3).
