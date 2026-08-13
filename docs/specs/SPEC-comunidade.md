# SPEC-COMUNIDADE — Comentários e Dúvidas

- **Versão**: 0.2
- **Data**: 2026-08-13
- **Status**: [APROVADO — 2026-08-12 · revisado 2026-08-13]
- **Domínio master**: US-28 (SPEC master v2.0 §4)

---

## 1. Objetivo

Definir o comportamento de comentários e dúvidas por material, com resposta do admin.

---

## 2. User Stories Cobertas

| US | Título | Origem |
|---|---|---|
| US-28 | Comentários e dúvidas | Master v2.0 |
| US-47 | Aluno avalia curso | Master v2.5 |
| US-48 | Admin modera avaliações | Master v2.5 |

---

## 3. Comportamento Detalhado

### 3.1 Criação e visibilidade
- Comentar: aluno autenticado **com acesso ao material** (R1–R12 aplicadas no momento da ação).
- Comentário: texto (máx. 2.000 caracteres), anexo não permitido no MVP (D-C1).
- Visibilidade: apenas alunos com acesso ao material veem os comentários do material (gating na leitura e na escrita).
- Ordenação: mais recentes primeiro; sem threads aninhadas no MVP (D-C2) — respostas do admin aparecem como comentário marcado "Resposta do admin".

### 3.2 Admin
- Admin vê comentários de qualquer material; responde (texto, mesmo limite); marca como "respondido".
- Comentário respondido exibe badge; resposta fixa no topo daquele comentário (visual), mantendo ordenação cronológica da lista.
- Admin pode excluir comentário (conteúdo impróprio) — exclusão é definitiva; aluno não pode excluir comentários dos outros, apenas os próprios (editar/excluir próprios permitido).

### 3.3 Notificações
- Aluno autor do comentário recebe notificação (in-app; email se verificado — US-23) quando admin responde.
- Admin recebe in-app quando novo comentário chega em qualquer material (sem email no MVP — D-C3).

### 3.4 Moderação
- Lista de comentários no admin com filtro "não respondidos" e "recentes".
- Sem sistema de denúncia/aluno→aluno no MVP (D-C4).

### 3.5 Avaliações de curso (US-47, US-48)
- **Aluno (US-47)**: avalia curso com nota 1–5 (obrigatória) + comentário curto (máx. 500 caracteres, opcional).
  - Exige **entitlement real** do curso (pagamento, trial ou concessão admin — amostra não conta — D-R1).
  - 1 avaliação por aluno/curso (pk user+course); avaliar de novo **substitui** a anterior (editável).
  - Avaliação nasce `pendente`; entra na nota média somente quando aprovada (D-R2).
- **Moderação (US-48)**: admin lista avaliações com filtros (status, curso, nota); ações: aprovar, ocultar, excluir (definitiva).
- **Exibição**: nota média (aprovadas) + comentários aprovados aparecem na sales page do curso (US-44 / SPEC-conteudo §3.8) e podem ser destaque na landing (SPEC-landing R-L3). Avaliação oculta/excluída sai da média e da exibição.
- **Notificações**: admin recebe in-app quando nova avaliação chega (mesmo padrão D-C3 — sem email no MVP).

---

## 4. Regras Específicas do Domínio

| # | Regra |
|---|---|
| CO1 | Comentar exige entitlement do material (gating na escrita). |
| CO2 | Ver comentários exige entitlement (gating na leitura). |
| CO3 | Admin responde e marca "respondido" (1 resposta por comentário no MVP). |
| CO4 | Aluno edita/exclui apenas os próprios comentários. |
| CO5 | Texto limitado a 2.000 caracteres, sanitizado na renderização. |
| CO6 | Avaliar exige entitlement real do curso (pagamento/trial/admin; amostra não conta); 1 avaliação por aluno/curso, editar substitui (D-R1). |
| CO7 | Moderação: avaliação nasce `pendente`; aprovar/ocultar/excluir; nota média considera apenas aprovadas (D-R2). |
| CO8 | Comentário de avaliação: máx. 500 caracteres, sanitizado; nota 1–5 obrigatória. |

---

## 5. Exemplos End-to-End

### E2E-CO1 — Sem acesso, sem comentar
**Given** aluno sem entitlement do curso
**When** tenta comentar em material do curso
**Then** ação bloqueada (R12); UI não exibe formulário de comentário

### E2E-CO2 — Resposta do admin notifica
**Given** aluno comentou no material e tem email verificado
**When** admin responde o comentário
**Then** o comentário ganha badge "respondido" e o aluno recebe notificação in-app + email

### E2E-CO3 — Sem acesso, sem avaliar
**Given** aluno sem entitlement real do curso (só leu a amostra)
**When** tenta avaliar o curso
**Then** ação bloqueada; UI não exibe formulário de avaliação

### E2E-CO4 — Avaliação oculta sai da média
**Given** curso com 2 avaliações aprovadas (5 e 3 → média 4,0) e 1 pendente
**When** admin oculta a avaliação 5
**Then** a média pública passa a 3,0 (apenas aprovadas) e o comentário oculto não é exibido

---

## 6. Decisões do Domínio

| Data | Decisão |
|---|---|
| 2026-08-12 | D-C1: sem anexos em comentários; D-C2: sem threads aninhadas (1 nível) |
| 2026-08-12 | D-C3: admin sem email de comentário no MVP; D-C4: sem denúncias aluno→aluno |
| 2026-08-13 | D-R1: avaliação exige entitlement real (amostra não conta); 1 por aluno/curso, editar substitui |
| 2026-08-13 | D-R2: nota média considera apenas avaliações aprovadas |

---

## 7. Histórico

| Versão | Data | Mudança |
|---|---|---|
| 0.1 | 2026-08-12 | Versão inicial para aprovação |
| 0.1 | 2026-08-12 | **APROVADA** — revisão de aplicabilidade concluída |
| 0.2 | 2026-08-13 | **Avaliações de curso (US-47/48)** — §3.5, regras CO6–CO8, E2E-CO3/CO4 (D-R1/D-R2) |
