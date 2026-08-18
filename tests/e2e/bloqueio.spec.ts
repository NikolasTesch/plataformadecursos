// E2E do bloqueio de conta (todo 16) — E2E-A1 (SPEC-auth.md:74-77) no app real.
//
// Fluxo (UM teste — cookies não persistem entre testes no Playwright):
//   seed (reset idempotente: aluno bloqueado=false, tokenVersion=0 — MAJOR-2,
//   torna o spec repetível no mesmo dev DB) → login do aluno seed via UI
//   (sessão ACTIVE, tokenVersion 0 no JWT) → setBloqueado(alunoId, true) via
//   service (bump tokenVersion → 1) → assert de ESTADO REAL no banco (1/true)
//   → próxima navegação a /app: o middleware passa (JWT ainda assinado), o
//   check em NODE (verificarSessaoValida no server component) detecta o bump e
//   redireciona para /login — a revogação é enforcement em Node, NUNCA
//   middleware/Edge (BLOCKER-1) → re-login negado com "conta suspensa" (UMA
//   tentativa: contas bloqueadas não registram falha — D33; não acumular rate
//   limit por IP).
//
// Caminho sancionado do bloqueio: chamada de serviço no setup do teste
// (US-20 ainda não tem UI — criar painel admin está FORA do escopo).
//
// POR QUE subprocess tsx para o acesso ao banco: o alias `@/` RESOLVE no
// loader do Playwright, mas o client Prisma 7 gerado usa `import.meta` no
// top-level (src/generated/prisma/client.ts) — impossível de transformar para
// o formato CJS que o Playwright usa para specs sob package.json sem
// "type":"module" (erro: "Cannot use 'import.meta' outside a module").
// O padrão ESM do projeto para Node é o tsx (mesmo mecanismo do seed.ts).
// O helper é GERADO em runtime pelo spec em .omo/ (gitignored) e apagado no
// afterAll — o commit permanece com UM arquivo.
import { execSync } from "node:child_process";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { expect, test } from "@playwright/test";

// Credenciais DEV documentadas (prisma/seed.ts) — nunca usar em produção.
const ALUNO_EMAIL = "aluno@concursfoco.dev";
const ALUNO_SENHA = "Aluno@1234";

// O Playwright é invocado da raiz do repo (npm run test:e2e) — process.cwd()
// é a raiz (o webServer do config também assume isso).
const REPO_ROOT = process.cwd();

// --- Helper ESM (tsx) para acesso ao banco: ver explicação no header. ---
const HELPER_DIR = join(REPO_ROOT, ".omo", "e2e-helper");
const HELPER_PATH = join(HELPER_DIR, "bloqueio.ts");

const HELPER_SCRIPT = [
  "// Helper ESM executado via tsx: o client Prisma 7 usa import.meta no",
  "// top-level e não pode ser transformado para CJS pelo loader do Playwright.",
  "// Gerado em runtime pelo spec (gitignored) e apagado no afterAll.",
  'import "dotenv/config";',
  'import { db } from "../../src/lib/db";',
  'import { setBloqueado } from "../../src/services/auth/bloqueio";',
  "",
  "type Acao = 'id' | 'bloquear';",
  "const acao = process.argv[2] as Acao;",
  "",
  "async function main(): Promise<void> {",
  "  if (acao === 'id') {",
  "    const aluno = await db.users.findUnique({",
  "      where: { email: process.env['ALUNO_EMAIL'] ?? '' },",
  "      select: { id: true, tokenVersion: true, bloqueado: true },",
  "    });",
  "    console.log(JSON.stringify(aluno));",
  "    return;",
  "  }",
  "  if (acao === 'bloquear') {",
  "    const id = process.env['ALUNO_ID'];",
  "    if (!id) throw new Error('ALUNO_ID ausente');",
  "    await setBloqueado(id, true);",
  "    // Leitura FRESCA do banco (não o retorno do service) — prova o estado real.",
  "    const usuario = await db.users.findUnique({",
  "      where: { id },",
  "      select: { tokenVersion: true, bloqueado: true },",
  "    });",
  "    console.log(JSON.stringify(usuario));",
  "    return;",
  "  }",
  "  throw new Error('acao desconhecida: ' + acao);",
  "}",
  "",
  "main()",
  "  .catch((erro: unknown) => {",
  "    console.error(erro);",
  "    process.exitCode = 1;",
  "  })",
  "  .finally(() => { void db.$disconnect(); });",
  "",
].join("\n");

interface UsuarioDb {
  id: string;
  tokenVersion: number;
  bloqueado: boolean;
}

/** Roda o helper tsx e devolve o JSON da última linha do stdout. */
function rodarHelper(
  acao: "id" | "bloquear",
  vars: Record<string, string>,
): UsuarioDb | null {
  const saida = execSync(`npx tsx "${HELPER_PATH}" ${acao}`, {
    cwd: REPO_ROOT,
    encoding: "utf8",
    env: { ...process.env, ...vars },
    windowsHide: true,
  });
  const linha = saida.trim().split("\n").pop();
  if (linha === undefined) {
    throw new Error(`helper "${acao}" não produziu saída`);
  }
  return JSON.parse(linha) as UsuarioDb | null;
}

/** Reset idempotente: o upsert do seed restaura bloqueado=false e tokenVersion=0. */
function rodarSeed(): void {
  execSync("npm run db:seed", { cwd: REPO_ROOT, stdio: "inherit" });
}

let alunoId: string;

test.beforeAll(() => {
  mkdirSync(HELPER_DIR, { recursive: true });
  writeFileSync(HELPER_PATH, HELPER_SCRIPT, "utf8");
  rodarSeed(); // estado limpo garantido ANTES do fluxo (repetível no mesmo DB)
});

test.afterAll(() => {
  rodarSeed(); // restaura o aluno demo utilizável — outros specs nunca veem bloqueio
  rmSync(HELPER_DIR, { recursive: true, force: true });
});

test("bloqueio revoga sessão ativa e nega re-login (E2E-A1)", async ({
  page,
}) => {
  await test.step("localizar o aluno seed e conferir estado limpo", async () => {
    const aluno = rodarHelper("id", { ALUNO_EMAIL });
    expect(aluno).not.toBeNull();
    if (!aluno) throw new Error("seed não criou aluno@concursfoco.dev");
    alunoId = aluno.id;
    // Garantia do reset (seed roda em beforeAll): tokenVersion 0 e não bloqueado.
    expect(aluno.tokenVersion).toBe(0);
    expect(aluno.bloqueado).toBe(false);
  });

  await test.step("aluno loga via UI (sessão ACTIVE, tokenVersion 0)", async () => {
    await page.goto("/login");
    await page.fill("#login-email", ALUNO_EMAIL);
    await page.fill("#login-senha", ALUNO_SENHA);
    await page.getByRole("button", { name: "Entrar" }).click();
    await expect(page).toHaveURL(/\/app/);
    await expect(
      page.getByRole("heading", { name: /Olá,/ }),
    ).toBeVisible();
  });

  await test.step("admin bloqueia via service setBloqueado (US-20, sem UI)", async () => {
    // Chamada de serviço no setup do teste — o bump do tokenVersion É a
    // revogação (A3). Sem adminId no deps: o guard de self-block não se aplica.
    const estado = rodarHelper("bloquear", { ALUNO_ID: alunoId });
    expect(estado).not.toBeNull();
    if (!estado) throw new Error("estado do banco veio nulo após o bloqueio");
    // Assert de ESTADO REAL no banco (leitura fresca pós-update do service).
    expect(estado.tokenVersion).toBe(1); // bump = invalida o JWT antigo
    expect(estado.bloqueado).toBe(true);
    // Linha de evidência para o artefato (task-16).
    console.log(
      `[bloqueio.e2e] DB state após setBloqueado: tokenVersion=${estado.tokenVersion}, bloqueado=${estado.bloqueado}`,
    );
  });

  await test.step("próxima navegação: /app → /login (enforcement em NODE)", async () => {
    // O JWT do browser ainda é válido criptograficamente (não expirou): o
    // middleware (presença de JWT) PASSA; quem detecta o bump é o check em
    // Node do server component (verificarSessaoValida) e redireciona.
    await page.goto("/app");
    await expect(page).toHaveURL(/\/login/);
    // Prova de que é a página de login real, não um 404/redirect fantasma.
    await expect(
      page.getByRole("heading", { name: "Entrar" }),
    ).toBeVisible();
  });

  await test.step("re-login negado: 'conta suspensa' (UMA tentativa)", async () => {
    await page.fill("#login-email", ALUNO_EMAIL);
    await page.fill("#login-senha", ALUNO_SENHA);
    await page.getByRole("button", { name: "Entrar" }).click();
    // Exclui o route-announcer do Next (`__next-route-announcer__` tem
    // role="alert" e quebra o strict mode quando a hidratação está ativa).
    const alerta = page.locator('[role="alert"]:not(#__next-route-announcer__)');
    await expect(alerta).toBeVisible();
    await expect(alerta).toContainText("conta suspensa");
    // Sem segunda tentativa: contas bloqueadas não registram falha (D33), mas
    // o fluxo é de UMA tentativa — não acumular rate limit por IP.
    await expect(page).not.toHaveURL(/\/app/);
  });
});
