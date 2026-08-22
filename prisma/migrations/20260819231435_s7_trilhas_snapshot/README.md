# Migration S7.1 — Snapshot imutável da trilha (`plano_snapshot` + `versao_ativacao`)

## Função

Reconcilia o estado inconsistente deixado pela migration anterior
`20260819211041_s7_trilhas_versao`, que criou `versao_ativacao INTEGER NOT NULL
DEFAULT 1` mas não criou `plano_snapshot`. Esta migration adiciona
`plano_snapshot` JsonB (fonte da verdade do plano do aluno após republicar o
edital — T3/E2E-T2) e remove o `DEFAULT 1` de `versao_ativacao` (cópia explícita
de `editals.versao` no ato da ativação, sem default silencioso).

## Arquitetura

Aplica as duas mudanças de schema do S7.1 em uma única migration, após a
anterior. O `plano_snapshot` congela composição/ordem (disciplinas `{id,nome,peso}`
+ materiais `{id,ordem,disciplina_id}` — `ordem` = `materials.ordem`; sem
`material_edital.ordem`) no instante da ativação; o plano é lido exclusivamente
do snapshot. Não cria tabelas versionadas, scraping, rollback ou auditoria.

## Decisões tomadas

| Data | Decisão |
|---|---|
| 2026-08-19 | `plano_snapshot` adicionado em etapas seguras (nullable → backfill JSON válido → NOT NULL) para não quebrar linhas existentes; backfill usa snapshot vazio `{"disciplinas":[],"materiais":[]}` (plano recalculado na próxima ativação) |
| 2026-08-19 | `versao_ativacao` perde o `DEFAULT 1`; a aplicação preenche o valor na ativação (contrato REVISAO-S7-NUCLEO §10 v0.3) |
| 2026-08-19 | `materiais` do snapshot incluem `disciplina_id` (além de `id,ordem`) porque o plano agrupa por disciplina com progresso — o snapshot precisa ser autocontido |

## Informações úteis

- Contrato aprovado: `docs/specs/REVISAO-S7-NUCLEO.md` §10 v0.3, `docs/specs/SPEC-trilhas.md` §3.2, `docs/modelo-de-dados.md` §2.7.
- Aplicar com `prisma migrate deploy` (nunca reset/db push). `prisma migrate status` mostra esta migration como pendente até a aplicação.
- Sem tabelas versionadas, `material_edital.ordem`, scraping, rollback ou auditoria admin.
