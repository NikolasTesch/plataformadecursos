-- CreateEnum
CREATE TYPE "Role" AS ENUM ('aluno', 'admin');

-- CreateEnum
CREATE TYPE "MaterialTipo" AS ENUM ('pdf', 'texto', 'video', 'questoes', 'resumo');

-- CreateEnum
CREATE TYPE "MaterialStatus" AS ENUM ('rascunho', 'publicado');

-- CreateEnum
CREATE TYPE "VideoStatus" AS ENUM ('processando', 'pronto', 'erro');

-- CreateEnum
CREATE TYPE "SimuladoStatus" AS ENUM ('rascunho', 'publicado');

-- CreateEnum
CREATE TYPE "SimuladoAttemptStatus" AS ENUM ('em_andamento', 'entregue');

-- CreateEnum
CREATE TYPE "ProductTipo" AS ENUM ('assinatura', 'venda_unica');

-- CreateEnum
CREATE TYPE "ProductStatus" AS ENUM ('ativo', 'inativo');

-- CreateEnum
CREATE TYPE "PurchaseTipo" AS ENUM ('checkout', 'trial');

-- CreateEnum
CREATE TYPE "PurchaseStatus" AS ENUM ('pendente', 'aprovado', 'recusado', 'reembolsado');

-- CreateEnum
CREATE TYPE "CouponTipo" AS ENUM ('percentual', 'fixo');

-- CreateEnum
CREATE TYPE "CouponEscopo" AS ENUM ('assinatura', 'venda_unica');

-- CreateEnum
CREATE TYPE "EntitlementOrigem" AS ENUM ('pagamento', 'trial', 'admin');

-- CreateEnum
CREATE TYPE "EditalStatus" AS ENUM ('rascunho', 'publicado');

-- CreateEnum
CREATE TYPE "ConcursoOrigem" AS ENUM ('manual', 'scraping');

-- CreateEnum
CREATE TYPE "ConcursoStatus" AS ENUM ('aberto', 'inscricoes', 'em_breve', 'encerrado');

-- CreateEnum
CREATE TYPE "ReviewStatus" AS ENUM ('pendente', 'aprovado', 'oculta');

-- CreateEnum
CREATE TYPE "NotificationTipo" AS ENUM ('novo_material', 'assinatura_expirando', 'assinatura_expirada', 'resposta_comentario', 'verificacao_email', 'revisoes_pendentes');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "senha_hash" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'aluno',
    "verificado_em" TIMESTAMP(3),
    "bloqueado" BOOLEAN NOT NULL DEFAULT false,
    "consentimento_lgpd_em" TIMESTAMP(3) NOT NULL,
    "trial_usado" BOOLEAN NOT NULL DEFAULT false,
    "meta_diaria_minutos" INTEGER NOT NULL DEFAULT 30,
    "tokenVersion" INTEGER NOT NULL DEFAULT 0,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sessions" (
    "id" TEXT NOT NULL,
    "session_token" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "verification_tokens" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "expira_em" TIMESTAMP(3) NOT NULL,
    "usado_em" TIMESTAMP(3),
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "verification_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "courses" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "descricao" TEXT,
    "imagem_url" TEXT,
    "slug" TEXT NOT NULL,
    "incluido_assinatura" BOOLEAN NOT NULL DEFAULT false,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "courses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "modules" (
    "id" TEXT NOT NULL,
    "course_id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "ordem" INTEGER NOT NULL,

    CONSTRAINT "modules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "materials" (
    "id" TEXT NOT NULL,
    "module_id" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "tipo" "MaterialTipo" NOT NULL,
    "ordem" INTEGER NOT NULL,
    "status" "MaterialStatus" NOT NULL DEFAULT 'rascunho',
    "publicado_em" TIMESTAMP(3),
    "amostra" BOOLEAN NOT NULL DEFAULT false,
    "conteudo_html" TEXT,
    "arquivo_key" TEXT,
    "video_provider_id" TEXT,
    "video_status" "VideoStatus",
    "video_erro" TEXT,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "materials_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "simulados" (
    "id" TEXT NOT NULL,
    "curso_id" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "instrucoes" TEXT,
    "duracao_minutos" INTEGER NOT NULL,
    "status" "SimuladoStatus" NOT NULL DEFAULT 'rascunho',
    "publicado_em" TIMESTAMP(3),

    CONSTRAINT "simulados_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "simulado_questions" (
    "id" TEXT NOT NULL,
    "simulado_id" TEXT NOT NULL,
    "question_id" TEXT NOT NULL,
    "ordem" INTEGER NOT NULL,

    CONSTRAINT "simulado_questions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "questions" (
    "id" TEXT NOT NULL,
    "material_id" TEXT NOT NULL,
    "enunciado" TEXT NOT NULL,
    "alternativas" JSONB NOT NULL,
    "gabarito" TEXT NOT NULL,
    "comentario_html" TEXT,
    "ordem" INTEGER NOT NULL,

    CONSTRAINT "questions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "attempts" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "question_id" TEXT NOT NULL,
    "alternativa_escolhida" TEXT NOT NULL,
    "acerto" BOOLEAN NOT NULL,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "attempts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "favorites" (
    "user_id" TEXT NOT NULL,
    "question_id" TEXT NOT NULL,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "favorites_pkey" PRIMARY KEY ("user_id","question_id")
);

-- CreateTable
CREATE TABLE "simulado_attempts" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "simulado_id" TEXT NOT NULL,
    "iniciado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "entregue_em" TIMESTAMP(3),
    "respostas" JSONB NOT NULL,
    "nota" DECIMAL(65,30),
    "status" "SimuladoAttemptStatus" NOT NULL DEFAULT 'em_andamento',

    CONSTRAINT "simulado_attempts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_progress" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "material_id" TEXT NOT NULL,
    "concluido" BOOLEAN NOT NULL DEFAULT false,
    "concluido_em" TIMESTAMP(3),
    "posicao_segundos" INTEGER NOT NULL DEFAULT 0,
    "atualizado_em" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_progress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notes" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "material_id" TEXT NOT NULL,
    "conteudo" TEXT NOT NULL,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "notes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "certificates" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "course_id" TEXT NOT NULL,
    "codigo" TEXT NOT NULL,
    "gerado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "certificates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "products" (
    "id" TEXT NOT NULL,
    "tipo" "ProductTipo" NOT NULL,
    "nome" TEXT NOT NULL,
    "preco_mensal_cents" INTEGER,
    "preco_anual_cents" INTEGER,
    "curso_id" TEXT,
    "status" "ProductStatus" NOT NULL,

    CONSTRAINT "products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "purchases" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "mp_payment_id" TEXT NOT NULL,
    "tipo" "PurchaseTipo" NOT NULL,
    "status" "PurchaseStatus" NOT NULL,
    "valor_cents" INTEGER NOT NULL,
    "coupon_id" TEXT,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "purchases_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "coupons" (
    "id" TEXT NOT NULL,
    "codigo" TEXT NOT NULL,
    "tipo" "CouponTipo" NOT NULL,
    "valor" DECIMAL(65,30) NOT NULL,
    "escopo" "CouponEscopo" NOT NULL,
    "product_id" TEXT,
    "valido_de" TIMESTAMP(3) NOT NULL,
    "valido_ate" TIMESTAMP(3) NOT NULL,
    "limite_uso" INTEGER,
    "usos" INTEGER NOT NULL DEFAULT 0,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "coupons_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "entitlements" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "origem" "EntitlementOrigem" NOT NULL,
    "acesso_ate" TIMESTAMP(3),
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "entitlements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "editals" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "banca" TEXT NOT NULL,
    "data_prova" DATE,
    "status" "EditalStatus" NOT NULL,
    "versao" INTEGER NOT NULL DEFAULT 1,
    "publicada_em" TIMESTAMP(3),

    CONSTRAINT "editals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "edital_disciplines" (
    "id" TEXT NOT NULL,
    "edital_id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "peso" INTEGER NOT NULL,

    CONSTRAINT "edital_disciplines_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "material_edital" (
    "material_id" TEXT NOT NULL,
    "edital_id" TEXT NOT NULL,
    "disciplina_id" TEXT NOT NULL,

    CONSTRAINT "material_edital_pkey" PRIMARY KEY ("material_id","edital_id")
);

-- CreateTable
CREATE TABLE "user_trilhas" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "edital_id" TEXT NOT NULL,
    "ativo" BOOLEAN NOT NULL,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_trilhas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "concursos" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "orgao" TEXT NOT NULL,
    "banca" TEXT NOT NULL,
    "origem" "ConcursoOrigem" NOT NULL,
    "fonte_url" TEXT,
    "inscricao_inicio" DATE,
    "inscricao_fim" DATE,
    "data_prova" DATE,
    "status" "ConcursoStatus" NOT NULL,
    "ultimo_sync_em" TIMESTAMP(3),

    CONSTRAINT "concursos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_concursos" (
    "user_id" TEXT NOT NULL,
    "concurso_id" TEXT NOT NULL,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_concursos_pkey" PRIMARY KEY ("user_id","concurso_id")
);

-- CreateTable
CREATE TABLE "flashcards" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "material_id" TEXT,
    "question_id" TEXT,
    "pergunta" TEXT NOT NULL,
    "resposta" TEXT NOT NULL,
    "nivel" INTEGER NOT NULL,
    "proxima_revisao" DATE NOT NULL,
    "revisoes" INTEGER NOT NULL,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "flashcards_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "comments" (
    "id" TEXT NOT NULL,
    "material_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "conteudo" TEXT NOT NULL,
    "respondido" BOOLEAN NOT NULL DEFAULT false,
    "resposta_admin" TEXT,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "comments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "course_reviews" (
    "id" TEXT NOT NULL,
    "course_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "nota" INTEGER NOT NULL,
    "comentario" TEXT,
    "status" "ReviewStatus" NOT NULL DEFAULT 'pendente',
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "course_reviews_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "tipo" "NotificationTipo" NOT NULL,
    "titulo" TEXT NOT NULL,
    "corpo" TEXT NOT NULL,
    "lida" BOOLEAN NOT NULL DEFAULT false,
    "notification_key" TEXT NOT NULL,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "study_activity" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "dia" DATE NOT NULL,
    "minutos" INTEGER NOT NULL DEFAULT 0,
    "materiais_concluidos" INTEGER NOT NULL DEFAULT 0,
    "questoes_respondidas" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "study_activity_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "sessions_session_token_key" ON "sessions"("session_token");

-- CreateIndex
CREATE UNIQUE INDEX "courses_slug_key" ON "courses"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "modules_course_id_ordem_key" ON "modules"("course_id", "ordem");

-- CreateIndex
CREATE INDEX "materials_module_id_ordem_idx" ON "materials"("module_id", "ordem");

-- CreateIndex
CREATE UNIQUE INDEX "simulado_questions_simulado_id_question_id_key" ON "simulado_questions"("simulado_id", "question_id");

-- CreateIndex
CREATE INDEX "attempts_user_id_question_id_criado_em_idx" ON "attempts"("user_id", "question_id", "criado_em" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "user_progress_user_id_material_id_key" ON "user_progress"("user_id", "material_id");

-- CreateIndex
CREATE UNIQUE INDEX "certificates_codigo_key" ON "certificates"("codigo");

-- CreateIndex
CREATE UNIQUE INDEX "certificates_user_id_course_id_key" ON "certificates"("user_id", "course_id");

-- CreateIndex
CREATE UNIQUE INDEX "purchases_mp_payment_id_key" ON "purchases"("mp_payment_id");

-- CreateIndex
CREATE UNIQUE INDEX "coupons_codigo_key" ON "coupons"("codigo");

-- CreateIndex
CREATE INDEX "coupons_valido_ate_ativo_idx" ON "coupons"("valido_ate", "ativo");

-- CreateIndex
CREATE INDEX "entitlements_user_id_product_id_idx" ON "entitlements"("user_id", "product_id");

-- CreateIndex
CREATE INDEX "editals_status_publicada_em_idx" ON "editals"("status", "publicada_em");

-- CreateIndex
CREATE UNIQUE INDEX "edital_disciplines_edital_id_nome_key" ON "edital_disciplines"("edital_id", "nome");

-- CreateIndex
CREATE UNIQUE INDEX "user_trilhas_user_id_edital_id_key" ON "user_trilhas"("user_id", "edital_id");

-- CreateIndex
CREATE INDEX "course_reviews_course_id_status_idx" ON "course_reviews"("course_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "course_reviews_course_id_user_id_key" ON "course_reviews"("course_id", "user_id");

-- CreateIndex
CREATE UNIQUE INDEX "notifications_notification_key_key" ON "notifications"("notification_key");

-- CreateIndex
CREATE INDEX "notifications_user_id_criado_em_idx" ON "notifications"("user_id", "criado_em" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "study_activity_user_id_dia_key" ON "study_activity"("user_id", "dia");

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "verification_tokens" ADD CONSTRAINT "verification_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "modules" ADD CONSTRAINT "modules_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "courses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "materials" ADD CONSTRAINT "materials_module_id_fkey" FOREIGN KEY ("module_id") REFERENCES "modules"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "simulados" ADD CONSTRAINT "simulados_curso_id_fkey" FOREIGN KEY ("curso_id") REFERENCES "courses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "simulado_questions" ADD CONSTRAINT "simulado_questions_simulado_id_fkey" FOREIGN KEY ("simulado_id") REFERENCES "simulados"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "simulado_questions" ADD CONSTRAINT "simulado_questions_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "questions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "questions" ADD CONSTRAINT "questions_material_id_fkey" FOREIGN KEY ("material_id") REFERENCES "materials"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attempts" ADD CONSTRAINT "attempts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attempts" ADD CONSTRAINT "attempts_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "questions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "favorites" ADD CONSTRAINT "favorites_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "favorites" ADD CONSTRAINT "favorites_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "questions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "simulado_attempts" ADD CONSTRAINT "simulado_attempts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "simulado_attempts" ADD CONSTRAINT "simulado_attempts_simulado_id_fkey" FOREIGN KEY ("simulado_id") REFERENCES "simulados"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_progress" ADD CONSTRAINT "user_progress_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_progress" ADD CONSTRAINT "user_progress_material_id_fkey" FOREIGN KEY ("material_id") REFERENCES "materials"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notes" ADD CONSTRAINT "notes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notes" ADD CONSTRAINT "notes_material_id_fkey" FOREIGN KEY ("material_id") REFERENCES "materials"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "certificates" ADD CONSTRAINT "certificates_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "certificates" ADD CONSTRAINT "certificates_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "courses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_curso_id_fkey" FOREIGN KEY ("curso_id") REFERENCES "courses"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchases" ADD CONSTRAINT "purchases_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchases" ADD CONSTRAINT "purchases_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchases" ADD CONSTRAINT "purchases_coupon_id_fkey" FOREIGN KEY ("coupon_id") REFERENCES "coupons"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "coupons" ADD CONSTRAINT "coupons_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "entitlements" ADD CONSTRAINT "entitlements_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "entitlements" ADD CONSTRAINT "entitlements_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "edital_disciplines" ADD CONSTRAINT "edital_disciplines_edital_id_fkey" FOREIGN KEY ("edital_id") REFERENCES "editals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "material_edital" ADD CONSTRAINT "material_edital_material_id_fkey" FOREIGN KEY ("material_id") REFERENCES "materials"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "material_edital" ADD CONSTRAINT "material_edital_edital_id_fkey" FOREIGN KEY ("edital_id") REFERENCES "editals"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "material_edital" ADD CONSTRAINT "material_edital_disciplina_id_fkey" FOREIGN KEY ("disciplina_id") REFERENCES "edital_disciplines"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_trilhas" ADD CONSTRAINT "user_trilhas_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_trilhas" ADD CONSTRAINT "user_trilhas_edital_id_fkey" FOREIGN KEY ("edital_id") REFERENCES "editals"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_concursos" ADD CONSTRAINT "user_concursos_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_concursos" ADD CONSTRAINT "user_concursos_concurso_id_fkey" FOREIGN KEY ("concurso_id") REFERENCES "concursos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "flashcards" ADD CONSTRAINT "flashcards_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "flashcards" ADD CONSTRAINT "flashcards_material_id_fkey" FOREIGN KEY ("material_id") REFERENCES "materials"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "flashcards" ADD CONSTRAINT "flashcards_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "questions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comments" ADD CONSTRAINT "comments_material_id_fkey" FOREIGN KEY ("material_id") REFERENCES "materials"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comments" ADD CONSTRAINT "comments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "course_reviews" ADD CONSTRAINT "course_reviews_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "courses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "course_reviews" ADD CONSTRAINT "course_reviews_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "study_activity" ADD CONSTRAINT "study_activity_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
