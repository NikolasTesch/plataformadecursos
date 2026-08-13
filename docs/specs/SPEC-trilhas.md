# SPEC-TRILHAS — Trilhas de Estudo por Edital

- **Versão**: 0.2
- **Data**: 2026-08-12
- **Status**: [APROVADO — 2026-08-12]
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

---

## 5. Exemplos End-to-End

### E2E-T1 — Ordenação por peso
**Given** edital com Português (peso 3) e Informática (peso 1)
**When** aluno ativa a trilha
**Then** todos os materiais de Português vêm antes dos de Informática, ordenados internamente por `ordem`

### E2E-T2 — Versionamento
**Given** aluno ativou edital v1 (peso de Constitucional = 2)
**When** admin publica v2 (peso = 3)
**Then** o aluno mantém o plano v1; novos alunos veem v2

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

---

## 7. Histórico

| Versão | Data | Mudança |
|---|---|---|
| 0.1 | 2026-08-12 | Versão inicial para aprovação |
| 0.2 | 2026-08-12 | T4: múltiplas trilhas ativas (revisão de pendências) |
| 0.2 | 2026-08-12 | **APROVADA** — revisão de aplicabilidade concluída |
