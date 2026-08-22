-- S6.1 — Invariantes de pagamentos (modelo-de-dados.md §2.6 v0.6 aprovado em 2026-08-19)
--
-- Aplicada como migration incremental e independente da migration histórica
-- `20260819180000_s6_pagamentos_dominio` (não editada).
--
-- Atomicidade explícita: todo o arquivo roda dentro de uma única transação
-- (BEGIN/COMMIT). O Prisma detecta o controle de transação e NÃO reenvolve o
-- arquivo, deixando esta transação como a fonte da atomicidade. Os blocos
-- `DO $$` de preflight abortam a transação inteira caso encontrem dados
-- inconsistentes, sem aplicar qualquer correção financeira automática.
--
-- Observação: PostgreSQL não representa índices parciais únicos nem CHECK
-- constraints no schema Prisma de forma declarativa; por isso estes
-- invariantes vivem exclusivamente neste SQL.

BEGIN;

-- ---------------------------------------------------------------------------
-- Preflights: abortam antes de qualquer alteração estrutural
-- ---------------------------------------------------------------------------

-- Duplicidade de entitlement para a mesma assinatura
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM "entitlements"
    WHERE "subscription_id" IS NOT NULL
    GROUP BY "subscription_id"
    HAVING COUNT(*) > 1
  ) THEN
    RAISE EXCEPTION 'Preflight: entitlements duplicados para a mesma subscription_id';
  END IF;
END $$;

-- Venda única checkout aprovada duplicada (mesmo user+product, sem subscription)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM "purchases"
    WHERE "tipo" = 'checkout' AND "status" = 'aprovado' AND "subscription_id" IS NULL
    GROUP BY "user_id", "product_id"
    HAVING COUNT(*) > 1
  ) THEN
    RAISE EXCEPTION 'Preflight: venda única aprovada duplicada para user_id+product_id';
  END IF;
END $$;

-- Entitlement de subscription sem acesso_ate
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM "entitlements"
    WHERE "subscription_id" IS NOT NULL AND "acesso_ate" IS NULL
  ) THEN
    RAISE EXCEPTION 'Preflight: entitlement de subscription sem acesso_ate';
  END IF;
END $$;

-- Purchase com subscription_id sem periodicidade
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM "purchases"
    WHERE "subscription_id" IS NOT NULL AND "periodicidade" IS NULL
  ) THEN
    RAISE EXCEPTION 'Preflight: purchase com subscription_id sem periodicidade';
  END IF;
END $$;

-- Purchase aprovada sem entitlement_id
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM "purchases"
    WHERE "status" = 'aprovado' AND "entitlement_id" IS NULL
  ) THEN
    RAISE EXCEPTION 'Preflight: purchase aprovada sem entitlement_id';
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- webhook_events: tentativas + ultimo_erro (retry persistido)
-- ---------------------------------------------------------------------------
ALTER TABLE "webhook_events" ADD COLUMN "tentativas" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "webhook_events" ADD COLUMN "ultimo_erro" TEXT;

-- ---------------------------------------------------------------------------
-- entitlements.subscription_id: único (substitui o índice não-unico histórico)
-- ---------------------------------------------------------------------------
DROP INDEX IF EXISTS "entitlements_subscription_id_idx";
CREATE UNIQUE INDEX "entitlements_subscription_id_key" ON "entitlements"("subscription_id");

-- ---------------------------------------------------------------------------
-- CHECK constraints (purchases / entitlements)
-- ---------------------------------------------------------------------------
ALTER TABLE "purchases" ADD CONSTRAINT "purchases_subscription_periodicidade_chk"
  CHECK ("subscription_id" IS NULL OR "periodicidade" IS NOT NULL);

ALTER TABLE "purchases" ADD CONSTRAINT "purchases_aprovado_entitlement_chk"
  CHECK ("status" <> 'aprovado' OR "entitlement_id" IS NOT NULL);

ALTER TABLE "entitlements" ADD CONSTRAINT "entitlements_subscription_acesso_chk"
  CHECK ("subscription_id" IS NULL OR "acesso_ate" IS NOT NULL);

-- ---------------------------------------------------------------------------
-- Índice parcial único: uma venda única checkout aprovada por (user, product)
-- ---------------------------------------------------------------------------
CREATE UNIQUE INDEX "purchases_venda_unica_aprovada_key"
  ON "purchases"("user_id", "product_id")
  WHERE "tipo" = 'checkout' AND "status" = 'aprovado' AND "subscription_id" IS NULL;

-- ---------------------------------------------------------------------------
-- Recriar FKs de user_id com ON DELETE CASCADE (purchases e subscriptions)
-- ---------------------------------------------------------------------------
ALTER TABLE "purchases" DROP CONSTRAINT "purchases_user_id_fkey";
ALTER TABLE "purchases" ADD CONSTRAINT "purchases_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "subscriptions" DROP CONSTRAINT "subscriptions_user_id_fkey";
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

COMMIT;
