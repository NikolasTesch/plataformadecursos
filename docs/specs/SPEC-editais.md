# SPEC-EDITAIS — Rastreamento de Editais e Concursos

- **Versão**: 0.1
- **Data**: 2026-08-12
- **Status**: [APROVADO — 2026-08-12]
- **Domínio master**: US-42 (SPEC master v2.1 §4)

---

## 1. Objetivo

Definir o comportamento do rastreamento de editais e concursos: cadastro manual pelo admin + captura automática via scraping de fontes públicas, e o acompanhamento pelo aluno (seguir concurso, alertas de prazos).

---

## 2. User Stories Cobertas

| US | Título | Origem |
|---|---|---|
| US-42 | Rastreamento de editais | Master v2.1 (nova) |

> **Relação**: concursos rastreados podem virar **trilhas** (`SPEC-trilhas.md`) quando o admin monta o plano de estudo do edital — a trilha é a camada de conteúdo, o rastreamento é a camada de prazos.

---

## 3. Comportamento Detalhado

### 3.1 Modelo de concurso
- Campos: nome (ex.: "TRT-24 Técnico"), órgão, banca, datas-chave (inscrição início/fim, data da prova), status derivado (`em_breve`/`inscricoes`/`aberto`/`encerrado`), origem (`manual`/`scraping`), fonte_url.

### 3.2 Cadastro manual (admin)
- Admin cria/edita concurso com as datas-chave.
- Admin pode vincular um edital (trilha) existente ao concurso rastreado (1:1 opcional) — integração com `SPEC-trilhas.md`.

### 3.3 Captura automática (scraping)
- **Fontes** (configuráveis): Diário Oficial da União (publicações de concursos), sites de bancas (CESPE/Cebraspe, FCC, FGV, Vunesp) — fontes iniciais definidas em implementação (decisão D-ED1).
- **Cadência**: varredura diária (job agendado); cada fonte com parser próprio; falha de parser logada e não bloqueia outras fontes.
- **Pipeline**: captura bruta → normalização (nome/órgão/banca/datas) → **deduplicação** (hash de conteúdo + similaridade de nome/órgão) → proposta de novo concurso (status `proposto`).
- Admin **aprova/edita/descarta** concursos propostos pelo scraping (controle editorial — nunca publica direto).
- Concurso proposto: visível só no admin; após aprovação → visível aos alunos.
- Atualizações: scraping atualiza datas de concursos aprovados com diff registrado (campo `ultimo_sync_em` + log de alterações).

### 3.4 Aluno
- Lista de concursos (filtros: status, banca, busca; ordenação por data de inscrição/prova).
- Seguir/deixar de seguir concurso.
- **Alertas** (via `SPEC-notificacoes.md`, US-23):
  - Abertura de inscrições (T-3 dias).
  - Fim de inscrições (T-3 dias).
  - Prova próxima (T-7 dias).
  - Novo concurso do mesmo órgão/banca seguida.
- Sem alerta para concursos não seguidos.

### 3.5 Anti-spam e qualidade
- Concurso duplicado não é re-criado (deduplicação idempotente por hash).
- Datas inválidas (fim antes do início) rejeitadas com aviso.
- Max. 1 notificação por evento por aluno (chave idempotente N2).

---

## 4. Regras Específicas do Domínio

| # | Regra |
|---|---|
| ED1 | Scraping só cria concursos `proposto` — publicação exige aprovação do admin. |
| ED2 | Deduplicação por hash + similaridade; nunca duplica concurso existente. |
| ED3 | Alertas apenas para concursos seguidos; idempotente por evento+aluno. |
| ED4 | Falha de parser não interrompe as demais fontes (isolamento por fonte). |
| ED5 | Status derivado das datas, nunca editado manualmente. |

---

## 5. Exemplos End-to-End

### E2E-ED1 — Pipeline de scraping com aprovação
**Given** fonte DOU captura publicação de concurso "TRT-25"
**When** o job roda
**Then** concurso criado com status `proposto`; admin aprova → visível para alunos; sem aprovação, permanece interno

### E2E-ED2 — Deduplicação
**Given** concurso "TRT-24" já aprovado
**When** scraping captura o mesmo concurso em 2 dias seguidos
**Then** apenas 1 registro existe; segundo resultado vira atualização de datas (diff logado)

### E2E-ED3 — Alerta de inscrições
**Given** aluno segue concurso com inscrição abrindo em 3 dias
**When** job de notificações roda
**Then** aluno recebe 1 notificação in-app (e email se verificado); repetição do job não reenvia

---

## 6. Decisões do Domínio

| Data | Decisão |
|---|---|
| 2026-08-12 | D-ED1: fontes iniciais (DOU + sites de bancas) definidas na implementação; parsers isolados por fonte |
| 2026-08-12 | D-ED2 (P0-3): modelo híbrido manual + scraping com gate de aprovação do admin |

---

## 7. Histórico

| Versão | Data | Mudança |
|---|---|---|
| 0.1 | 2026-08-12 | Versão inicial para aprovação |
| 0.1 | 2026-08-12 | **APROVADA** — revisão de aplicabilidade concluída |
