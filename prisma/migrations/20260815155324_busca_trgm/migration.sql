-- CreateExtension
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- AlterTable
ALTER TABLE "materials" ADD COLUMN     "conteudo_busca" TEXT;

-- CreateIndex
CREATE INDEX "materials_conteudo_busca_idx" ON "materials" USING GIN ("conteudo_busca" gin_trgm_ops);
