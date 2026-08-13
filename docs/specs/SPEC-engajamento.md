# SPEC-ENGAJAMENTO — Streak Diário e Meta de Estudo

- **Versão**: 0.1
- **Data**: 2026-08-12
- **Status**: [APROVADO — 2026-08-12]
- **Domínio master**: US-35 (SPEC master v2.1 §4)

---

## 1. Objetivo

Definir o comportamento do streak diário (dias consecutivos de estudo) e da meta diária de estudo — mecanismos de hábito e retenção do concurseiro.

---

## 2. User Stories Cobertas

| US | Título | Origem |
|---|---|---|
| US-35 | Streak e meta diária | Master v2.1 (nova) |

---

## 3. Comportamento Detalhado

### 3.1 Registro de atividade (`study_activity`)
- Toda ação de estudo gera registro diário (upsert por user+dia, UTC): minutos de estudo, materiais concluídos, questões respondidas.
- Ações que contam como atividade: abrir/ler material (tempo de sessão ≥ 1 min), concluir material, responder questão, revisar flashcard, fazer simulado, fazer trilha.
- Tempo de estudo: medido por sessão ativa (heartbeat a cada 60s enquanto a página está em foco; pausa quando a aba perde foco por > 5 min).

### 3.2 Streak (dias consecutivos)
- **Dia de estudo ativo** = qualquer atividade registrada no dia (minutos > 0).
- Streak atual = dias consecutivos contando de ontem para trás, considerando o dia de hoje (se hoje ainda não tem atividade, o streak de ontem permanece exibido até o fim do dia — decisão D-E1).
- Exibição: "🔥 12 dias seguidos" na home; calendário mensal de atividade (dias verdes).
- Reset de streak: um dia sem atividade quebra a sequência.

### 3.3 Meta diária
- Padrão: **30 min/dia** (configurável pelo aluno: 15/30/45/60/90).
- Barra de progresso do dia (minutos hoje ÷ meta) na home e no app.
- Ao bater a meta: celebração in-app (mensagem + confete leve — sem gamificação pesada, D-E2).
- Streak é compatível com meta: dia ativo é ≥ 1 min; bater a meta é opcional.

### 3.4 Relação com outras áreas
- Relatório semanal de estudos (US-36, `SPEC-notificacoes.md`) usa os mesmos dados de `study_activity`.
- Exportação LGPD (US-24) inclui o histórico de atividade.

---

## 4. Regras Específicas do Domínio

| # | Regra |
|---|---|
| E1 | Dia de estudo = atividade com minutos > 0 (UTC). |
| E2 | Streak conta dias consecutivos retroativos; hoje sem atividade não quebra até o fim do dia. |
| E3 | Meta diária padrão 30 min, configurável pelo aluno (15/30/45/60/90). |
| E4 | Tempo conta apenas com aba em foco (heartbeat 60s; pausa > 5 min de perda de foco). |

---

## 5. Exemplos End-to-End

### E2E-E1 — Streak cresce e quebra
**Given** aluno estudou 20/08 (30 min) e 21/08 (10 min)
**When** o dia 22/08 termina sem atividade
**Then** streak = 2 no dia 21/08; em 23/08 o streak zera (último dia ativo foi 21/08)

### E2E-E2 — Meta parcial
**Given** meta de 30 min, aluno estudou 12 min hoje
**When** abre a home
**Then** barra mostra 40%; streak do dia mantido (ativo mesmo sem bater a meta)

---

## 6. Decisões do Domínio

| Data | Decisão |
|---|---|
| 2026-08-12 | D-E1: hoje sem atividade não quebra o streak até o fim do dia |
| 2026-08-12 | D-E2: celebração leve apenas ao bater a meta (sem pontos/rankings) |

---

## 7. Histórico

| Versão | Data | Mudança |
|---|---|---|
| 0.1 | 2026-08-12 | Versão inicial para aprovação |
| 0.1 | 2026-08-12 | **APROVADA** — revisão de aplicabilidade concluída |
