# Modelo de Dados Consolidado (Design de Banco)

- **Versão**: 0.1
- **Data**: 2026-08-12
- **Status**: [APROVADO — 2026-08-12]
- **Objetivo**: consolidar o schema das 13 specs de domínio em um único modelo, fechar decisões em aberto (Q4) e servir de base para o schema Prisma no S1.

> Convenções: nomes de tabelas em inglês, snake_case (AGENTS.md §6). IDs: UUID v7 (ordenação temporal). Timestamps UTC. Chaves estrangeiras com `onDelete` conforme indicado.

---

## 1. Diagrama de Entidades (visão geral)

```
users ─┬─< sessions
       ├─< user_progress >─ materials
       ├─< notes >─ materials
       ├─< attempts >─ questions
       ├─< favorites >─ questions
       ├─< flashcards
       ├─< comments >─ materials
       ├─< notifications
       ├─< entitlements >─ products
       ├─< purchases
       ├─< user_trilhas >─ editals
       ├─< user_concursos >─ concursos
       └─< study_activity (streak)

courses ─< modules ─< materials ─< questions
materials ─< video (via Bunny) ─────────────┐
products ─< purchases/entitlements           │
simulados ─< simulado_questions >─ questions │
editals ─< edital_disciplines                │
editals ─< material_edital >─ materials      │
certificates ─> users, courses               │
```

---

## 2. Tabelas por Domínio

### 2.1 Auth e Usuários (`SPEC-auth.md`)

**users**
| coluna | tipo | notas |
|---|---|---|
| id | uuid pk | |
| nome | text | obrigatório, 2–120 chars |
| email | text unique | |
| senha_hash | text | argon2id |
| role | enum `aluno`/`admin` | default `aluno` |
| verificado_em | timestamptz null | US-22 |
| bloqueado | boolean default false | US-20 |
| consentimento_lgpd_em | timestamptz | obrigatório |
| criado_em / atualizado_em | timestamptz | |

**verification_tokens** — token hash, user_id, expira_em (24h), usado_em (nullable), 1 uso (A2).

### 2.2 Conteúdo (`SPEC-conteudo.md`)

**courses**
| coluna | tipo | notas |
|---|---|---|
| id | uuid pk | |
| nome | text | |
| descricao | text null | |
| imagem_url | text null | |
| slug | text unique | imutável após 1º material publicado (C1) |
| incluido_assinatura | boolean default false | |
| criado_em / atualizado_em | timestamptz | |

**modules** — id, course_id fk (cascade), nome, ordem int, unique(course_id, ordem).

**materials**
| coluna | tipo | notas |
|---|---|---|
| id | uuid pk | |
| module_id | fk (cascade) | |
| titulo | text | |
| tipo | enum `pdf`/`texto`/`video`/`questoes`/`resumo` | `resumo` = 5º tipo (P2) |
| ordem | int | |
| status | enum `rascunho`/`publicado` | |
| publicado_em | timestamptz null | |
| amostra | boolean default false | máx. 1 por curso (R4/C2) |
| conteudo_html | text null | tipo `texto`/`resumo` |
| arquivo_key | text null | tipo `pdf` — chave no R2 |
| video_provider_id | text null | tipo `video` — Bunny |
| video_status | enum `processando`/`pronto`/`erro` null | R11 |
| video_erro | text null | |
| criado_em / atualizado_em | timestamptz | |

**Q4 (decisão)**: **simulado é entidade própria** (`simulados`), NÃO um `materials.tipo`. Razão: simulados agregam questões de vários módulos e têm ciclo de vida próprio (tentativas/histórico). Gating do simulado segue o vínculo `curso_id` (R1–R12).

**simulados** — id, curso_id fk, titulo, instrucoes text null, duracao_minutos int, status enum rascunho/publicado, publicado_em.

**simulado_questions** — simulado_id fk (cascade), question_id fk, ordem int, unique(simulado_id, question_id).

### 2.3 Questões (`SPEC-questoes.md`)

**questions**
| coluna | tipo | notas |
|---|---|---|
| id | uuid pk | |
| material_id | fk (cascade) | bloco de questões |
| enunciado | text | |
| alternativas | jsonb | array [{letra, texto}] — ordem fixa (D-Q1) |
| gabarito | text | letra correta |
| comentario_html | text null | sanitizado |
| ordem | int | |

**attempts** — id, user_id fk, question_id fk, alternativa_escolhida, acerto boolean, criado_em. (base do banco de erros e do relatório semanal)

**favorites** — user_id fk, question_id fk, criado_em, pk(user_id, question_id). (questões favoritas)

**simulado_attempts** — id, user_id fk, simulado_id fk, iniciado_em, entregue_em null (entrega automática preenche), respostas jsonb (questão→alternativa), nota numeric null, status enum `em_andamento`/`entregue`.

### 2.4 Vídeo (`SPEC-video.md`)

Vídeo vive no Bunny Stream (V1). `materials.video_provider_id` + `video_status` cobrem o ciclo. Nenhuma tabela extra. Posição de reprodução em `user_progress.posicao_segundos`.

### 2.5 Área do aluno (`SPEC-aluno.md`)

**user_progress**
| coluna | tipo | notas |
|---|---|---|
| id | uuid pk | |
| user_id | fk (cascade) | |
| material_id | fk (cascade) | |
| concluido | boolean default false | |
| concluido_em | timestamptz null | |
| posicao_segundos | int default 0 | vídeo (V4) |
| atualizado_em | timestamptz | conflito offline: last-write-wins (AL5) |
| | | pk(user_id, material_id) |

**notes** — id, user_id fk (cascade), material_id fk (cascade), conteudo text (≤10.000), criado_em, atualizado_em.

**certificates** — id, user_id fk, course_id fk, codigo text unique (UUID curto), gerado_em, unique(user_id, course_id). (US-29)

### 2.6 Pagamentos (`SPEC-pagamentos.md`)

**products**
| coluna | tipo | notas |
|---|---|---|
| id | uuid pk | |
| tipo | enum `assinatura`/`venda_unica` | |
| nome | text | |
| preco_mensal_cents | int null | assinatura |
| preco_anual_cents | int null | assinatura — configurável, default 10x mensal (2 meses grátis) |
| curso_id | fk null | venda_unica (1:1 curso) |
| status | enum `ativo`/`inativo` | |

> **D-P1 revogada (2026-08-12)**: passa a existir **1 assinatura com 2 períodos** (mensal e anual), não 2 produtos. Preço anual configurável pelo admin (default: 2 meses grátis).

**purchases** — id, user_id fk, product_id fk, mp_payment_id unique, tipo enum `checkout`/`trial`, status enum `pendente`/`aprovado`/`recusado`/`reembolsado`, valor_cents, criado_em, atualizado_em.

**entitlements**
| coluna | tipo | notas |
|---|---|---|
| id | uuid pk | |
| user_id | fk | |
| product_id | fk | |
| origem | enum `pagamento`/`trial`/`admin` | |
| acesso_ate | timestamptz null | null = permanente (R3) |
| criado_em / atualizado_em | timestamptz | |

**Trial (P0-1)**: `entitlements.origem='trial'` + `acesso_ate = criado_em + 7 dias`. Sem cartão. 1 trial por usuário (unique parcial via check: máx. 1 entitlement trial ativo por user — implementar como índice parcial ou campo `trial_usado` em users). **Decisão de schema**: campo `users.trial_usado boolean default false` (simples, robusto).

### 2.7 Trilhas e Editais (`SPEC-trilhas.md`, `SPEC-editais.md`)

**editals** — id, nome, banca, data_prova date null, status enum rascunho/publicado, versao int default 1, publicada_em.

**edital_disciplines** — id, edital_id fk (cascade), nome, peso int, unique(edital_id, nome).

**material_edital** — material_id fk, edital_id fk, disciplina_id fk, pk(material_id, edital_id). (0..1 disciplina por material — T1)

**user_trilhas** — user_id fk, edital_id fk, ativo boolean, criado_em, unique(user_id, edital_id). (T4: múltiplas trilhas ativas permitidas — validar em serviço)

**concursos** (rastreamento — `SPEC-editais.md`)
| coluna | tipo | notas |
|---|---|---|
| id | uuid pk | |
| nome | text | ex.: "TRT-24 Técnico" |
| orgao | text | |
| banca | text | |
| origem | enum `manual`/`scraping` | P0-3 |
| fonte_url | text null | |
| inscricao_inicio / inscricao_fim | date null | |
| data_prova | date null | |
| status | enum `aberto`/`inscricoes`/`em_breve`/`encerrado` | derivado das datas |
| ultimo_sync_em | timestamptz null | scraping |

**user_concursos** — user_id fk, concurso_id fk, criado_em, pk(user_id, concurso_id).

### 2.8 Flashcards (`SPEC-flashcards.md`)

**flashcards** — id, user_id fk (cascade), material_id fk null, question_id fk null (origem sugestão), pergunta text, resposta text, nivel int 0–5, proxima_revisao date, revisoes int, criado_em, atualizado_em.

### 2.9 Comunidade (`SPEC-comunidade.md`)

**comments** — id, material_id fk (cascade), user_id fk, conteudo text (≤2.000), respondido boolean default false, resposta_admin text null, criado_em, atualizado_em.

### 2.10 Notificações e Engajamento (`SPEC-notificacoes.md`, `SPEC-engajamento.md`)

**notifications** — id, user_id fk, tipo enum, titulo, corpo, lida boolean default false, notification_key text unique (idempotência N2), criado_em.

**study_activity** (streak e relatório semanal)
| coluna | tipo | notas |
|---|---|---|
| id | uuid pk | |
| user_id | fk | |
| dia | date | UTC |
| minutos | int default 0 | acumulado |
| materiais_concluidos | int default 0 | |
| questoes_respondidas | int default 0 | |
| pk(user_id, dia) | | upsert diário |

**users.meta_diaria_minutos** int default 30 — meta diária configurável (US-35).

---

## 3. Índices e Integridade (essenciais)

| Tabela | Índice | Motivo |
|---|---|---|
| materials | (module_id, ordem) | R6 |
| attempts | (user_id, question_id, criado_em desc) | banco de erros/histórico |
| notifications | (user_id, criado_em desc) | central in-app |
| entitlements | (user_id, product_id) | gating R1 |
| study_activity | (user_id, dia) | streak/relatório |
| editals | (status, publicada_em) | listagem de trilhas |

- **users.trial_usado**: check constraint de 1 trial por usuário.
- **materials.amostra**: validado em serviço (máx. 1 por curso — C2), não em constraint.

---

## 4. Decisões Fechadas neste Documento

| # | Decisão | Data |
|---|---|---|
| D2 | Schema consolidado (este documento) como fonte para o Prisma | 2026-08-12 |
| Q4 | Simulado = entidade própria (`simulados`), não tipo de material; gating por `curso_id` | 2026-08-12 |
| D-P1 | Revogada: 1 assinatura com 2 períodos (mensal/anual), preço anual configurável | 2026-08-12 |
| P0-1 | Trial 7 dias sem cartão; `users.trial_usado` | 2026-08-12 |
| P0-3 | Concursos: origem manual + scraping automático | 2026-08-12 |

## 5. Histórico

| Versão | Data | Mudança |
|---|---|---|
| 0.1 | 2026-08-12 | Versão inicial — consolida 13 specs + features P1/P2 |
| 0.1 | 2026-08-12 | **APROVADO** — revisão de aplicabilidade concluída |
