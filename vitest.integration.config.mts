// Configuração do Vitest para TESTES DE INTEGRAÇÃO PostgreSQL REAIS (S6.1).
//
// SEGURANÇA (exigência de aceitação): esta suíte NUNCA deve tocar o banco de
// aplicação/produção. Ela usa exclusivamente um banco de TESTE isolado:
//   1. Lê `TEST_DATABASE_URL` (OBRIGATÓRIA) — nunca o `DATABASE_URL` de
//      aplicação, e nunca o deriva a partir dele.
//   2. Valida antes de qualquer conexão/SQL:
//      - o esquema deve ser `postgresql:`/`postgres:`;
//      - o nome do banco deve casar `^[A-Za-z0-9_]+_test$` (ex.:
//        `concursfoco_test`). Se ausente/vazia ou inválida, lança erro e NÃO
//        conecta nem roda SQL.
//   3. Só após validada, define `process.env.DATABASE_URL = TEST_DATABASE_URL`
//      exclusivamente para o client do serviço de teste.
//   4. O `globalSetup` recebe `TEST_DATABASE_URL` já validada e cria/aplica
//      migrations somente no banco de teste (nunca no `concursfoco`).
//
// Execute com: `npm run test:pg`. Requer `TEST_DATABASE_URL` apontando a um
// banco cujo nome case `^[A-Za-z0-9_]+_test$` (ex.: `concursfoco_test`).
import "dotenv/config";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { defineConfig } from "vitest/config";

const TEST_DB_NAME_RE = /^[A-Za-z0-9_]+_test$/;

function dbNameOf(url: string): string {
  return new URL(url).pathname.replace(/^\//, "").split("?")[0];
}

function resolverTestDatabaseUrl(): string {
  const raw = process.env.TEST_DATABASE_URL;
  if (!raw || !raw.trim()) {
    throw new Error(
      "TEST_DATABASE_URL não definida ou vazia. A suíte de integração " +
      "PostgreSQL real EXIGE um banco de TESTE isolado (nunca o banco de " +
      "aplicação/produção). Defina TEST_DATABASE_URL apontando a um banco " +
      "cujo nome case ^[A-Za-z0-9_]+_test$ (ex.: concursfoco_test). " +
      "Não é feita nenhuma derivação a partir de DATABASE_URL.",
    );
  }

  const url = raw.trim();
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new Error(
      `TEST_DATABASE_URL inválida (não é uma URL): '${url}'. Abortando antes ` +
      `de qualquer conexão/SQL.`,
    );
  }

  const scheme = parsed.protocol.toLowerCase();
  if (scheme !== "postgresql:" && scheme !== "postgres:") {
    throw new Error(
      `TEST_DATABASE_URL usa esquema '${parsed.protocol}'; esperado ` +
      `'postgresql:'/'postgres:'. Abortando antes de qualquer conexão/SQL.`,
    );
  }

  const dbName = dbNameOf(url);
  if (!TEST_DB_NAME_RE.test(dbName)) {
    throw new Error(
      `TEST_DATABASE_URL aponta a '${dbName}', que NÃO é um banco de teste ` +
      `válido. O nome do banco deve casar ^[A-Za-z0-9_]+_test$ (ex.: ` +
      `concursfoco_test) para evitar tocar o banco de aplicação/produção. ` +
      `Abortando antes de qualquer SQL.`,
    );
  }

  // O client do serviço (@/lib/db) lê DATABASE_URL: redireciona para o teste
  // SOMENTE após a validação acima.
  process.env.DATABASE_URL = url;
  return url;
}

const TEST_DATABASE_URL = resolverTestDatabaseUrl();

export default defineConfig({
  test: {
    environment: "node",
    globals: true,
    include: ["tests/integration/**/*.test.ts"],
    // Um arquivo de cada vez: os testes mutam o banco real e cada um limpa seus
    // próprios fixtures (isolation por IDs únicos + afterEach). Evita contenção
    // cross-arquivo desnecessária.
    fileParallelism: false,
    testTimeout: 30000,
    hookTimeout: 30000,
    // Garante o banco de teste (cria se faltar, com nome validado _test) e
    // aplica migrations.
    globalSetup: "./tests/integration/global-setup.ts",
    // Propaga o banco de teste para os workers (não o DATABASE_URL de aplicação).
    env: { DATABASE_URL: TEST_DATABASE_URL, TEST_DATABASE_URL },
  },
  resolve: {
    alias: {
      "@": path.resolve(fileURLToPath(new URL(".", import.meta.url)), "./src"),
    },
  },
});
