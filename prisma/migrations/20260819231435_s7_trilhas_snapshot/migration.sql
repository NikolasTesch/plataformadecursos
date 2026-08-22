-- S7.1 (REVISAO-S7-NUCLEO §10 v0.3): adiciona `plano_snapshot` JsonB obrigatório
-- de modo seguro (backfill) e remove o `DEFAULT 1` de `versao_ativacao`.
--
-- Contexto (estado inconsistente reconciliado): a migration anterior
-- `20260819211041_s7_trilhas_versao` criou `versao_ativacao INTEGER NOT NULL
-- DEFAULT 1`, mas o schema aprovado exige `versao_ativacao` SEM default (cópia
-- explícita de `editals.versao` no ato da ativação) e um `plano_snapshot` JsonB
-- congelado na ativação (T3/E2E-T2). O `plano_snapshot` não tinha migration.
--
-- Etapas (seguras para tabela com linhas existentes):
-- 1) Adiciona a coluna como NULLABLE (não quebra linhas existentes).
-- 2) Backfill: linhas existentes recebem um snapshot JSONB válido e vazio
--    ({disciplinas:[],materiais:[]}). O plano real é recalculado na próxima
--    ativação; o backfill garante NOT NULL sem perda de dados.
-- 3) Torna a coluna NOT NULL.
-- 4) Remove o DEFAULT 1 de `versao_ativacao` (a app preenche o valor na ativação).

-- 1) coluna nullable
ALTER TABLE "user_trilhas" ADD COLUMN "plano_snapshot" JSONB;

-- 2) backfill de linhas existentes (idempotente: só onde for NULL)
UPDATE "user_trilhas"
SET "plano_snapshot" = '{"disciplinas":[],"materiais":[]}'::jsonb
WHERE "plano_snapshot" IS NULL;

-- 3) NOT NULL
ALTER TABLE "user_trilhas" ALTER COLUMN "plano_snapshot" SET NOT NULL;

-- 4) remove DEFAULT 1 (versao_ativacao é cópia explícita de editals.versao)
ALTER TABLE "user_trilhas" ALTER COLUMN "versao_ativacao" DROP DEFAULT;
