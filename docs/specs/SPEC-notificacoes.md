# SPEC-NOTIFICACOES — Notificações (email + in-app)

- **Versão**: 0.3
- **Data**: 2026-08-12
- **Status**: [APROVADO — 2026-08-12]
- **Domínio master**: US-22, US-23 (SPEC master v2.2 §4)

---

## 1. Objetivo

Definir o comportamento das notificações transacionais e informativas: eventos, canais (in-app/email), regras de envio e central de notificações.

> **Nota**: o relatório semanal de estudos (US-36) foi **removido do escopo** em 2026-08-12 (decisão do usuário em revisão de pendências). O streak/meta diária (US-35) permanece em `SPEC-engajamento.md`.

---

## 2. User Stories Cobertas

| US | Título | Origem |
|---|---|---|
| US-22 | Verificação de email (gatilho de canal) | Master v2.0 |
| US-23 | Notificações (email + in-app) | Master v2.0 |

---

## 3. Comportamento Detalhado

### 3.1 Eventos e canais
| Evento | Canal in-app | Canal email |
|---|---|---|
| Novo material publicado em curso acessível | ✅ | ✅ (se email verificado) |
| Expiração de assinatura (T-3 dias) | ✅ | ✅ (obrigatório — transacional) |
| Assinatura expirada | ✅ | ✅ (obrigatório) |
| Resposta de admin a comentário | ✅ | ✅ (se verificado) |
| Verificação de email (link) | — | ✅ (obrigatório) |
| Trilha: revisões pendentes (flashcards, diário) | ✅ (badge) | ❌ (digest opcional) |

### 3.2 Regras de envio
- Email: provider transacional (Resend/SES — decisão D-N1); templates por evento; unsubscribe para não-transacionais.
- In-app: central de notificações (lista, não-lidas com badge, marcar como lida, "marcar todas"); persistidas no banco; ordenadas por data desc.
- Novo material: agrupamento diário (1 email "3 novos materiais em 2 cursos" em vez de 3 emails — D-N2).
- Expiração: 1 envio por assinatura por ciclo (evita spam em falhas de webhook — idempotência por `notification_key`).
- Falha de envio: retry com backoff (3 tentativas); falha final logada (sem bloqueio de fluxo).

### 3.3 Preferências (MVP mínimo)
- Aluno escolhe: notificações de novo material (email on/off); demais transacionais sempre ligadas.
- Desativar email não desativa in-app.

---

## 4. Regras Específicas do Domínio

| # | Regra |
|---|---|
| N1 | Email transacional (verificação, expiração) não depende de opt-in; informativo (novo material) depende. |
| N2 | Envio idempotente por `notification_key` (evento+usuário). |
| N3 | Agrupamento diário de "novos materiais" por aluno. |
| N4 | In-app sempre ativo; email respeita preferências + verificação. |

---

## 5. Exemplos End-to-End

### E2E-N1 — Sem verificação, sem email informativo
**Given** aluno com email não verificado e curso acessível
**When** novo material é publicado
**Then** notificação in-app criada; nenhum email informativo enviado

### E2E-N2 — Expiração sem spam
**Given** assinatura expira em 3 dias
**When** job de notificação roda 2x no mesmo dia
**Then** apenas 1 notificação criada (chave idempotente)

### E2E-N3 — Badge de não lidas
**Given** aluno com 3 notificações in-app não lidas
**When** aluno abre a central
**Then** badge = 3; após abrir, marca como lidas individualmente

---

## 6. Decisões do Domínio

| Data | Decisão |
|---|---|
| 2026-08-12 | D-N1: provider de email transacional (Resend/SES) — escolha final em implementação |
| 2026-08-12 | D-N2: digest diário agrupado para novos materiais |

---

## 7. Histórico

| Versão | Data | Mudança |
|---|---|---|
| 0.1 | 2026-08-12 | Versão inicial para aprovação |
| 0.2 | 2026-08-12 | Relatório semanal de estudos (US-36) |
| 0.3 | 2026-08-12 | **US-36 removida do escopo** (decisão do usuário); volta a cobrir US-22/US-23 |
| 0.3 | 2026-08-12 | **APROVADA** — revisão de aplicabilidade concluída |
