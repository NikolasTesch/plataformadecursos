import { execSync } from "node:child_process";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { expect, test, type Locator, type Page } from "@playwright/test";

const ROOT = process.cwd();
const HELPER_DIR = join(ROOT, ".omo", "e2e-helper");
const HELPER = join(HELPER_DIR, "questoes.ts");
const RUN = `${Date.now()}-${crypto.randomUUID().slice(0, 8)}`;
const STUDENT = "aluno@concursfoco.dev";
const PASSWORD = "Aluno@1234";

type Fixture = { courseId: string; blockedCourseId: string; materialId: string; blockedMaterialId: string; questionIds: string[] };

const SCRIPT = [
  'import "dotenv/config";',
  'import { db } from "../../src/lib/db";',
  'import { iniciarSessaoProva, responderEmProva, entregarSessaoProva } from "../../src/services/questoes/modo";',
  'import { listarErros } from "../../src/services/questoes/erros";',
  'const run = process.env["RUN"] ?? "";',
  'async function main() {',
  '  const action = process.argv[2] ?? "";',
  '  const ids = JSON.parse(process.env["QUESTION_IDS"] ?? "[]") as string[];',
  '  if (action === "reset") { await db.attempts.deleteMany({ where: { question_id: { in: ids } } }); await db.favorites.deleteMany({ where: { question_id: { in: ids } } }); return; }',
  '  if (action === "count") { const user = await db.users.findUniqueOrThrow({ where: { email: "aluno@concursfoco.dev" } }); console.log(JSON.stringify({ count: await db.attempts.count({ where: { user_id: user.id, question_id: ids[0] } }), simuladoAttempts: await db.simulado_attempts.count({ where: { user_id: user.id } }) })); return; }',
  '  if (action === "errors") { const user = await db.users.findUniqueOrThrow({ where: { email: "aluno@concursfoco.dev" } }); const errors = await listarErros(user.id); console.log(JSON.stringify({ count: errors.filter((item) => ids.includes(item.question_id)).length })); return; }',
  '  if (action === "auto") { const user = await db.users.findUniqueOrThrow({ where: { email: "aluno@concursfoco.dev" } }); const session = await iniciarSessaoProva(process.env["MATERIAL_ID"] ?? "", user.id); responderEmProva(session.id, user.id, ids[0] ?? "", "B"); responderEmProva(session.id, user.id, ids[1] ?? "", "A"); const result = await entregarSessaoProva(session.id, user.id); console.log(JSON.stringify({ total: result.total, respondidas: result.resultados.filter((item) => item.resposta !== null).length, simuladoAttempts: await db.simulado_attempts.count({ where: { user_id: user.id } }) })); return; }',
  '  if (action === "create") {',
  '    const course = await db.courses.create({ data: { nome: `E2E Questões ${run}`, slug: `e2e-questoes-${run}`, incluido_assinatura: true } });',
  '    const blocked = await db.courses.create({ data: { nome: `E2E Questões Bloqueado ${run}`, slug: `e2e-questoes-bloqueado-${run}`, incluido_assinatura: false } });',
  '    const module = await db.modules.create({ data: { course_id: course.id, nome: `Módulo ${run}`, ordem: 1 } });',
  '    const blockedModule = await db.modules.create({ data: { course_id: blocked.id, nome: `Módulo bloqueado ${run}`, ordem: 1 } });',
  '    const material = await db.materials.create({ data: { module_id: module.id, titulo: `Bloco E2E ${run}`, tipo: "questoes", ordem: 1, status: "publicado", publicado_em: new Date(), amostra: false } });',
  '    const blockedMaterial = await db.materials.create({ data: { module_id: blockedModule.id, titulo: `Bloco bloqueado ${run}`, tipo: "questoes", ordem: 1, status: "publicado", publicado_em: new Date(), amostra: false } });',
  '    const alternativas = [{ letra: "A", texto: "Alternativa A" }, { letra: "B", texto: "Alternativa B" }, { letra: "C", texto: "Alternativa C" }, { letra: "D", texto: "Alternativa D" }];',
  '    const questions = []; for (let i = 0; i < 5; i++) questions.push(await db.questions.create({ data: { material_id: material.id, enunciado: `Enunciado E2E ${i + 1} ${run}`, alternativas, gabarito: i === 0 ? "B" : "A", comentario_html: `<strong>COMENTARIO_E2E_${i + 1}_${run}</strong>`, ordem: i + 1 } }));',
  '    const product = await db.products.create({ data: { nome: `Assinatura E2E Questões ${run}`, tipo: "assinatura", status: "ativo" } }); const user = await db.users.findUniqueOrThrow({ where: { email: "aluno@concursfoco.dev" } }); await db.entitlements.create({ data: { user_id: user.id, product_id: product.id, origem: "pagamento", acesso_ate: new Date(Date.now() + 86400000) } });',
  '    console.log(JSON.stringify({ courseId: course.id, blockedCourseId: blocked.id, materialId: material.id, blockedMaterialId: blockedMaterial.id, questionIds: questions.map((q) => q.id) })); return;',
  '  }',
  '  if (action === "cleanup") { await db.entitlements.deleteMany({ where: { product: { nome: { contains: run } } } }); await db.products.deleteMany({ where: { nome: { contains: run } } }); for (const id of JSON.parse(process.env["COURSE_IDS"] ?? "[]") as string[]) await db.courses.delete({ where: { id } }); return; }',
  '  throw new Error(`ação desconhecida: ${action}`);',
  '}',
  'main().catch((error) => { console.error(error); process.exitCode = 1; }).finally(() => { void db.$disconnect(); });',
].join("\n");

let fixture: Fixture;

function helper(action: "create" | "reset" | "count" | "errors" | "auto" | "cleanup"): Fixture | Record<string, number> | null {
  const output = execSync(`npx tsx "${HELPER}" ${action}`, { cwd: ROOT, encoding: "utf8", windowsHide: true, env: { ...process.env, RUN, MATERIAL_ID: fixture?.materialId ?? "", QUESTION_IDS: JSON.stringify(fixture?.questionIds ?? []), COURSE_IDS: JSON.stringify([fixture?.courseId, fixture?.blockedCourseId].filter(Boolean)) } });
  if (action === "cleanup" || action === "reset") return null;
  return JSON.parse(output.trim().split("\n").pop() ?? "") as Fixture | Record<string, number>;
}

async function login(page: Page): Promise<void> {
  await page.goto("/login"); await page.fill("#login-email", STUDENT); await page.fill("#login-senha", PASSWORD); await page.getByRole("button", { name: "Entrar" }).click(); await expect(page).toHaveURL(/\/app/);
}

function question(page: Page, index: number): Locator { return page.locator("article").nth(index); }
async function answer(page: Page, index: number, letter: string): Promise<void> { const card = question(page, index); await card.locator(`input[value="${letter}"]`).check(); await card.getByRole("button", { name: "Responder" }).click(); }

test.beforeAll(() => { mkdirSync(HELPER_DIR, { recursive: true }); writeFileSync(HELPER, SCRIPT, "utf8"); execSync("npm run db:seed", { cwd: ROOT, stdio: "inherit" }); fixture = helper("create") as Fixture; });
test.afterEach(() => { helper("reset"); });
test.afterAll(() => { try { helper("cleanup"); } finally { execSync("npm run db:seed", { cwd: ROOT, stdio: "inherit" }); rmSync(HELPER_DIR, { recursive: true, force: true }); } });

test("smoke autenticado renderiza o índice de questões", async ({ page }) => {
  await login(page);
  await page.goto("/app/questoes");
  await expect(page.getByRole("heading", { name: "Questões" })).toBeVisible();
  await expect(page.getByText("Carregando sua área de estudos…", { exact: true })).toHaveCount(0);
  await expect(page.locator(`a[href="/app/questoes/${fixture.materialId}"]`).or(page.getByText("Nenhum bloco publicado.", { exact: true })).first()).toBeVisible();
});

test("E2E-Q1 estudo mostra feedback, gabarito e comentário somente após responder", async ({ page }) => {
  await login(page); await page.goto(`/app/questoes/${fixture.materialId}`);
  await expect(page.getByText("COMENTARIO_E2E_1")).toHaveCount(0);
  await answer(page, 0, "C");
  await expect(question(page, 0)).toContainText("Resposta incorreta — gabarito: B");
  await expect(question(page, 0)).toContainText("COMENTARIO_E2E_1");
});

test("E2E-Q2 entrega ad-hoc adaptada corrige respostas parciais sem simulado persistente", async () => {
  const result = helper("auto") as Record<string, number>;
  expect(result.total).toBe(5); expect(result.respondidas).toBe(2); expect(result.simuladoAttempts).toBe(0);
});

test("E2E-Q3 tentativas cumulativas permanecem no histórico do banco", async ({ page }) => {
  await login(page); await page.goto(`/app/questoes/${fixture.materialId}`); await answer(page, 0, "C");
  await page.goto(`/app/questoes/${fixture.materialId}`); await answer(page, 0, "B");
  const result = helper("count") as Record<string, number>; expect(result.count).toBe(2);
});

test("E2E-Q4 banco de erros remove questão após dois acertos consecutivos", async ({ page }) => {
  await login(page); await page.goto(`/app/questoes/${fixture.materialId}`); await answer(page, 0, "C");
  expect((helper("errors") as Record<string, number>).count).toBe(1);
  await page.goto(`/app/questoes/${fixture.materialId}`); await answer(page, 0, "B"); await page.waitForTimeout(25);
  await page.goto(`/app/questoes/${fixture.materialId}`); await answer(page, 0, "B"); await page.waitForTimeout(25);
  expect((helper("errors") as Record<string, number>).count).toBe(0);
});

test("E2E-Q5 modo prova corrige em lote 3 respondidas e 2 não respondidas", async ({ page }) => {
  await login(page); await page.goto(`/app/questoes/${fixture.materialId}`); await page.getByRole("button", { name: "Iniciar prova" }).click();
  await expect(page.getByText(/COMENTARIO_E2E/)).toHaveCount(0);
  for (const [index, letter] of [[0, "B"], [1, "A"], [2, "C"]] as const) { const card = question(page, index); await card.locator(`input[value="${letter}"]`).check(); await card.getByRole("button", { name: "Salvar resposta" }).click(); }
  await page.getByRole("button", { name: "Entregar prova" }).click();
  await expect(page.getByText("Resultado: 2/5 acertos.", { exact: true })).toBeVisible();
  await expect(page.getByText("COMENTARIO_E2E_1")).toBeVisible(); await expect(page.getByText("COMENTARIO_E2E_5")).toBeVisible();
});

test("gating bloqueia bloco sem entitlement e não entrega enunciados", async ({ page }) => {
  await login(page); await page.goto(`/app/questoes/${fixture.blockedMaterialId}`);
  await expect(page.getByTestId(/bloqueado-/)).toBeVisible(); await expect(page.getByText("Enunciado E2E")).toHaveCount(0);
});
