# src/services/trilhas — Trilhas de Estudo por Edital

## Função

Regras de negócio das trilhas de estudo construídas a partir de editais (US-25 de `docs/specs/SPEC-trilhas.md`): o admin monta o edital e vincula conteúdo a disciplinas com peso; o aluno ativa a trilha e segue um plano ordenado por peso, com progresso independente por trilha.

A pasta cobre o lado do **aluno** (ativação, plano ordenado, progresso por disciplina) e o lado do **admin** (montagem do edital, vínculo de materiais, publicação e versionamento). O rastreamento de editais/concursos (US-42) vive em `editais/`.

## Arquitetura

- **Montagem do edital (admin)**: `editals` (nome, banca, data_prova, status rascunho/publicado, `versao`); `edital_disciplines` (nome + peso inteiro ≥ 1, unique por edital); vínculo `material_edital` — cada material a 0..1 disciplina do edital (T1), validado no servidor.
- **Ativação e plano (aluno)**: `user_trilhas` (unique user+edital, `ativo`); **múltiplas trilhas ativas simultaneamente** (T4), progresso independente por trilha.
- **Ordenação do plano** (T2): peso da disciplina desc → ordem do material. Progresso por disciplina (% concluído) e geral; bloqueados (sem entitlement) fora do denominador (T5, mesma regra AL1).
- **Versionamento** (T3): edital publicado é versionado — mudanças não afetam alunos que já ativaram a versão anterior; novos alunos veem a nova versão.
- **Conclusão**: 100% dos materiais acessíveis concluídos → selo "trilha concluída" (sem certificado — certificado é por curso, US-29).
- **Sem acesso**: materiais bloqueados aparecem no plano com estado bloqueado e CTAs de compra/assinatura.

## Decisões tomadas

| Data | Decisão |
|---|---|
| 2026-08-14 | `trilhas/` implementa a US-25 (SPEC-trilhas.md); rastreamento de concursos e scraping ficam em `editais/` |
| 2026-08-12 | D-T1: versionamento de editais publicados (T3) — alteração cria nova versão; versões antigas permanecem para quem ativou antes |
| 2026-08-12 | D-T2: **múltiplas trilhas ativas** permitidas (T4) — decisão do usuário em revisão de pendências |

## Informações úteis

- Spec de domínio: [docs/specs/SPEC-trilhas.md](docs/specs/SPEC-trilhas.md) — regras T1–T5 (:41-49), exemplos E2E-T1..T3 (:55-68), decisões D-T1/D-T2 (:72-77).
- Modelo de dados: [docs/modelo-de-dados.md](docs/modelo-de-dados.md) §2.7 (`user_trilhas`, `material_edital`, `edital_disciplines`, `editals`).
- Slice: [docs/plano-de-implementacao.md](docs/plano-de-implementacao.md):81-88 (S7 — trilhas por edital com versionamento).
- Testes: **unitário T3 (versionamento)** obrigatório — aluno mantém plano da versão ativada. E2E: E2E-T1..T3.
- Gating integra-se via `gating/` (R1–R12): materiais bloqueados não contam no progresso da trilha (T5).
- Armadilha: alterar pesos de um edital publicado sem criar nova versão quebra o T3 — valide a versão no momento da ativação.
