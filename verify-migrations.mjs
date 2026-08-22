// Verifica se o checksum SHA-256 dos arquivos migration.sql locais confere com
// o registrado em `_prisma_migrations` no banco aplicado. Não imprime
// DATABASE_URL (lê de process.env internamente).
import "dotenv/config";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { createHash } from "node:crypto";
import pg from "pg";

const migrationsDir = "prisma/migrations";
const dirs = readdirSync(migrationsDir, { withFileTypes: true }).filter((d) => d.isDirectory());

const local = [];
for (const d of dirs) {
  const sqlPath = join(migrationsDir, d.name, "migration.sql");
  try {
    const buf = readFileSync(sqlPath);
    const hash = createHash("sha256").update(buf).digest("hex");
    local.push({ name: d.name, hash });
  } catch {
    // ignora pastas sem migration.sql
  }
}

const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
await client.connect();
const res = await client.query("SELECT migration_name, checksum FROM _prisma_migrations ORDER BY migration_name");
await client.end();

const dbMap = new Map(res.rows.map((r) => [r.migration_name, r.checksum]));

let ok = true;
for (const { name, hash } of local) {
  const dbHash = dbMap.get(name);
  const match = dbHash === hash;
  if (!match) ok = false;
  const status = match ? "OK  " : dbHash ? "DIFF " : "MISS ";
  console.log(`${status} ${name}\n      local=${hash}\n      db   =${dbHash ?? "<ausente>"}`);
}
console.log(ok ? "\nRESULTADO: TODOS_OS_CHECKSUMS_CONFEREM" : "\nRESULTADO: HOUVE_DIVERGENCIA");
process.exit(ok ? 0 : 1);
