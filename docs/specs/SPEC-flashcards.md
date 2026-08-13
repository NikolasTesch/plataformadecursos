# SPEC-FLASHCARDS — Flashcards e Revisão Espaçada

- **Versão**: 0.1
- **Data**: 2026-08-12
- **Status**: [APROVADO — 2026-08-12]
- **Domínio master**: US-26 (SPEC master v2.0 §4)

---

## 1. Objetivo

Definir o comportamento de flashcards (cartões pergunta/resposta) com revisão espaçada simplificada (SM-2), para memorização de conteúdo.

---

## 2. User Stories Cobertas

| US | Título | Origem |
|---|---|---|
| US-26 | Flashcards e revisão espaçada | Master v2.0 |

---

## 3. Comportamento Detalhado

### 3.1 Criação de cartões
- Aluno cria cartão manualmente: pergunta (obrigatória), resposta (obrigatória), material de origem (opcional, vincula ao conteúdo estudado).
- Sugestão automática: questões respondidas erradas em blocos/simulados geram cartão sugerido (pergunta = enunciado, resposta = comentário/gabarito); aluno confirma ou descarta.
- Cartões pertencem ao aluno (privados).

### 3.2 Revisão espaçada (SM-2 simplificado)
- Cada cartão tem: nível (0–5), `proxima_revisao` (data), contagem de revisões.
- Intervalos (dias) por nível: 0→1, 1→3, 2→7, 3→16, 4→35, 5→90 (decisão D-F1).
- Ao revisar:
  - **Acerto** → nível +1 (máx. 5), `proxima_revisao` = hoje + intervalo do novo nível.
  - **Erro** → nível = 0, `proxima_revisao` = hoje + 1 dia (revisão no dia seguinte).
- Fila diária: cartões com `proxima_revisao <= hoje`, ordenados por data; contador "X revisões pendentes".
- Sessão de revisão: mostra pergunta → aluno vira o cartão → autoavalia "acertei/errei" → registra.
- Estatísticas: total, por nível, taxa de acerto, streak diário de revisões (opcional).

---

## 4. Regras Específicas do Domínio

| # | Regra |
|---|---|
| F1 | Intervalos SM-2 simplificado: 1, 3, 7, 16, 35, 90 dias (níveis 0–5). |
| F2 | Erro reinicia o nível para 0 (revisão em 1 dia). |
| F3 | Cartão sugerido de questão errada exige confirmação do aluno (não é criado automaticamente). |
| F4 | Cartões são privados do aluno (incluídos na exportação LGPD, US-24). |

---

## 5. Exemplos End-to-End

### E2E-F1 — Intervalos crescentes
**Given** cartão nível 1 (acerto) revisado hoje
**When** aluno acerta novamente
**Then** nível = 2 e `proxima_revisao` = hoje + 3 dias

### E2E-F2 — Erro reinicia
**Given** cartão nível 4
**When** aluno erra na revisão
**Then** nível = 0 e `proxima_revisao` = amanhã

### E2E-F3 — Sugestão confirmada
**Given** aluno errou questão em simulado
**When** sistema sugere cartão a partir da questão
**Then** o cartão só é criado após o aluno confirmar; descartado caso contrário

---

## 6. Decisões do Domínio

| Data | Decisão |
|---|---|
| 2026-08-12 | D-F1: intervalos fixos simplificados (sem fator de facilidade dinâmico do SM-2 completo) |

---

## 7. Histórico

| Versão | Data | Mudança |
|---|---|---|
| 0.1 | 2026-08-12 | Versão inicial para aprovação |
| 0.1 | 2026-08-12 | **APROVADA** — revisão de aplicabilidade concluída |
