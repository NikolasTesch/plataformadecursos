# Plano de Implementação — Slices S1 a S8

- **Versão**: 0.2
- **Data**: 2026-08-13
- **Status**: [APROVADO — 2026-08-12 · revisado 2026-08-13]
- **Método**: SDD — cada slice termina funcional e verificável contra as specs aprovadas (AGENTS.md §2).

---

## 1. Ordem e Dependências

```
S1 Fundação ──► S2 Conteúdo ──► S3 Aluno core ──► S4 Questões
                                        │
S5 Vídeo ◄──── S4                       │
S6 Pagamentos (independe de S4/S5 — pode paralelizar)
S7 Expansão (trilhas, simulados, flashcards, comunidade, certificados, PWA, editais)
S8 Engajamento & dados (streak, notificações, relatório semanal, admin avançado, busca, exportação)
```

Slices com seta dupla: S5 depende do schema de materials (S2). S6 depende de S1 (auth) e S3 (gating). S7 depende de S2–S5. S8 acumula dados dos anteriores.

---

## 2. Detalhamento por Slice

### S1 — Fundação (schema + auth)
| Item | Conteúdo |
|---|---|
| **Escopo** | Scaffold Next.js+TS, Prisma+Postgres (Docker), schema completo do `modelo-de-dados.md`, Auth.js com roles, seed (admin + dados exemplo), lint/test setup |
| **Specs** | `SPEC-auth.md`, `modelo-de-dados.md` |
| **US** | US-01, US-02 |
| **Testes** | Unit: hash/validação de registro, rate limit. E2E: registro→login→logout, bloqueio de conta |
| **Saída** | App roda `npm run dev`; migrations aplicadas; seed funcional |

### S2 — Conteúdo (cursos, módulos, materiais, publicação)
| Item | Conteúdo |
|---|---|
| **Escopo** | CRUD cursos/módulos; materiais `pdf` (R2 upload + URL assinada) e `texto` (sanitização); rascunho/publicado; ordenação; amostra (R4/C2); tipo `resumo` (5º tipo) + impressão PDF |
| **Specs** | `SPEC-conteudo.md` |
| **US** | US-03, US-04, US-05, US-06, US-09, US-40, US-41, **US-44** (sales page) |
| **Testes** | Unit: C2 (máx 1 amostra), C5 (URL assinada), sanitização HTML, sales page nunca expõe conteúdo (R12). E2E: fluxo admin completo criar→publicar; visitante vê sales page sem vazar material |
| **Saída** | Admin publica PDF/texto/resumo; aluno (com acesso mock) lê; **visitante converte pela página pública do curso** |

### S3 — Área do aluno core (navegação + gating + progresso + anotações)
| Item | Conteúdo |
|---|---|
| **Escopo** | Home/navegação com status; motor de gating (R1–R12) com testes; progresso (AL1); anotações; certificados (US-29) |
| **Specs** | `SPEC-aluno.md` |
| **US** | US-11, US-12, US-14, US-15, US-29 |
| **Testes** | Unit: motor de gating (tabela de casos R1–R12), progresso. E2E: E2E-1..4, E2E-7, E2E-AL1, E2E-AL2 |
| **Saída** | Aluno navega, vê bloqueio correto, conclui, anota |

### S4 — Questões (blocos, banco de erros, favoritas, modo prova/estudo)
| Item | Conteúdo |
|---|---|
| **Escopo** | CRUD questões; resposta com feedback; taxa de acerto; banco de erros; favoritas; modo prova vs estudo (Q1/Q2) |
| **Specs** | `SPEC-questoes.md` |
| **US** | US-08, US-13, US-37, US-38, US-39 |
| **Testes** | Unit: Q1 (gabarito oculto), Q3 (histórico). E2E: E2E-Q1 |
| **Saída** | Aluno responde blocos com feedback e gerencia favoritas/erros |

### S5 — Vídeo (Bunny Stream)
| Item | Conteúdo |
|---|---|
| **Escopo** | Integração Bunny: upload direto, webhook de transcodificação, status processando/pronto/erro, player HLS, posição (V4), conclusão ≥95% (V5) |
| **Specs** | `SPEC-video.md` |
| **US** | US-07, US-10 |
| **Testes** | Unit: transições de status (R11), cálculo de conclusão. E2E: E2E-V1..V3 (V4 com mock do player) |
| **Saída** | Admin publica vídeo; aluno assiste e retoma |

### S6 — Pagamentos (Mercado Pago, trial, Pix)
| Item | Conteúdo |
|---|---|
| **Escopo** | Produtos (assinatura mensal/anual configurável, venda única); trial 7 dias sem cartão (P0-1); checkout MP com **Pix e cartão**; webhooks idempotentes (P1–P6); renovações (R8); refund (P4); expiração |
| **Specs** | `SPEC-pagamentos.md` |
| **US** | US-10, US-16, US-17, US-18, US-32, US-33, US-34, **US-45** (cupons admin), **US-46** (cupom no checkout) |
| **Testes** | Unit: idempotência, R8 (renovação soma ao fim), trial único, validação de cupom (expirado/esgotado/inválido), desconto só na 1ª cobrança. E2E: E2E-P1..P4 (webhook com assinatura válida), E2E-P7/P8 (cupom) |
| **Saída** | Aluno assina/compra com desconto; acesso concedido/revogado automaticamente |

### S7 — Expansão (trilhas, simulados, flashcards, comunidade, certificados, PWA, editais)
| Item | Conteúdo |
|---|---|
| **Escopo** | Trilhas por edital (versionamento T3); simulados cronometrados (entrega automática Q2, histórico Q3); flashcards SM-2 (F1–F4); comentários (CO1–CO5); **avaliações de curso (US-47/48 — nota média + moderação)**; PWA offline (AL4/AL5, download lote ZIP); rastreamento de editais manual + scraping (P0-3) |
| **Specs** | `SPEC-trilhas.md`, `SPEC-questoes.md` (§simulados), `SPEC-flashcards.md`, `SPEC-comunidade.md` (comentários + avaliações), `SPEC-aluno.md` (§PWA), `SPEC-editais.md` |
| **US** | US-25, US-27, US-26, US-28, US-30, US-42, US-43, **US-47** (avaliação), **US-48** (moderação) |
| **Testes** | Unit: T3 (versionamento), Q2 (entrega automática), F1/F2 (intervalos SM-2), fila de sync offline, CO6 (gating de avaliação) e nota média (apenas aprovadas). E2E: E2E-T1..T3, E2E-Q2/Q3, E2E-F1..F3, E2E-AL3, E2E-CO1..CO4 |
| **Saída** | Produto completo: trilha, simulado, revisão, dúvidas, offline |

### S8 — Engajamento & dados (streak, notificações, relatório, admin avançado, busca, exportação)
| Item | Conteúdo |
|---|---|
| **Escopo** | Streak + meta diária (US-35); notificações in-app/email (US-23, N1–N4); admin avançado: relatórios/funil/coorte/MRR/CSV (US-19, US-31); busca (US-21, incl. indexação de PDFs); verificação de email (US-22); exportação/exclusão LGPD (US-24); alertas de editais |
| **Specs** | `SPEC-engajamento.md`, `SPEC-notificacoes.md`, `SPEC-admin.md`, `SPEC-conteudo.md` (§busca), `SPEC-auth.md`, `SPEC-editais.md` |
| **US** | US-35, US-23, US-31, US-19, US-21, US-22, US-24 |
| **Testes** | Unit: streak (dias consecutivos), idempotência N2, agregações admin. E2E: E2E-N1..N3, E2E-AD1/AD2 |
| **Saída** | Retenção (streak/relatório), operação (admin avançado), conformidade (LGPD) |

---

## 3. Regras de Entrega por Slice

1. Slice entra **somente** com suas specs de domínio `[APROVADO]` (definição de pronto §8 da master).
2. Cada slice: código → testes unit (motor de regra) → E2E → verificação contra spec → revisão (`revisor`).
3. Migração Prisma por slice (nunca acumulada em 1 mega-migration).
4. Cada slice atualiza READMEs das pastas tocadas (AGENTS.md §3).
5. S6 e S5 podem paralelizar (equipes/agentes distintos).

## 4. Histórico

| Versão | Data | Mudança |
|---|---|---|
| 0.1 | 2026-08-12 | Versão inicial — 8 slices cobrindo US-01 a US-43 |
| 0.1 | 2026-08-12 | **APROVADO** — revisão de aplicabilidade concluída |
| 0.2 | 2026-08-13 | **Revisado** — novas US aprovadas: US-44 (sales page → S2), US-45/46 (cupons → S6), US-47/48 (avaliações → S7) |
