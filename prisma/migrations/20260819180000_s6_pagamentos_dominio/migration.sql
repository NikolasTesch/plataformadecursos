-- S6 — Domínio de pagamentos (parte 1). História canônica e transacional.
-- Atomicidade explícita: todo o arquivo roda dentro de uma única transação
-- (BEGIN/COMMIT). O Prisma detecta o controle de transação e NÃO reenvolve
-- o arquivo, deixando esta transação como a fonte da atomicidade.

BEGIN;

-- CreateEnum
CREATE TYPE "PurchasePeriodicidade" AS ENUM ('mensal', 'anual');

-- CreateEnum
CREATE TYPE "SubscriptionStatus" AS ENUM ('ativa', 'cancelada', 'pausada', 'expirada');

-- CreateEnum
CREATE TYPE "WebhookEventProvedor" AS ENUM ('mercado_pago');

-- CreateEnum
CREATE TYPE "WebhookEventStatus" AS ENUM ('recebido', 'processado', 'falhou');

-- AlterTable
ALTER TABLE "entitlements" ADD COLUMN "subscription_id" TEXT;

-- AlterTable
ALTER TABLE "products" ADD COLUMN "preco_unico_cents" INTEGER;

-- AlterTable
ALTER TABLE "purchases"
  ADD COLUMN "entitlement_id" TEXT,
  ADD COLUMN "periodicidade" "PurchasePeriodicidade",
  ADD COLUMN "subscription_id" TEXT,
  ALTER COLUMN "mp_payment_id" DROP NOT NULL;

-- CreateTable
CREATE TABLE "subscriptions" (
  "id" TEXT NOT NULL,
  "user_id" TEXT NOT NULL,
  "product_id" TEXT NOT NULL,
  "periodicidade" "PurchasePeriodicidade" NOT NULL,
  "mp_subscription_id" TEXT NOT NULL,
  "status" "SubscriptionStatus" NOT NULL,
  "acesso_ate" TIMESTAMP(3) NOT NULL,
  "cancelada_em" TIMESTAMP(3),
  "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "atualizado_em" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "webhook_events" (
  "id" TEXT NOT NULL,
  "provedor" "WebhookEventProvedor" NOT NULL,
  "recurso_id" TEXT NOT NULL,
  "tipo_evento" TEXT NOT NULL,
  "status" "WebhookEventStatus" NOT NULL,
  "payload" JSONB NOT NULL,
  "recebido_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "processado_em" TIMESTAMP(3),
  CONSTRAINT "webhook_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "subscriptions_mp_subscription_id_key" ON "subscriptions"("mp_subscription_id");
CREATE INDEX "subscriptions_user_id_status_idx" ON "subscriptions"("user_id", "status");
CREATE INDEX "webhook_events_status_recebido_em_idx" ON "webhook_events"("status", "recebido_em");
CREATE UNIQUE INDEX "webhook_events_provedor_recurso_id_tipo_evento_key" ON "webhook_events"("provedor", "recurso_id", "tipo_evento");
CREATE INDEX "entitlements_subscription_id_idx" ON "entitlements"("subscription_id");

-- Preflight: duplicatas de products.curso_id (venda única 1:1 por curso)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM "products"
    WHERE "curso_id" IS NOT NULL
    GROUP BY "curso_id"
    HAVING COUNT(*) > 1
  ) THEN
    RAISE EXCEPTION 'Preflight: products.curso_id duplicado (venda única 1:1 por curso)';
  END IF;
END $$;

CREATE UNIQUE INDEX "products_curso_id_key" ON "products"("curso_id");
CREATE INDEX "purchases_user_id_status_criado_em_idx" ON "purchases"("user_id", "status", "criado_em" DESC);
CREATE INDEX "purchases_entitlement_id_idx" ON "purchases"("entitlement_id");
CREATE INDEX "purchases_subscription_id_idx" ON "purchases"("subscription_id");

-- AddForeignKey
ALTER TABLE "purchases" ADD CONSTRAINT "purchases_entitlement_id_fkey" FOREIGN KEY ("entitlement_id") REFERENCES "entitlements"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "purchases" ADD CONSTRAINT "purchases_subscription_id_fkey" FOREIGN KEY ("subscription_id") REFERENCES "subscriptions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "entitlements" ADD CONSTRAINT "entitlements_subscription_id_fkey" FOREIGN KEY ("subscription_id") REFERENCES "subscriptions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

COMMIT;
