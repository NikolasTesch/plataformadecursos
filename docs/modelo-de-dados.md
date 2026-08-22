# Modelo de Dados Consolidado (Design de Banco)

- **Versão**: 0.8
- **Data**: 2026-08-19
- **Status**: [APROVADO — 2026-08-19; user_trilhas.plano_snapshot + versao_ativacao (S7.1, correção da v0.7)]
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
       ├─< course_reviews >─ courses
       ├─< notifications
       ├─< entitlements >─ products
       ├─< purchases
       ├─< user_trilhas >─ editals
       ├─< user_concursos >─ concursos
       └─< study_activity (streak)

courses ─< modules ─< materials ─< questions
materials ─< video (via Bunny) ─────────────┐
products ─< purchases/entitlements           │
products ─< coupons                           │
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

> **Contrato mínimo S6 — APROVADO (2026-08-19)**: o modelo S6 v0.6 foi aprovado explicitamente pelo usuário, incluindo os refinamentos de retry, constraints SQL, cascades e preflight.

**products**
| coluna | tipo | notas |
|---|---|---|
| id | uuid pk | |
| tipo | enum `assinatura`/`venda_unica` | |
| nome | text | |
| preco_mensal_cents | int null | assinatura |
| preco_anual_cents | int null | assinatura — configurável, default 10x mensal (2 meses grátis) |
| preco_unico_cents | int null | venda_unica |
| curso_id | fk null unique | venda_unica; unicidade 1:1 por curso |
| status | enum `ativo`/`inativo` | |

> **D-P1 revogada (2026-08-12)**: passa a existir **1 assinatura com 2 períodos** (mensal e anual), não 2 produtos. Preço anual configurável pelo admin (default: 2 meses grátis).

**purchases**
| coluna | tipo | notas |
|---|---|---|
| id | uuid pk | referência externa da intenção, enviada ao provedor correspondente |
| user_id | fk (cascade) | aluno comprador |
| product_id | fk | |
| entitlement_id | fk null | vínculo compra → entitlement concedido/atualizado |
| subscription_id | fk null | preenchido para compra de assinatura |
| mp_payment_id | text null unique | recurso externo de pagamento: venda única Checkout Pro ou ciclo recorrente vinculado a `subscription_id`; não é chave de idempotência de evento sozinho |
| tipo | enum `checkout`/`trial` | |
| periodicidade | enum `mensal`/`anual` null | snapshot do período desta compra |
| status | enum `pendente`/`aprovado`/`recusado`/`reembolsado` | |
| valor_cents | int | valor efetivamente processado |
| coupon_id | fk null | registra o uso do cupom — US-46 |
| criado_em / atualizado_em | timestamptz | |

> **Checks de persistência (S6.1 implementados)**: assinatura exige `periodicidade`; compra `aprovado` exige `entitlement_id`; venda única `checkout` aprovada exige unicidade parcial por `(user_id, product_id)`. Esses checks e o índice parcial são constraints SQL da migration `20260819210000_s6_pagamentos_invariantes` (não representáveis no Prisma declarativo) e já estão aplicados.

**subscriptions**
| coluna | tipo | notas |
|---|---|---|
| id | uuid pk | |
| user_id | fk (cascade) | aluno titular |
| product_id | fk | assinatura comercial |
| periodicidade | enum `mensal`/`anual` | período vigente |
| mp_subscription_id | text unique | identificador da assinatura Subscriptions/preapproval no MP |
| status | enum `ativa`/`cancelada`/`pausada`/`expirada` | cancelada não revoga o período pago |
| acesso_ate | timestamptz | data efetiva de acesso |
| cancelada_em | timestamptz null | |
| criado_em / atualizado_em | timestamptz | |

**webhook_events**
| coluna | tipo | notas |
|---|---|---|
| id | uuid pk | |
| provedor | enum `mercado_pago` | |
| recurso_id | text | `payment_id` para pagamento/ciclo ou `subscription_id` para assinatura |
| tipo_evento | text | fluxos distintos: `payment.approved`, `refund`, `subscription.updated`, `subscription.cancelled` |
| status | enum `recebido`/`processado`/`falhou` | |
| payload | jsonb | corpo recebido para reconciliação |
| recebido_em | timestamptz | |
| processado_em | timestamptz null | |
| tentativas | int default 0 | tentativa inicial + até 3 reprocessamentos |
| ultimo_erro | text null | erro sanitizado e limitado a 2.000 chars |
| | | unique(provedor, recurso_id, tipo_evento) — idempotência |

> `recebido` e `falhou` são reprocessáveis; `processado` é terminal. O máximo é 1 tentativa inicial + até 3 reprocessamentos. Não há reconciliação financeira automática.

**coupons** (US-45/46 — cupons de desconto)
| coluna | tipo | notas |
|---|---|---|
| id | uuid pk | |
| codigo | text unique | case-insensitive, ex.: "CONCURSO30" |
| tipo | enum `percentual`/`fixo` | |
| valor | numeric | % (1–100) ou valor em R$ (centavos) |
| escopo | enum `assinatura`/`venda_unica` | ou produto específico via product_id null |
| product_id | fk null | null = vale para qualquer produto do escopo |
| valido_de / valido_ate | timestamptz | |
| limite_uso | int null | null = ilimitado |
| usos | int default 0 | incrementado atomicamente no uso |
| ativo | boolean default true | |
| criado_em / atualizado_em | timestamptz | |

> Cupom: desconto apenas na 1ª cobrança (D-K1); 1 cupom por compra, não acumula com trial (D-K2).

**entitlements**
| coluna | tipo | notas |
|---|---|---|
| id | uuid pk | |
| user_id | fk | |
| product_id | fk | |
| subscription_id | fk null unique | assinatura que sustenta o acesso, quando aplicável |
| origem | enum `pagamento`/`trial`/`admin` | |
| acesso_ate | timestamptz null | null = permanente (R3); entitlement vinculado a subscription exige valor não nulo |
| criado_em / atualizado_em | timestamptz | |

**Trial (P0-1)**: `entitlements.origem='trial'` + `acesso_ate = criado_em + 7 dias`. Sem cartão. 1 trial por usuário (unique parcial via check: máx. 1 entitlement trial ativo por user — implementar como índice parcial ou campo `trial_usado` em users). **Decisão de schema**: campo `users.trial_usado boolean default false` (simples, robusto).

### 2.7 Trilhas e Editais (`SPEC-trilhas.md`, `SPEC-editais.md`)

**editals** — id, nome, banca, data_prova date null, status enum rascunho/publicado, versao int default 1, publicada_em.

**edital_disciplines** — id, edital_id fk (cascade), nome, peso int, unique(edital_id, nome).

**material_edital** — material_id fk, edital_id fk, disciplina_id fk, pk(material_id, edital_id). (0..1 disciplina por material — T1)

**user_trilhas** — user_id fk, edital_id fk, versao_ativacao int (cópia **explícita** de `editals.versao` no momento da ativação — **sem default**; corrigida por migration adicional se faltar; T3/E2E-T2), plano_snapshot jsonb (snapshot imutável da composição/ordem da trilha no instante da ativação: `{ disciplinas: [{id, nome, peso}], materiais: [{id, ordem}] }`; a `ordem` de cada material é copiada de `materials.ordem` — **não** existe `material_edital.ordem`), ativo boolean, criado_em, unique(user_id, edital_id). (T4: múltiplas trilhas ativas permitidas — validar em serviço)

> **Versionamento (T3/E2E-T2)**: `versao_ativacao` isolada **não** preserva v1 — o plano é lido do `plano_snapshot`, que congela disciplinas (id/nome/peso) e materiais (id/ordem) no instante da ativação. Ao republicar o edital (nova `editals.versao`), alunos com trilha ativa mantêm o snapshot; novos alunos geram snapshot da nova versão. `versao_ativacao` é copiada explicitamente (sem default) e corrigida por migration adicional se necessário; a migration seguinte aplica os checks/constraints essenciais já recomendados **apenas se** fizerem parte do contrato planejado do S7.1. **Limite**: o snapshot preserva composição e ordem, **não** versiona o conteúdo dos materiais (PDF/texto/vídeo permanecem nas tabelas de conteúdo atuais). Sem tabelas versionadas, scraping, rollback ou auditoria admin.

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

**course_reviews** (US-47/48 — avaliações de curso)
| coluna | tipo | notas |
|---|---|---|
| id | uuid pk | |
| course_id | fk (cascade) | |
| user_id | fk (cascade) | |
| nota | int 1–5 | obrigatória |
| comentario | text null | ≤500 caracteres, sanitizado |
| status | enum `pendente`/`aprovado`/`oculta` | default `pendente` |
| criado_em / atualizado_em | timestamptz | |
| | | unique(course_id, user_id) — editar substitui (D-R1) |

> Nota média pública = média das avaliações `aprovado` (D-R2).

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
| purchases | (user_id, status, criado_em desc) | histórico e reconciliação |
| products | unique(curso_id) | venda única 1:1 por curso |
| purchases | unique(user_id, product_id) WHERE tipo = `checkout` AND status = `aprovado` | uma venda única aprovada por aluno/curso |
| purchases | (entitlement_id) | rastreio compra → acesso |
| purchases | (subscription_id) | histórico de cobranças da assinatura |
| subscriptions | (user_id, status) | assinatura atual do aluno |
| webhook_events | unique(provedor, recurso_id, tipo_evento) | idempotência por recurso + evento |
| webhook_events | (status, recebido_em) | retries e reconciliação |
| entitlements | (user_id, product_id) | gating R1 |
| entitlements | (subscription_id) | localizar acesso da assinatura |
| study_activity | (user_id, dia) | streak/relatório |
| editals | (status, publicada_em) | listagem de trilhas |
| coupons | (valido_ate, ativo) | busca de cupons válidos no checkout |
| course_reviews | (course_id, status) | nota média e listagem na sales page |

- **users.trial_usado**: check constraint de 1 trial por usuário.
- **materials.amostra**: validado em serviço (máx. 1 por curso — C2), não em constraint.
- **users → purchases/subscriptions**: `onDelete: Cascade`, conforme contrato de persistência S6.
- **webhook_events.tentativas**: limite de retry controlado no processamento; nenhuma reconciliação financeira automática.

---

## 4. Decisões Fechadas neste Documento

| # | Decisão | Data |
|---|---|---|
| D2 | Schema consolidado (este documento) como fonte para o Prisma | 2026-08-12 |
| Q4 | Simulado = entidade própria (`simulados`), não tipo de material; gating por `curso_id` | 2026-08-12 |
| D-P1 | Revogada: 1 assinatura com 2 períodos (mensal/anual), preço anual configurável | 2026-08-12 |
| P0-1 | Trial 7 dias sem cartão; `users.trial_usado` | 2026-08-12 |
| P0-3 | Concursos: origem manual + scraping automático | 2026-08-12 |
| D-K1 | Cupom desconta somente a 1ª cobrança (renovações a preço cheio) | 2026-08-13 |
| D-K2 | 1 cupom por compra; não acumula com trial | 2026-08-13 |
| D-R1 | Avaliação exige entitlement real (amostra não conta); unique(course_id, user_id) | 2026-08-13 |
| D-R2 | Nota média considera apenas avaliações aprovadas | 2026-08-13 |
| S6.1 — IMPLEMENTADO | Compra pendente como intenção, preço único e curso 1:1, período por compra, assinatura do aluno, webhook idempotente por recurso + evento e vínculo compra → entitlement; checks/índice parcial/cascade aplicados pela migration `20260819210000_s6_pagamentos_invariantes` | 2026-08-19 |
| S6.2 — PENDENTE | Subscriptions/preapproval para recorrência e Checkout Pro para venda única; IDs e eventos de pagamento/assinatura separados | 2026-08-19 |
| S6.3 — PENDENTE | Pix somente na venda única; assinatura somente com métodos suportados pela preapproval; cancelamento exclusivamente via suporte; rotas/UI | 2026-08-19 |

## 5. Histórico

| Versão | Data | Mudança |
|---|---|---|
| 0.1 | 2026-08-12 | Versão inicial — consolida 13 specs + features P1/P2 |
| 0.1 | 2026-08-12 | **APROVADO** — revisão de aplicabilidade concluída |
| 0.2 | 2026-08-13 | **Novas entidades aprovadas**: `coupons` + `purchases.coupon_id` (US-45/46, D-K1/D-K2) e `course_reviews` (US-47/48, D-R1/D-R2) |
| 0.3 | 2026-08-19 | **PENDENTE — S6**: contrato mínimo para `subscriptions`, `webhook_events`, compra pendente como intenção, preço único, período por compra e vínculo `purchases.entitlement_id`; cancelamento/refund de assinatura preserva acesso até `acesso_ate` |
| 0.3 | 2026-08-19 | **APROVADO — S6**: contrato mínimo da revisão 0.5 aprovado explicitamente pelo usuário. |
| 0.4 | 2026-08-19 | **PENDENTE**: aprovação v0.5 supersedida pela separação documental entre Subscriptions/preapproval e Checkout Pro. |
| 0.4 | 2026-08-19 | **CORRIGIDO** — contrato S6 v0.6 permaneceu pendente e nunca recebeu aprovação explícita; a aprovação anterior foi somente da v0.5. |
| 0.5 | 2026-08-19 | **PENDENTE — AGUARDANDO APROVAÇÃO**: sincronizado com `SPEC-pagamentos.md` v0.7; Pix restrito à venda única, cancelamento via suporte e S6 bloqueado até aprovação. |
| 0.5 | 2026-08-19 | **APROVADO — aprovação explícita do usuário**: contrato S6 v0.7 confirmado; nenhum schema físico adicional foi alterado e o S6 permanece não implementado. |
| 0.6 | 2026-08-19 | **PENDENTE**: retries de webhook, invariantes de entitlement/compra, cascade de usuário, preflight e ausência de reconciliação financeira automática. |
| 0.7 | 2026-08-19 | **APROVADO** — revisão mínima S7.1: adicionado `user_trilhas.versao_ativacao int` (cópia de `editals.versao` na ativação) para cumprir T3/E2E-T2 (preservação de v1 quando o edital é republicado). Nenhuma outra tabela/campo alterado; migration futura no S7.1 antes de serviço/UI. |
| 0.8 | 2026-08-19 | **APROVADO** — **correção da v0.7**: `versao_ativacao` isolada não preserva v1 (editals não versiona histórico). Adicionado `user_trilhas.plano_snapshot JsonB` (disciplinas `{id,nome,peso}` + materiais `{id,ordem}` da `materials.ordem` — sem `material_edital.ordem`) criado junto com `versao_ativacao` na ativação e lido para a trilha; `versao_ativacao` copiada explicitamente (sem default). Snapshot preserva composição/ordem, não conteúdo. Sem tabelas versionadas, scraping, rollback/admin audit ou `material_edital.ordem`. |
