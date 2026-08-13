# SPEC-CONTEUDO — Cursos, Módulos, Materiais e Publicação

- **Versão**: 0.3
- **Data**: 2026-08-13
- **Status**: [APROVADO — 2026-08-12 · revisado 2026-08-13]
- **Domínio master**: US-03, US-04, US-05, US-06, US-09, US-21, US-40, US-41 (SPEC master v2.1 §4)

---

## 1. Objetivo

Definir o comportamento de estruturação de conteúdo (curso → módulo → material), tipos PDF/texto/**resumo**, publicação (rascunho/publicado), ordenação, busca e **impressão em PDF de materiais texto**.

> **Nota**: materiais `video` e `questoes` têm specs próprias (`SPEC-video.md`, `SPEC-questoes.md`). Este documento cobre a estrutura comum e os tipos `pdf`, `texto` e `resumo`.

---

## 2. User Stories Cobertas

| US | Título | Origem |
|---|---|---|
| US-03 | Admin gerencia cursos | Master v1.0 |
| US-04 | Admin gerencia módulos | Master v1.0 |
| US-05 | Admin cria material do tipo PDF | Master v1.0 |
| US-06 | Admin cria material do tipo Texto | Master v1.0 |
| US-09 | Admin publica/despublica materiais | Master v1.0 |
| US-21 | Busca de materiais | Master v2.0 |
| US-40 | Material do tipo Resumo (mapas mentais) | Master v2.1 |
| US-41 | Impressão de material texto em PDF | Master v2.1 |
| US-44 | Página pública de curso (sales page) | Master v2.5 |

---

## 3. Comportamento Detalhado

### 3.1 Cursos (US-03)
- Campos: nome (obrigatório), descrição (opcional), imagem (opcional, máx. 2MB), slug (único, gerado do nome, editável), `incluido_assinatura` (boolean, default false).
- Slug duplicado → erro; slug imutável após 1º material publicado.
- Excluir curso: confirmação com digitação do nome; cascata (módulos+materiais); irreversível.

### 3.2 Módulos (US-04)
- Campos: nome (obrigatório), `ordem` (inteiro, default último+1).
- Reordenação: mover para cima/baixo ajusta `ordem` de forma atômica.
- Excluir módulo: confirmação; cascata de materiais.

### 3.3 Material PDF (US-05)
- Upload: MIME `application/pdf` verificado (magic bytes, não só extensão), máx. 100MB.
- Nome do arquivo sanitizado; chave de storage `materials/{courseId}/{materialId}.pdf`.
- Acesso: URL assinada (validade 10 min) gerada no servidor a cada abertura autorizada (R7, R12).
- PDF renderizado em viewer embutido; download direto não exposto.

### 3.4 Material Texto (US-06)
- Editor rich text (headings, listas, negrito/itálico, links, imagens inline até 2MB, código).
- Conteúdo armazenado como HTML; renderização sanitizada (XSS): whitelist de tags/atributos; links com `rel="noopener"`.

### 3.5 Resumo / Mapa mental (US-40)
- 5º tipo de material: `resumo` — conteúdo estruturado para revisão rápida (tópicos, mapas mentais, tabelas).
- Editor rich text com modelo de "resumo" (blocos de tópicos + quadro sinóptico simples — sem renderização de árvore complexa no MVP, D-C5).
- Renderização com destaque visual (cards por tópico), mesmo gating/status das demais (estrutura comum).

### 3.6 Impressão em PDF de material texto (US-41)
- Material `texto` (e `resumo`) ganha ação "Imprimir/PDF": gera documento PDF (server-side) com conteúdo formatado.
- PDF gerado sob demanda, com gating aplicado (R12); sem cache persistente (arquivo descartável após download) — D-C6.
- PDFs impressos não entram no fluxo de `arquivo_key` (não são materiais PDF).

### 3.7 Estrutura comum a todos os materiais
- Campos: título (obrigatório), `tipo` (`pdf|texto|video|questoes`), `ordem`, `status` (`rascunho|publicado`), `publicado_em`, `amostra` (boolean, default false).
- R4 (master): máx. 1 material `amostra` por curso — validado no servidor (criar/alterar 2ª amostra → erro).
- Ordenação: `ordem` crescente dentro do módulo (R6).
- Rascunho: invisível para alunos (R5); visível no admin com badge.

### 3.6 Publicação (US-09)
- Transição rascunho→publicado registra `publicado_em = now` (UTC).
- Despublicar: efeito imediato (R5) — materiais publicados deixam de ser entregues na próxima requisição.
- Material `video` com status `erro` não pode ser publicado (R11).

### 3.7 Busca (US-21)
- Busca por título (ILIKE/trgm), conteúdo de texto/resumo e **conteúdo interno de PDFs** (decisão 2026-08-12).
- PDF: texto extraído no upload (parser PDF) e indexado; extração falha → material ainda é publicado, busca cobre só título (não bloqueia upload).
- Filtros: tipo, curso; ordenação: relevância, data.
- Resultados: apenas materiais acessíveis ao aluno + amostras (R1–R12 aplicadas na consulta).

### 3.8 Página pública de curso — sales page (US-44)
- Rota pública `/cursos/[slug]` (SSG/ISR — SPEC-landing R-L6), derivada do curso publicado; sem login para visitar.
- Exibe: nome, descrição, imagem, **grade resumida** (módulos com títulos de materiais e seus tipos — nunca conteúdo, R12), amostra do curso (R4) acessível para leitura, preço (venda única) ou badge "Incluído na assinatura".
- CTAs: "Começar trial grátis" (SPEC-pagamentos P0-1), "Assinar e acessar" (âncora para a página de preços), "Comprar curso" (checkout — exige login, D-P2).
- Avaliações aprovadas do curso (SPEC-comunidade §3.5): nota média + comentários visíveis publicamente.
- SEO: meta tags, Open Graph e dados estruturados `Course` (SPEC-landing R-L6).
- Rascunho e curso sem nenhum material publicado: página não existe (404) — nada de "curso vazio" público.

---

## 4. Regras Específicas do Domínio

| # | Regra |
|---|---|
| C1 | Slug único e imutável após publicação do 1º material. |
| C2 | Máx. 1 amostra por curso (R4), validado no servidor. |
| C3 | Upload PDF: validação por magic bytes; rejeitar arquivos >100MB com erro amigável. |
| C4 | HTML de materiais texto: sanitizado na renderização (whitelist). |
| C5 | URL assinada expira em 10 min e só é emitida após gating aprovado (R7/R12). |
| C6 | Exclusão em cascata (curso→módulos→materiais) sempre com confirmação explícita. |
| C7 | Tipo `resumo`: mesmo gating/status dos demais; renderização por cards de tópico. |
| C8 | PDF de impressão: gerado sob demanda com gating (R12), sem cache persistente. |
| C9 | Sales page (US-44): grade pública mostra apenas títulos/tipos — conteúdo nunca é enviado (R12), nem para visitante não autenticado. |
| C10 | Curso sem nenhum material publicado não tem sales page pública (404). |

---

## 5. Exemplos End-to-End

### E2E-C1 — Segunda amostra bloqueada
**Given** curso com material A marcado como amostra
**When** admin marca material B como amostra no mesmo curso
**Then** erro "já existe 1 material de amostra neste curso" e B permanece sem flag

### E2E-C2 — Despublicação imediata
**Given** material publicado visível ao aluno
**When** admin despublica o material
**Then** a próxima abertura do material retorna bloqueio (R12) e ele sai da listagem

### E2E-C3 — PDF sem permissão não recebe URL
**Given** aluno sem entitlement do curso
**When** o aluno requisita o PDF do material
**Then** nenhuma URL assinada é emitida (resposta de bloqueio, sem redirecionamento ao storage)

### E2E-C4 — Sales page não vaza conteúdo
**Given** curso publicado com materiais não-amostra e 1 amostra
**When** visitante não autenticado acessa `/cursos/[slug]`
**Then** vê grade com títulos/tipos, amostra legível e CTAs — e nenhuma requisição ao conteúdo dos demais materiais é possível (R12)

---

## 6. Decisões do Domínio

| Data | Decisão |
|---|---|
| 2026-08-12 | Busca indexa conteúdo interno de PDFs (texto extraído no upload); falha de extração não bloqueia publicação |
| 2026-08-12 | D-C5: resumo sem árvore complexa no MVP (blocos de tópicos + quadro sinóptico) |
| 2026-08-12 | D-C6: PDF de impressão gerado sob demanda, sem cache persistente |
| 2026-08-13 | Sales page por curso aprovada (L-A1/US-44): página pública derivada do curso, sem conteúdo (C9/C10) |

---

## 7. Histórico

| Versão | Data | Mudança |
|---|---|---|
| 0.1 | 2026-08-12 | Versão inicial para aprovação |
| 0.2 | 2026-08-12 | Tipo `resumo`/mapa mental (US-40), impressão em PDF (US-41) |
| 0.2 | 2026-08-12 | **APROVADA** — revisão de aplicabilidade concluída |
| 0.3 | 2026-08-13 | **Sales page por curso (US-44)** — página pública `/cursos/[slug]` (§3.8, C9/C10, E2E-C4) |
