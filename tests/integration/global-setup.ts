// globalSetup da suíte de integração S6.1.
//
// Providencia um banco de TESTE isolado e aplica as migrations nele — NUNCA
// toca o banco de aplicação (`concursfoco`/produção). Roda uma única vez,
// antes dos testes, no processo principal do Vitest.
//
// Segurança:
// - Recebe explicitamente `TEST_DATABASE_URL` (já validada pela config: nome
//   casa `^[A-Za-z0-9_]+_test$` e esquema postgresql/postgres). Não lê
//   `DATABASE_URL` de aplicação.
// - Só cria o banco se faltar, usando EXCLUSIVAMENTE o nome já validado pela
//   regex (nunca `concursfoco`).
// - A conexão de manutenção usa o banco `postgres` (catálogo do servidor);
//   não conecta ao banco de aplicação para criar o teste.
// - `prisma migrate deploy` roda APENAS com DATABASE_URL apontando ao teste.
import pg from "pg";
import { execSync } from "node:child_process";

const TEST_DB_NAME_RE = /^[A-Za-z0-9_]+_test$/;

function dbNameOf(url: string): string {
  return new URL(url).pathname.replace(/^\//, "").split("?")[0];
}

function maintenanceUrlFor(testUrl: string): string {
  const u = new URL(testUrl);
  u.pathname = "/postgres";
  u.search = "";
  return u.toString();
}

async function testDbExists(maintenanceUrl: string, dbName: string): Promise<boolean> {
  const client = new pg.Client({ connectionString: maintenanceUrl });
  await client.connect();
  try {
    const res = await client.query("SELECT 1 FROM pg_database WHERE datname = $1", [dbName]);
    return (res.rowCount ?? 0) > 0;
  } finally {
    await client.end();
  }
}

export default async function globalSetup(): Promise<void> {
  const testUrl = process.env.TEST_DATABASE_URL;
  if (!testUrl || !testUrl.trim()) {
    throw new Error(
      "TEST_DATABASE_URL não resolvida pela config de integração. Defina " +
      "TEST_DATABASE_URL apontando a um banco cujo nome case " +
      "^[A-Za-z0-9_]+_test$ (ex.: concursfoco_test).",
    );
  }

  // Revalida aqui também: o nome usado no CREATE DATABASE é EXATAMENTE o
  // validado pela regex — nunca o banco de aplicação.
  const dbName = dbNameOf(testUrl);
  if (!TEST_DB_NAME_RE.test(dbName)) {
    throw new Error(
      `Banco de teste '${dbName}' não casa ^[A-Za-z0-9_]+_test$; abortando ` +
      `para não tocar o banco de aplicação/produção.`,
    );
  }

  const maintenanceUrl = maintenanceUrlFor(testUrl);
  let maint: pg.Client | null = null;
  try {
    maint = new pg.Client({ connectionString: maintenanceUrl });
    await maint.connect();
  } catch {
    maint = null;
  }

  if (!maint) {
    throw new Error(
      `Não foi possível conectar ao banco de manutenção 'postgres' para ` +
      `provisionar '${dbName}'. Crie o banco de teste manualmente e rode as ` +
      `migrations:\n` +
      `  CREATE DATABASE "${dbName}";\n` +
      `  npx prisma migrate deploy (com DATABASE_URL apontando a '${dbName}')\n` +
      `Em seguida defina TEST_DATABASE_URL apontando a '${dbName}'.`,
    );
  }

  try {
    if (!(await testDbExists(maintenanceUrl, dbName))) {
      // Só criamos porque o nome passou na validação `^[A-Za-z0-9_]+_test$`.
      // O identificador é exatamente o nome validado (nunca `concursfoco`).
      await maint.query(`CREATE DATABASE "${dbName}"`);
    }
  } finally {
    await maint.end();
  }

  // Aplica as migrations SOMENTE no banco de teste.
  execSync("npx prisma migrate deploy", {
    stdio: "inherit",
    env: { ...process.env, DATABASE_URL: testUrl },
  });
}
