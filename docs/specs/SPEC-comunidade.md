# SPEC-COMUNIDADE — Comentários e Dúvidas

- **Versão**: 0.1
- **Data**: 2026-08-12
- **Status**: [APROVADO — 2026-08-12]
- **Domínio master**: US-28 (SPEC master v2.0 §4)

---

## 1. Objetivo

Definir o comportamento de comentários e dúvidas por material, com resposta do admin.

---

## 2. User Stories Cobertas

| US | Título | Origem |
|---|---|---|
| US-28 | Comentários e dúvidas | Master v2.0 |

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

---

## 4. Regras Específicas do Domínio

| # | Regra |
|---|---|
| CO1 | Comentar exige entitlement do material (gating na escrita). |
| CO2 | Ver comentários exige entitlement (gating na leitura). |
| CO3 | Admin responde e marca "respondido" (1 resposta por comentário no MVP). |
| CO4 | Aluno edita/exclui apenas os próprios comentários. |
| CO5 | Texto limitado a 2.000 caracteres, sanitizado na renderização. |

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

---

## 6. Decisões do Domínio

| Data | Decisão |
|---|---|
| 2026-08-12 | D-C1: sem anexos em comentários; D-C2: sem threads aninhadas (1 nível) |
| 2026-08-12 | D-C3: admin sem email de comentário no MVP; D-C4: sem denúncias aluno→aluno |

---

## 7. Histórico

| Versão | Data | Mudança |
|---|---|---|
| 0.1 | 2026-08-12 | Versão inicial para aprovação |
| 0.1 | 2026-08-12 | **APROVADA** — revisão de aplicabilidade concluída |
