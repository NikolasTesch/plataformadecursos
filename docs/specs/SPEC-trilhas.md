# SPEC-TRILHAS — Trilhas de Estudo por Edital

- **Versão**: 0.3
- **Data**: 2026-08-12 (atualizado para snapshot em 2026-08-19)
- **Status**: [APROVADO — 2026-08-12; atualizado para snapshot em 2026-08-19]
- **Domínio master**: US-25 (SPEC master v2.2 §4)

---

## 1. Objetivo

Definir o comportamento das trilhas de estudo construídas a partir de editais: admin monta o edital e vincula conteúdo a disciplinas; aluno segue um plano ordenado por peso com progresso por disciplina.

---

## 2. User Stories Cobertas

| US | Título | Origem |
|---|---|---|
| US-25 | Trilhas de estudo por edital | Master v2.0 |

---

## 3. Comportamento Detalhado

### 3.1 Admin: montagem do edital
- Criar edital: nome (ex.: "TRT-24 Técnico"), banca, data da prova (opcional), status (rascunho/publicado).
- Disciplinas do edital: nome + peso (inteiro ≥ 1). Ex.: Português (peso 3), Direito Constitucional (peso 2).
- Vínculo de conteúdo: cada material pode ser vinculado a 0..1 disciplina do edital (vínculo por material, validado no servidor).
- Publicar edital: disponibiliza a trilha para alunos; edital publicado não permite alterar pesos sem republicar (versões — decisão D-T1: alteração cria nova versão; versões antigas permanecem para alunos que ativaram antes).

### 3.2 Aluno: uso da trilha
- Ativar trilha: a partir da página do edital publicado; **aluno pode ter múltiplas trilhas ativas simultaneamente** (D-T2) — útil para quem estuda para mais de um concurso; progresso é independente por trilha.
- Plano da trilha: materiais ordenados por (peso da disciplina desc, ordem dentro da disciplina); progresso por disciplina (% concluído) e progresso geral da trilha.
- Plano da trilha (fonte): após a ativação, o plano do aluno é lido de um **snapshot imutável** (`user_trilhas.plano_snapshot`) que congela disciplinas (`id`, `nome`, `peso`) e materiais (`id`, `ordem` — sendo `ordem` a `materials.ordem` existente, não há `material_edital.ordem`) no instante da ativação. Ao republicar o edital, alunos com trilha ativa mantêm o snapshot; novos alunos geram snapshot da nova versão (T3/E2E-T2). O snapshot preserva **composição e ordem**, não o conteúdo dos materiais.
- Conclusão da trilha: 100% dos materiais acessíveis concluídos → selo "trilha concluída" (sem certificado — certificado é por curso, US-29).
- Materiais bloqueados (sem entitlement) aparecem no plano com estado bloqueado; não contam no denominador de progresso (mesma regra AL1).
- Aluno sem acesso a materiais da trilha vê o plano com CTAs de compra/assinatura.

---

## 4. Regras Específicas do Domínio

| # | Regra |
|---|---|
| T1 | Material vinculado a 0..1 disciplina do edital. |
| T2 | Ordenação da trilha: peso da disciplina (desc) → ordem do material. |
| T3 | Edital publicado é versionado: mudanças não afetam alunos que já ativaram a versão anterior. |
| T4 | Aluno pode ter **múltiplas trilhas ativas**; progresso independente por trilha. |
| T5 | Progresso da trilha segue AL1 (bloqueados fora do denominador). |

> **T3 — implementação por snapshot (2026-08-19)**: a preservação da v1 do aluno não é feita por `versao_ativacao` isolada (o contador `editals.versao` é sobrescrito na republicação e a tabela `editals` não guarda histórico). O contrato é `user_trilhas.plano_snapshot JsonB` criado **junto com** `versao_ativacao` (cópia explícita, sem default) na ativação e lido como fonte do plano após republicar o edital. A `ordem` do material no snapshot é a `materials.ordem` existente. Não há `material_edital.ordem`, tabelas versionadas, scraping, rollback ou auditoria admin.

---

## 5. Exemplos End-to-End

### E2E-T1 — Ordenação por peso
**Given** edital com Português (peso 3) e Informática (peso 1)
**When** aluno ativa a trilha
**Then** todos os materiais de Português vêm antes dos de Informática, ordenados internamente por `ordem`

### E2E-T2 — Versionamento
**Given** aluno ativou edital v1 (peso de Constitucional = 2)
**When** admin publica v2 (peso = 3)
**Then** o aluno mantém o plano v1 (lido do `plano_snapshot` congelado na ativação); novos alunos veem v2 (snapshot da versão corrente)

### E2E-T3 — Múltiplas trilhas ativas
**Given** aluno com trilha "TRT" ativa
**When** aluno ativa trilha "INSS"
**Then** ambas ficam ativas; progressos preservados e independentes; home lista as duas com seus %

---

## 6. Decisões do Domínio

| Data | Decisão |
|---|---|
| 2026-08-12 | D-T1: versionamento de editais publicados |
| 2026-08-12 | D-T2: **múltiplas trilhas ativas** permitidas (decisão do usuário em revisão de pendências) |
| 2026-08-19 | D-T3: preservação da v1 por `plano_snapshot JsonB` (disciplinas + materiais com `ordem` de `materials.ordem`) criado na ativação junto com `versao_ativacao` explícita; `versao_ativacao` isolada não preserva v1. Sem `material_edital.ordem`. |

---

## 7. Histórico

| Versão | Data | Mudança |
|---|---|---|
| 0.1 | 2026-08-12 | Versão inicial para aprovação |
| 0.2 | 2026-08-12 | T4: múltiplas trilhas ativas (revisão de pendências) |
| 0.2 | 2026-08-12 | **APROVADA** — revisão de aplicabilidade concluída |
| 0.3 | 2026-08-19 | **APROVADA** — atualização para snapshot imutável (`plano_snapshot` + `versao_ativacao` explícita) cumprindo T3/E2E-T2; `versao_ativacao` isolada não preserva v1. Sem `material_edital.ordem`, tabelas versionadas, scraping, rollback ou auditoria admin. |
