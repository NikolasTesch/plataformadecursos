# STATUS DE APROVAÇÃO — Specs de Domínio

- **Data**: 2026-08-13 (atualizado: SPEC-frontend e DESIGN aprovados)
- **Uso**: checklist de revisão/aprovação SDD (AGENTS.md §2). Marcar `[APROVADO]` somente após revisão do usuário. Nenhum slice inicia sem sua spec `[APROVADO]`.

---

## 1. Decisões Finais da Revisão de Pendências (2026-08-12)

Todas as pendências foram decididas pelo usuário. Registro para consulta:

| Pendência | Decisão final |
|---|---|
| C1 — Busca em PDFs | **Indexar conteúdo interno de PDFs** (texto extraído no upload) |
| D-Q1 — Alternativas | Ordem fixa (sem embaralhar) |
| D-Q2 — Montagem de simulados | Seleção manual pelo admin |
| D-Q3 — Saída do banco de erros | Após **2 acertos seguidos** |
| D-A1 — Offline vs. revogação | Manter downloads até **30 dias** após download |
| D-A3 — Gabarito no ZIP | **Sem gabarito** no ZIP |
| D-A4 — Vídeos no ZIP | **Fora do ZIP** (download individual via PWA) |
| T3 — Edital publicado alterado | **Versionar** (aluno mantém versão antiga) |
| T4 — Trilhas simultâneas | **Múltiplas ativas** permitidas |
| F1 — Intervalos SM-2 | 1/3/7/16/35/90 dias |
| F3 — Sugestão de cartão | Exige **confirmação** do aluno |
| D-C1 — Anexos em comentários | Sem anexos |
| D-C2 — Threads | 1 nível (resposta do admin fixada) |
| D-C4 — Denúncias | Sem denúncias no MVP |
| N5 / US-36 — Relatório semanal | **REMOVIDO do escopo** (US-36 excluída da master) |
| D-N2 — Email de novos materiais | Digest diário agrupado |
| D-E1 — Streak no dia atual | Não quebra até o fim do dia |
| E3 — Meta diária padrão | **30 min** (opções 15–90) |
| ED1 — Scraping de concursos | Fica `proposto` → **aprovação do admin** |
| A4 — Rate limits | Login 5/min · reenvio 3/dia · registro 10/hora |
| AD4 — Relatórios admin | Cache/agregação ≤ 1h |

**Documentos atualizados com estas decisões**: SPEC master v2.2 · PRD v2.2 · SPEC-conteudo 0.2 · SPEC-trilhas 0.2 · SPEC-notificacoes 0.3 · modelo-de-dados 0.1 · plano-de-implementacao 0.1.

---

## 2. Matriz de Aprovação (specs de domínio)

**15 specs aprovadas** (13 domínios em 2026-08-12 + `SPEC-frontend.md` e `SPEC-landing.md` em 2026-08-13). `SPEC-mobile.md`: idealização. **Novas US aprovadas em 2026-08-13**: US-44 (sales page), US-45/46 (cupons), US-47/48 (avaliações de curso) — master v2.5.

| # | Spec | Versão | US cobertas | Status |
|---|---|---|---|---|
| 1 | `SPEC-auth.md` | 0.1 | US-01, 02, 20, 22, 24 | ✅ [APROVADO] |
| 2 | `SPEC-conteudo.md` | 0.2 | US-03, 04, 05, 06, 09, 21, 40, 41 | ✅ [APROVADO] |
| 3 | `SPEC-video.md` | 0.1 | US-07, 10 | ✅ [APROVADO] |
| 4 | `SPEC-questoes.md` | 0.2 | US-08, 13, 27, 37, 38, 39 | ✅ [APROVADO] (Q4 alinhada ao modelo de dados) |
| 5 | `SPEC-aluno.md` | 0.2 | US-11, 12, 14, 15, 29, 30, 43 | ✅ [APROVADO] |
| 6 | `SPEC-pagamentos.md` | 0.2 | US-10, 16, 17, 18, 32, 33, 34 | ✅ [APROVADO] |
| 7 | `SPEC-admin.md` | 0.1 | US-19, 31 | ✅ [APROVADO] |
| 8 | `SPEC-trilhas.md` | 0.2 | US-25 | ✅ [APROVADO] (cabeçalho v0.2 corrigido) |
| 9 | `SPEC-flashcards.md` | 0.1 | US-26 | ✅ [APROVADO] |
| 10 | `SPEC-comunidade.md` | 0.1 | US-28 | ✅ [APROVADO] |
| 11 | `SPEC-notificacoes.md` | 0.3 | US-22, 23 | ✅ [APROVADO] |
| 12 | `SPEC-engajamento.md` | 0.1 | US-35 | ✅ [APROVADO] |
| 13 | `SPEC-editais.md` | 0.1 | US-42 | ✅ [APROVADO] |
| 14 | `SPEC-frontend.md` | 0.2 | Transversal (UI/design system) | ✅ [APROVADO — 2026-08-13] |
| 15 | `SPEC-mobile.md` | 0.1 | — (idealização) | [IDEALIZAÇÃO] — sem aprovação necessária |
| 16 | `SPEC-landing.md` | 0.2 | Transversal (landing de alta conversão) | ✅ [APROVADO — 2026-08-13] |

## 3. Documentos de Apoio

| Doc | Versão | Conteúdo | Status |
|---|---|---|---|
| `../modelo-de-dados.md` | 0.1 | Schema consolidado (base do Prisma no S1) | ✅ [APROVADO] |
| `../plano-de-implementacao.md` | 0.1 | Slices S1–S8 | ✅ [APROVADO] |
| `../DESIGN.md` | 0.7 | Direção visual e arte (prototipagem Pencil, dark mode) | ✅ [APROVADO — 2026-08-13] |

---

## 4. Ordem de Aprovação Recomendada

1. **`SPEC-auth.md`** + **`modelo-de-dados.md`** + **`plano-de-implementacao.md`** → habilita **S1**
2. `SPEC-conteudo.md` → **S2** · `SPEC-aluno.md` → **S3**
3. `SPEC-questoes.md` → **S4** · `SPEC-video.md` → **S5** · `SPEC-pagamentos.md` → **S6**
4. `SPEC-trilhas.md`, `SPEC-flashcards.md`, `SPEC-comunidade.md`, `SPEC-editais.md` → **S7**
5. `SPEC-engajamento.md`, `SPEC-notificacoes.md`, `SPEC-admin.md` → **S8**

---

## 5. Como aprovar

- ~~Em lote / parcial / com ajuste~~ — **todas as 14 specs de domínio + 3 documentos de apoio aprovados** (13 domínios + plano/modelo em 2026-08-12; frontend + DESIGN em 2026-08-13). Implementação ainda NÃO iniciada (aguardando ordem do usuário).

---

## 6. Histórico

| Versão | Data | Mudança |
|---|---|---|
| 0.1 | 2026-08-12 | Criação do checklist de revisão (14 specs + 2 docs de apoio) |
| 0.2 | 2026-08-12 | Registro das decisões finais da revisão de pendências (21 decisões); US-36 removida; T4 múltiplas trilhas; busca indexa PDFs |
| 0.3 | 2026-08-12 | **Todas as specs aprovadas** (13 domínios + modelo de dados + plano). Corrigido: Q4 alinhada ao modelo de dados; cabeçalho SPEC-trilhas v0.2 |
| 0.4 | 2026-08-13 | **`SPEC-frontend.md` aprovada** (v0.2) e `DESIGN.md` v0.7 aprovado — documentação 100% aprovada (14 specs + 3 docs de apoio); única idealização: mobile |
| 0.5 | 2026-08-13 | **`SPEC-landing.md` v0.1 adicionada** — landing de alta conversão [PENDENTE] (funil, CRO, SEO, analytics) |
| 0.6 | 2026-08-13 | **`SPEC-landing.md` v0.2 aprovada** (15 specs aprovadas) + **novas US aprovadas**: US-44 (sales page), US-45/46 (cupons), US-47/48 (avaliações) — specs conteudo 0.3, pagamentos 0.3, comunidade 0.2 revisadas |
