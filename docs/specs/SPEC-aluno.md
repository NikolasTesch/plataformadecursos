# SPEC-ALUNO — Área do Aluno: Navegação, Gating, Progresso, Anotações, Certificados, PWA

- **Versão**: 0.2
- **Data**: 2026-08-12
- **Status**: [APROVADO — 2026-08-12]
- **Domínio master**: US-11, US-12, US-14, US-15, US-29, US-30, US-43 (SPEC master v2.1 §4)

---

## 1. Objetivo

Definir o comportamento da experiência do aluno: navegação, controle de acesso (gating), progresso, anotações, certificados, estudo offline (PWA) e **download em lote (ZIP) de cursos**.

---

## 2. User Stories Cobertas

| US | Título | Origem |
|---|---|---|
| US-11 | Aluno navega pela estrutura | Master v1.0 |
| US-12 | Aluno acessa material (Gating) | Master v1.0 |
| US-14 | Aluno controla progresso | Master v1.0 |
| US-15 | Aluno faz anotações | Master v1.0 |
| US-29 | Certificados de conclusão | Master v2.0 |
| US-30 | Acesso offline (PWA) | Master v2.0 |
| US-43 | Download em lote (ZIP) de curso | Master v2.1 |

---

## 3. Comportamento Detalhado

### 3.1 Navegação (US-11)
- Home: cursos com % de progresso; cursos sem material publicado ficam ocultos (R5).
- Página do curso: módulos ordenados (R6); materiais com status `disponivel` / `concluido` / `bloqueado` / `amostra` (badge).
- Material `bloqueado`: título + cadeado + CTA ("Assinar" ou "Comprar curso") conforme produto existente (R12).
- Breadcrumb curso → módulo → material; URL limpa (`/app/cursos/{slug}/materiais/{id}`).

### 3.2 Gating (US-12)
- Motor de acesso (avaliado no servidor a cada requisição — R7):
  1. `amostra` → liberado (R4).
  2. Curso `incluido_assinatura` + assinatura ativa (`acesso_ate >= now`, R2) → liberado.
  3. `venda_unica` do curso (permanente, R3) → liberado.
  4. Caso contrário → bloqueio.
- Bloqueio responde sem conteúdo (R12): nem PDF, nem texto, nem link de vídeo, nem gabarito.
- Cache de autorização curto (máx. 5 min) permitido, invalidado em despublicação/bloqueio de conta.

### 3.3 Progresso (US-14)
- Concluir manualmente (toggle) em materiais `pdf|texto|questoes`.
- Vídeo: conclusão automática ≥95% (V5) ou manual.
- Progresso do curso = concluídos ÷ publicados acessíveis (bloqueados não contam no denominador).
- Percentual exibido em home, página do curso e dentro do material.
- Desmarcar conclusão recalcula imediatamente.

### 3.4 Anotações (US-15)
- Por material: texto livre (máx. 10.000 caracteres), criada/atualizada/excluída pelo próprio aluno.
- Listagem "Minhas anotações" (por material, busca por texto).
- Privadas: nunca expostas a admin/outros alunos; incluídas na exportação LGPD (US-24).

### 3.5 Certificados (US-29)
- Elegível quando 100% dos materiais publicados acessíveis do curso estão concluídos.
- Gera PDF: nome do aluno, nome do curso, data de conclusão, código de verificação (UUID curto).
- Verificação pública: página `/verificar/{codigo}` exibe nome+curso+data (sem dados sensíveis).
- Certificado regenerável (mesmo código); download na página do curso.

### 3.6 PWA/Offline (US-30)
- Instalação (manifest + service worker); app shell cacheado.
- Download gerenciado de materiais: PDF (com autorização no momento do download), texto (cache), vídeo (via Bunny download API, com gating), flashcards e simulados baixados.
- Operações offline enfileiradas: conclusão de material, anotações, respostas de questões/simulado → sincronizadas ao reconectar (fila com retry e conflito last-write-wins por carimbo de tempo).
- **Gating offline**: download só ocorre com entitlement válido naquele momento; revogação não apaga downloads existentes (decisão D-A1) — conteúdo continua acessível offline até expirar sessão/assinatura (prazo máximo de 30 dias de cache).
- UI indica "disponível offline".

### 3.7 Download em lote (US-43)
- Botão "Baixar curso (ZIP)" na página do curso, disponível a alunos com entitlement do curso (ou assinatura ativa).
- Contém: PDFs (arquivos do R2), textos/resumos (HTML convertido em PDF ou markdown — D-A2), questões exportadas (JSON/CSV com enunciado e alternativas, **sem gabarito** — D-A3).
- Vídeos **não** entram no ZIP (peso/banda) — aluno usa o download individual do PWA (D-A4).
- Geração assíncrona: job cria ZIP e notifica quando pronto; URL assinada com validade de 24h.
- Gating avaliado na solicitação e novamente no download (R7/R12); ZIP expirado não é regenerado automaticamente.

---

## 4. Regras Específicas do Domínio

| # | Regra |
|---|---|
| AL1 | Progresso exclui materiais bloqueados do denominador. |
| AL2 | Certificado exige 100% de conclusão dos materiais acessíveis. |
| AL3 | Código de verificação do certificado: único, sem PII. |
| AL4 | Download offline exige gating aprovado no momento do download. |
| AL5 | Sincronização offline: last-write-wins com carimbo de tempo; fila persistente (IndexedDB). |
| AL6 | ZIP de curso: sem vídeos; questões sem gabarito; URL assinada 24h; gating na solicitação e no download. |

---

## 5. Exemplos End-to-End

### E2E-AL1 — Progresso ignora bloqueados
**Given** curso com 5 materiais publicados, 2 bloqueados (sem entitlement) e 3 acessíveis
**When** aluno conclui 1 dos acessíveis
**Then** progresso = 33% (1 de 3), não 20%

### E2E-AL2 — Certificado só com 100%
**Given** aluno com 8/9 materiais concluídos
**When** tenta baixar certificado
**Then** indisponível com aviso "conclua todos os materiais"; após concluir o 9º, o certificado fica disponível

### E2E-AL3 — Sincronização offline
**Given** aluno conclui 2 materiais offline
**When** reconecta à internet
**Then** a fila sincroniza e o progresso reflete as 2 conclusões

---

## 6. Decisões do Domínio

| Data | Decisão |
|---|---|
| 2026-08-12 | D-A1: revogação de acesso não apaga downloads existentes; cache offline limitado a 30 dias |
| 2026-08-12 | D-A2: textos/resumos no ZIP convertidos para PDF/markdown |
| 2026-08-12 | D-A3: ZIP não inclui gabarito de questões |
| 2026-08-12 | D-A4: vídeos fora do ZIP (download individual via PWA) |

---

## 7. Histórico

| Versão | Data | Mudança |
|---|---|---|
| 0.1 | 2026-08-12 | Versão inicial para aprovação |
| 0.2 | 2026-08-12 | Download em lote ZIP (US-43) |
| 0.2 | 2026-08-12 | **APROVADA** — revisão de aplicabilidade concluída |
