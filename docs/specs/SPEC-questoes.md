# SPEC-QUESTOES — Questões e Simulados Cronometrados

- **Versão**: 0.2
- **Data**: 2026-08-12
- **Status**: [APROVADO — 2026-08-12]
- **Domínio master**: US-08, US-13, US-27, US-37, US-38, US-39 (SPEC master v2.1 §4)

---

## 1. Objetivo

Definir o comportamento de blocos de questões (gabarito imediato), simulados cronometrados (prova com correção ao final), **banco de erros**, **questões favoritas** e **modo prova vs. modo estudo**.

---

## 2. User Stories Cobertas

| US | Título | Origem |
|---|---|---|
| US-08 | Admin cria material do tipo Questões | Master v1.0 |
| US-13 | Aluno responde questões | Master v1.0 |
| US-27 | Simulados cronometrados | Master v2.0 |
| US-37 | Banco de erros | Master v2.1 |
| US-38 | Questões favoritas | Master v2.1 |
| US-39 | Modo prova vs. modo estudo | Master v2.1 |

---

## 3. Comportamento Detalhado

### 3.1 Material de Questões (US-08)
- Cada questão: enunciado (obrigatório), 4–5 alternativas (A–E), gabarito (exatamente 1 correta), comentário opcional (rich text sanitizado).
- Sem limite de questões por bloco; bloco pertence a um módulo (estrutura comum da `SPEC-conteudo.md`).
- Alternativas embaralhadas por aluno? **Decisão D-Q1**: não no MVP deste domínio (ordem fixa exibida).

### 3.2 Resposta e feedback (US-13)
- Aluno seleciona 1 alternativa e envia → feedback imediato: correta/errada + gabarito + comentário (se houver).
- Tentativa salva: questão, alternativa escolhida, acerto (boolean), timestamp.
- Taxa de acerto do bloco exibida ao aluno (ex.: "7/10 acertos").
- Sem limite de tentativas; refazer atualiza histórico (tentativas cumulativas).

### 3.3 Simulados (US-27)
- **Admin monta simulado**: título, instruções (opcional), duração (minutos), conjunto de questões (seleção manual por módulo/curso; sem sorteio automático no MVP — D-Q2).
- Simulado não fica atrelado a módulo (é coleção independente de questões).
- **Aluno executa**:
  - Cronômetro regressivo visível; entrega automática ao estourar (respostas salvas até o momento).
  - Navegação entre questões; marcação de "revisar" (flag local); sem gabarito durante a prova.
  - Correção ao final: nota (acertos/total), desempenho por disciplina (via vínculo questão→módulo→curso), comentários visíveis após entrega.
- **Histórico**: tentativas de simulado salvas (data, nota, respostas); aluno vê lista de tentativas anteriores com nota; pode refazer (nova tentativa, não sobrescreve anterior).

### 3.4 Banco de erros (US-37)
- Aluno tem área "Meus erros": questões com última tentativa errada (de blocos ou simulados), agrupáveis por disciplina/curso.
- Ações: responder de novo (nova tentativa registrada), marcar como favorita, transformar em flashcard (integração `SPEC-flashcards.md`).
- Questão sai do banco de erros quando o aluno acerta 2x seguidas (decisão D-Q3).
- Estatística: total de erros, taxa de acerto ao re-responder.

### 3.5 Questões favoritas (US-38)
- Marcar/desmarcar questão como favorita (de blocos ou simulados, inclusive no gabarito comentado).
- Área "Favoritas": lista por disciplina, responder de novo, revisar só as favoritas.
- Favoritar não altera banco de erros nem tentativas.

### 3.6 Modo prova vs. modo estudo (US-39)
- **Modo estudo** (padrão): feedback imediato (3.2) — bloco de questões.
- **Modo prova**: aluno inicia sessão em bloco de questões sem gabarito, com navegação entre questões do bloco e opção "revisar"; ao finalizar (ou entregar), correção em lote com comentários.
- Modo prova não cria simulado persistente (não entra no histórico de simulados) — é execução ad-hoc do bloco; tentativas individuais ainda são registradas em `attempts`.
- Toggle modo prova/estudo disponível na abertura do material de questões.

---

## 4. Regras Específicas do Domínio

| # | Regra |
|---|---|
| Q1 | Gabarito só é exibido após a resposta (blocos) ou após entrega (simulados). |
| Q2 | Entrega automática ao estourar o tempo — respostas parciais salvas. |
| Q3 | Tentativas de simulado são cumulativas (histórico imutável por tentativa). |
| Q4 | Simulado é **entidade própria** (tabela `simulados`), não tipo de material; gating segue o `curso_id` vinculado (R1–R12). Decisão registrada no modelo de dados (2026-08-12). |
| Q5 | Simulado só inclui questões de materiais publicados. |
| Q6 | Banco de erros: questão sai ao acertar 2x seguidas (D-Q3). |
| Q7 | Favoritas são independentes de tentativas e do banco de erros. |
| Q8 | Modo prova não cria simulado persistente; tentativas individuais são registradas. |

---

## 5. Exemplos End-to-End

### E2E-Q1 — Feedback imediato
**Given** bloco com questão cujo gabarito é B
**When** aluno responde C
**Then** feedback "incorreta, gabarito B" + comentário exibido; tentativa salva como erro

### E2E-Q2 — Entrega automática
**Given** simulado de 10 min, aluno na questão 8
**When** o cronômetro zera
**Then** o simulado é entregue automaticamente com as 8 respostas; questões 9–10 contam como não respondidas (erro)

### E2E-Q3 — Histórico cumulativo
**Given** aluno fez o simulado 2 vezes (5/10 e 7/10)
**When** o aluno abre o histórico
**Then** as 2 tentativas aparecem com data e nota, sem sobrescrita

### E2E-Q4 — Banco de erros
**Given** questão respondida errada em bloco
**When** aluno acerta a mesma questão 2x seguidas depois
**Then** a questão sai do banco de erros

### E2E-Q5 — Modo prova sem gabarito
**Given** bloco com 5 questões
**When** aluno inicia modo prova e responde 3, entregando
**Then** as 3 são corrigidas em lote com comentários; as 2 não respondidas contam como erradas (sem gabarito antecipado)

---

## 6. Decisões do Domínio

| Data | Decisão |
|---|---|
| 2026-08-12 | D-Q1: ordem fixa de alternativas (sem embaralhamento) |
| 2026-08-12 | D-Q2: seleção manual de questões no simulado (sem sorteio automático) |
| 2026-08-12 | D-Q3: saída do banco de erros após 2 acertos consecutivos |

---

## 7. Histórico

| Versão | Data | Mudança |
|---|---|---|
| 0.1 | 2026-08-12 | Versão inicial para aprovação |
| 0.2 | 2026-08-12 | Banco de erros (US-37), favoritas (US-38), modo prova/estudo (US-39) |
| 0.2 | 2026-08-12 | **APROVADA** — Q4 alinhada ao modelo de dados; revisão concluída |
