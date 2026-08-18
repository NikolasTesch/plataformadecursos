import { execSync } from "node:child_process";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { expect, test, type Page } from "@playwright/test";

const ROOT = process.cwd(); const DIR = join(ROOT, ".omo", "e2e-helper"); const HELPER = join(DIR, "aluno.ts"); const RUN = `${Date.now()}-${crypto.randomUUID().slice(0, 8)}`;
type Fixture = { al1: { id: string; slug: string; materialIds: string[] }; al2: { id: string; slug: string; materialIds: string[] } };
let fixture: Fixture;
const SCRIPT = [
  'import "dotenv/config";', 'import { db } from "../../src/lib/db";',
  'async function main() {', '  const user = await db.users.findUniqueOrThrow({ where: { email: "aluno@concursfoco.dev" } });',
  '  if (process.argv[2] === "cleanup") { const ids = JSON.parse(process.env["COURSE_IDS"] ?? "[]"); await db.certificates.deleteMany({ where: { course_id: { in: ids } } }); await db.entitlements.deleteMany({ where: { product: { nome: { contains: process.env["RUN"] ?? "" } } } }); await db.products.deleteMany({ where: { nome: { contains: process.env["RUN"] ?? "" } } }); for (const id of ids) await db.courses.delete({ where: { id } }); return; }',
  '  async function make(name: string, count: number, samples: number) { const c = await db.courses.create({ data: { nome: `${name} ${process.env["RUN"]}`, slug: `${name.toLowerCase().replaceAll(" ", "-")}-${process.env["RUN"]}`, incluido_assinatura: false } }); const m = await db.modules.create({ data: { course_id: c.id, nome: "Módulo AL", ordem: 1 } }); const rows = []; for (let i = 0; i < count; i++) rows.push(await db.materials.create({ data: { module_id: m.id, titulo: `AL material ${i + 1} ${process.env["RUN"]}`, tipo: "texto", ordem: i + 1, status: "publicado", publicado_em: new Date(), amostra: i < samples, conteudo_html: `<p>AL_CONTEUDO_${i + 1}</p>` } })); return { id: c.id, slug: c.slug, materialIds: rows.map((r) => r.id) }; }',
  '  const al1 = await make("AL1 E2E", 5, 3); const al2 = await make("AL2 E2E", 9, 0); const p = await db.products.create({ data: { tipo: "venda_unica", nome: `AL produto ${process.env["RUN"]}`, status: "ativo", curso_id: al2.id } }); await db.entitlements.create({ data: { user_id: user.id, product_id: p.id, origem: "admin", acesso_ate: null } }); for (const id of al2.materialIds.slice(0, 8)) await db.user_progress.create({ data: { user_id: user.id, material_id: id, concluido: true, concluido_em: new Date() } });',
  '  console.log(JSON.stringify({ al1, al2, courseIds: [al1.id, al2.id] }));', '}',
  'main().catch((e) => { console.error(e); process.exitCode = 1; }).finally(() => { void db.$disconnect(); });',
].join("\n");
function helper(action: "create" | "cleanup"): Fixture | null { const out = execSync(`npx tsx "${HELPER}" ${action}`, { cwd: ROOT, encoding: "utf8", env: { ...process.env, RUN, COURSE_IDS: JSON.stringify(fixture ? [fixture.al1.id, fixture.al2.id] : []) }, windowsHide: true }); if (action === "cleanup") return null; return JSON.parse(out.trim().split("\n").pop() ?? "") as Fixture; }
async function login(page: Page): Promise<void> { await page.goto("/login"); await page.fill("#login-email", "aluno@concursfoco.dev"); await page.fill("#login-senha", "Aluno@1234"); await page.getByRole("button", { name: "Entrar" }).click(); await expect(page).toHaveURL(/\/app/); }
test.beforeAll(() => { mkdirSync(DIR, { recursive: true }); writeFileSync(HELPER, SCRIPT, "utf8"); execSync("npm run db:seed", { cwd: ROOT, stdio: "inherit" }); fixture = helper("create") as Fixture; });
test.afterAll(() => { try { helper("cleanup"); } finally { execSync("npm run db:seed", { cwd: ROOT, stdio: "inherit" }); rmSync(DIR, { recursive: true, force: true }); } });

test("E2E cursos renderiza listagem ou estado vazio", async ({ page }) => {
  await login(page); await page.goto("/app/cursos");
  await expect(page.getByRole("heading", { name: "Cursos" })).toBeVisible();
  await expect(page.locator('[data-testid^="curso-card-"]').or(page.getByText("nenhum curso publicado ainda", { exact: true })).first()).toBeVisible();
});

test("E2E-AL1 progresso ignora bloqueados", async ({ page }) => {
  await login(page); await page.goto(`/app/cursos/${fixture.al1.slug}`);
  await expect(page.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "0");
  await page.goto(`/app/cursos/${fixture.al1.slug}/materiais/${fixture.al1.materialIds[0]}`);
  await page.getByRole("button", { name: "Marcar como concluído" }).click(); await page.waitForLoadState("networkidle");
  await page.goto(`/app/cursos/${fixture.al1.slug}`); await expect(page.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "33");
});

test("E2E-AL2 certificado exige 100% e permite verificação pública", async ({ page }) => {
  await login(page); await page.goto(`/app/cursos/${fixture.al2.slug}`);
  await expect(page.getByRole("button", { name: "Emitir certificado" })).toHaveCount(0);
  await page.goto(`/app/cursos/${fixture.al2.slug}/materiais/${fixture.al2.materialIds[8]}`); await page.getByRole("button", { name: "Marcar como concluído" }).click(); await page.waitForLoadState("networkidle");
  await page.goto(`/app/cursos/${fixture.al2.slug}`); await page.getByRole("button", { name: "Emitir certificado" }).click();
  await expect(page).toHaveURL(/\/verificar\/[A-Za-z0-9_-]+/); await expect(page.getByText("Certificado válido")).toBeVisible(); await expect(page.getByText(new RegExp(`AL2 E2E ${RUN}`))).toBeVisible();
});
