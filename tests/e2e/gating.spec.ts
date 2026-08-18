import { execSync } from "node:child_process";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { expect, test, type Page } from "@playwright/test";

const ROOT = process.cwd();
const DIR = join(ROOT, ".omo", "e2e-helper");
const HELPER = join(DIR, "gating.ts");
const RUN = `${Date.now()}-${crypto.randomUUID().slice(0, 8)}`;
const EMAIL = "aluno@concursfoco.dev";
const PASSWORD = "Aluno@1234";

type Course = { id: string; slug: string; materialIds: string[] };
type Fixture = { subscription: Course; purchase: Course; expired: Course; draft: Course; protected: Course; sample: Course; revocable: Course; progress: Course; r6: Course };

const SCRIPT = [
  'import "dotenv/config";',
  'import { db } from "../../src/lib/db";',
  'import { despublicarMaterial } from "../../src/services/conteudo/materiais";',
  'const run = process.env["RUN"] ?? "";',
  'async function main() {',
  '  if (process.argv[2] === "cleanup") { await db.entitlements.deleteMany({ where: { product: { nome: { contains: run } } } }); await db.products.deleteMany({ where: { nome: { contains: run } } }); for (const id of JSON.parse(process.env["COURSE_IDS"] ?? "[]")) await db.courses.delete({ where: { id } }); return; }',
  '  if (process.argv[2] === "unpublish") { await despublicarMaterial(process.env["MATERIAL_ID"] ?? ""); return; }',
  '  const user = await db.users.findUniqueOrThrow({ where: { email: "aluno@concursfoco.dev" } });',
  '  const made: string[] = [];',
  '  async function course(name: string, included: boolean, materials: Array<{ title: string; type?: "texto" | "video"; draft?: boolean; sample?: boolean }>) {',
  '    const c = await db.courses.create({ data: { nome: `${name} ${run}`, slug: `${name.toLowerCase()}-${run}`, incluido_assinatura: included } }); made.push(c.id);',
  '    const m = await db.modules.create({ data: { course_id: c.id, nome: `Módulo ${run}`, ordem: 1 } });',
  '    const rows = [];',
  '    for (let i = 0; i < materials.length; i++) { const item = materials[i]; rows.push(await db.materials.create({ data: { module_id: m.id, titulo: `${item.title} ${run}`, tipo: item.type ?? "texto", ordem: i + 1, status: item.draft ? "rascunho" : "publicado", publicado_em: item.draft ? null : new Date(), amostra: item.sample ?? false, conteudo_html: `<p>CONTEUDO_${name}_${run}_${i}</p>` } })); }',
  '    return { id: c.id, slug: c.slug, materialIds: rows.map((r) => r.id) };',
  '  }',
  '  const subscription = await course("e2e-subscription", true, [{ title: "Assinatura material" }]);',
  '  const subscriptionProduct = await db.products.create({ data: { tipo: "assinatura", nome: `Assinatura ${run}`, status: "ativo" } });',
  '  await db.entitlements.create({ data: { user_id: user.id, product_id: subscriptionProduct.id, origem: "pagamento", acesso_ate: new Date(Date.now() + 86400000) } });',
  '  const purchase = await course("e2e-purchase", false, [{ title: "Compra permanente" }]);',
  '  const purchaseProduct = await db.products.create({ data: { tipo: "venda_unica", nome: `Compra ${run}`, status: "ativo", curso_id: purchase.id } });',
  '  await db.entitlements.create({ data: { user_id: user.id, product_id: purchaseProduct.id, origem: "pagamento", acesso_ate: null } });',
  '  const expired = await course("e2e-expired", false, [{ title: "Assinatura expirada" }]);',
  '  const expiredProduct = await db.products.create({ data: { tipo: "assinatura", nome: `Expirada ${run}`, status: "ativo" } });',
  '  await db.entitlements.create({ data: { user_id: user.id, product_id: expiredProduct.id, origem: "pagamento", acesso_ate: new Date(Date.now() - 86400000) } });',
  '  const draft = await course("e2e-draft", false, [{ title: "Rascunho", draft: true }]);',
  '  const protectedCourse = await course("e2e-protected", false, [{ title: "Protegido" }]);',
  '  const sample = await course("e2e-sample", false, [{ title: "Amostra", sample: true }]);',
  '  const revocable = await course("e2e-revocable", true, [{ title: "Revogável" }]);',
  '  const revocableProduct = await db.products.create({ data: { tipo: "assinatura", nome: `Revogável ${run}`, status: "ativo" } });',
  '  await db.entitlements.create({ data: { user_id: user.id, product_id: revocableProduct.id, origem: "pagamento", acesso_ate: new Date(Date.now() + 86400000) } });',
  '  const progress = await course("e2e-progress", true, [{ title: "Progresso 1" }, { title: "Progresso 2", type: "video" }, { title: "Progresso 3" }, { title: "Progresso 4" }]);',
  '  const r6Course = await db.courses.create({ data: { nome: `e2e-r6 ${run}`, slug: `e2e-r6-${run}`, incluido_assinatura: false } }); made.push(r6Course.id);',
  '  const r6Later = await db.modules.create({ data: { course_id: r6Course.id, nome: `R6 módulo posterior ${run}`, ordem: 20 } });',
  '  const r6Earlier = await db.modules.create({ data: { course_id: r6Course.id, nome: `R6 módulo anterior ${run}`, ordem: 5 } });',
  '  for (const item of [{ module_id: r6Later.id, title: "R6 material 30", order: 30 }, { module_id: r6Later.id, title: "R6 material 10", order: 10 }, { module_id: r6Later.id, title: "R6 material 20", order: 20 }, { module_id: r6Earlier.id, title: "R6 material 2", order: 2 }, { module_id: r6Earlier.id, title: "R6 material 1", order: 1 }]) await db.materials.create({ data: { module_id: item.module_id, titulo: `${item.title} ${run}`, tipo: "texto", ordem: item.order, status: "publicado", publicado_em: new Date(), amostra: false, conteudo_html: `<p>R6_${item.title}_${run}</p>` } });',
  '  console.log(JSON.stringify({ subscription, purchase, expired, draft, protected: protectedCourse, sample, revocable, progress, r6: { id: r6Course.id, slug: r6Course.slug, materialIds: [] }, courseIds: made }));',
  '}',
  'main().catch((e) => { console.error(e); process.exitCode = 1; }).finally(() => { void db.$disconnect(); });',
].join("\n");

let fixture: Fixture;
function helper(action: "create" | "cleanup" | "unpublish", materialId?: string): Fixture | null {
  const output = execSync(`npx tsx "${HELPER}" ${action}`, { cwd: ROOT, encoding: "utf8", env: { ...process.env, RUN, MATERIAL_ID: materialId, COURSE_IDS: JSON.stringify(fixture?.subscription ? [fixture.subscription.id, fixture.purchase.id, fixture.expired.id, fixture.draft.id, fixture.protected.id, fixture.sample.id, fixture.revocable.id, fixture.progress.id, fixture.r6.id] : []) }, windowsHide: true });
  if (action !== "create") return null;
  return JSON.parse(output.trim().split("\n").pop() ?? "") as Fixture;
}

async function login(page: Page): Promise<void> {
  await page.goto("/login");
  await page.fill("#login-email", EMAIL);
  await page.fill("#login-senha", PASSWORD);
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page).toHaveURL(/\/app/);
}

test.beforeAll(() => { mkdirSync(DIR, { recursive: true }); writeFileSync(HELPER, SCRIPT, "utf8"); execSync("npm run db:seed", { cwd: ROOT, stdio: "inherit" }); fixture = helper("create") as Fixture; });
test.afterAll(() => { try { helper("cleanup"); } finally { execSync("npm run db:seed", { cwd: ROOT, stdio: "inherit" }); rmSync(DIR, { recursive: true, force: true }); } });

test("E2E-1 assinatura ativa libera conteúdo", async ({ page }) => {
  await login(page); await page.goto(`/app/cursos/${fixture.subscription.slug}`);
  await expect(page.getByTestId(`material-${fixture.subscription.materialIds[0]}`)).toBeVisible();
  await page.goto(`/app/cursos/${fixture.subscription.slug}/materiais/${fixture.subscription.materialIds[0]}`);
  await expect(page.locator("#material-conteudo")).toContainText("CONTEUDO_e2e-subscription");
});

test("E2E-2 venda única permanece após expiração da assinatura", async ({ page }) => {
  await login(page); await page.goto(`/app/cursos/${fixture.purchase.slug}/materiais/${fixture.purchase.materialIds[0]}`);
  await expect(page.locator("#material-conteudo")).toContainText("CONTEUDO_e2e-purchase");
  await page.goto(`/app/cursos/${fixture.expired.slug}/materiais/${fixture.expired.materialIds[0]}`);
  await expect(page.getByTestId(`bloqueado-${fixture.expired.materialIds[0]}`)).toBeVisible();
});

test("E2E-3 rascunho não aparece", async ({ page }) => {
  await login(page); await page.goto(`/app/cursos/${fixture.draft.slug}`);
  await expect(page.getByText(`Rascunho ${RUN}`, { exact: true })).toHaveCount(0);
});

test("E2E-4 bloqueio não envia conteúdo (R12)", async ({ page }) => {
  await login(page); await page.goto(`/app/cursos/${fixture.protected.slug}/materiais/${fixture.protected.materialIds[0]}`);
  await expect(page.getByTestId(`bloqueado-${fixture.protected.materialIds[0]}`)).toBeVisible();
  await expect(page.locator("#material-conteudo")).toHaveCount(0);
  expect(await page.content()).not.toContain(`CONTEUDO_e2e-protected_${RUN}`);
});

test("E2E-R4 amostra publicada libera sem entitlement", async ({ page }) => {
  await login(page); await page.goto(`/app/cursos/${fixture.sample.slug}/materiais/${fixture.sample.materialIds[0]}`);
  await expect(page.locator("#material-conteudo")).toContainText("CONTEUDO_e2e-sample");
});

test("E2E-R5 despublicação bloqueia imediatamente", async ({ page }) => {
  await login(page); await page.goto(`/app/cursos/${fixture.revocable.slug}/materiais/${fixture.revocable.materialIds[0]}`);
  await expect(page.locator("#material-conteudo")).toContainText("CONTEUDO_e2e-revocable");
  helper("unpublish", fixture.revocable.materialIds[0]);
  await page.reload();
  await expect(page.getByTestId(`bloqueado-${fixture.revocable.materialIds[0]}`)).toBeVisible();
  await expect(page.locator("#material-conteudo")).toHaveCount(0);
});

test("E2E-7 progresso recalcula", async ({ page }) => {
  await login(page);
  for (const id of fixture.progress.materialIds.slice(0, 2)) { await page.goto(`/app/cursos/${fixture.progress.slug}/materiais/${id}`); await page.getByRole("button", { name: "Marcar como concluído" }).click(); await page.waitForLoadState("networkidle"); }
  await page.goto(`/app/cursos/${fixture.progress.slug}`);
  await expect(page.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "50");
});

test("E2E-R6 módulos e materiais são renderizados por ordem", async ({ page }) => {
  await login(page);
  await page.goto(`/app/cursos/${fixture.r6.slug}`);

  await expect(page.locator("h2")).toHaveText([
    `R6 módulo anterior ${RUN}`,
    `R6 módulo posterior ${RUN}`,
  ]);

  const sections = page.locator("section");
  await expect(sections.nth(0).locator("[aria-label^=\"Material bloqueado:\"]").first()).toHaveAttribute("aria-label", `Material bloqueado: R6 material 1 ${RUN}`);
  await expect(sections.nth(0).locator("[aria-label^=\"Material bloqueado:\"]").nth(1)).toHaveAttribute("aria-label", `Material bloqueado: R6 material 2 ${RUN}`);
  await expect(sections.nth(1).locator("[aria-label^=\"Material bloqueado:\"]").first()).toHaveAttribute("aria-label", `Material bloqueado: R6 material 10 ${RUN}`);
  await expect(sections.nth(1).locator("[aria-label^=\"Material bloqueado:\"]").nth(1)).toHaveAttribute("aria-label", `Material bloqueado: R6 material 20 ${RUN}`);
  await expect(sections.nth(1).locator("[aria-label^=\"Material bloqueado:\"]").nth(2)).toHaveAttribute("aria-label", `Material bloqueado: R6 material 30 ${RUN}`);
});
