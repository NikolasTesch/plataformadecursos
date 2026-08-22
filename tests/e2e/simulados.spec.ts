import { execSync } from "node:child_process";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { expect, test, type Page } from "@playwright/test";

const ROOT = process.cwd();
const HELPER_DIR = join(ROOT, ".omo", "e2e-helper");
const HELPER = join(HELPER_DIR, "simulados.ts");
const RUN = `${Date.now()}-${crypto.randomUUID().slice(0, 8)}`;
const STUDENT = "aluno@concursfoco.dev";
const PASSWORD = "Aluno@1234";

type Fixture = { courseId: string; moduleId: string; materialId: string; simuladoId: string; simuladoCurtoId: string; questionIds: string[] };

// Helper ESM gerado em .omo/e2e-helper (gitignored) — mesmo padrão de questoes.spec.ts.
// Setup de dados (curso+entitlement, bloco de questões, simulado publicado) usa o
// helper; o fluxo de prova é 100% UI. Não acessa services como substituto do fluxo.
const SCRIPT = [
  'import "dotenv/config";',
  'import { db } from "../../src/lib/db";',
  'import { criarSimulado, adicionarQuestoes, publicarSimulado } from "../../src/services/simulados";',
  'const run = process.env["RUN"] ?? "";',
  'async function main() {',
  '  const action = process.argv[2] ?? "";',
  '  const user = await db.users.findUniqueOrThrow({ where: { email: "aluno@concursfoco.dev" } });',
  '  if (action === "cleanup") {',
  '    const simuladoIds = JSON.parse(process.env["SIMULADO_IDS"] ?? "[]") as string[];',
  '    const questionIds = JSON.parse(process.env["QUESTION_IDS"] ?? "[]") as string[];',
  '    const courseIds = JSON.parse(process.env["COURSE_IDS"] ?? "[]") as string[];',
  '    const materialIds = JSON.parse(process.env["MATERIAL_IDS"] ?? "[]") as string[];',
  '    const moduleIds = JSON.parse(process.env["MODULE_IDS"] ?? "[]") as string[];',
  '    for (const id of simuladoIds) { await db.simulado_attempts.deleteMany({ where: { simulado_id: id } }); await db.simulado_questions.deleteMany({ where: { simulado_id: id } }); await db.simulados.delete({ where: { id } }); }',
  '    if (questionIds.length) { await db.attempts.deleteMany({ where: { question_id: { in: questionIds } } }); await db.questions.deleteMany({ where: { id: { in: questionIds } } }); }',
  '    if (materialIds.length) await db.materials.deleteMany({ where: { id: { in: materialIds } } });',
  '    if (moduleIds.length) await db.modules.deleteMany({ where: { id: { in: moduleIds } } });',
  '    await db.entitlements.deleteMany({ where: { product: { nome: { contains: run } } } });',
  '    await db.products.deleteMany({ where: { nome: { contains: run } } });',
  '    for (const id of courseIds) await db.courses.delete({ where: { id } });',
  '    return;',
  '  }',
  '  if (action === "create") {',
  '    const course = await db.courses.create({ data: { nome: `E2E Simulado ${run}`, slug: `e2e-simulado-${run}`, incluido_assinatura: true } });',
  '    const module = await db.modules.create({ data: { course_id: course.id, nome: `Módulo ${run}`, ordem: 1 } });',
  '    const material = await db.materials.create({ data: { module_id: module.id, titulo: `Bloco Simulado ${run}`, tipo: "questoes", ordem: 1, status: "publicado", publicado_em: new Date(), amostra: false } });',
  '    const alternativas = [{ letra: "A", texto: "A" }, { letra: "B", texto: "B" }, { letra: "C", texto: "C" }, { letra: "D", texto: "D" }];',
  '    const gabaritos = ["A", "B", "C", "D", "A"];',
  '    const questions = [];',
  '    for (let i = 0; i < 5; i++) questions.push(await db.questions.create({ data: { material_id: material.id, enunciado: `Enunciado Simulado ${i + 1} ${run}`, alternativas, gabarito: gabaritos[i], comentario_html: `<strong>COMENTARIO_SIM_${i + 1}_${run}</strong>`, ordem: i + 1 } }));',
  '    const simulado = await criarSimulado(course.id, { titulo: `Simulado E2E ${run}`, instrucoes: "Instruções E2E", duracao_minutos: 10 });',
  '    const simuladoCurto = await criarSimulado(course.id, { titulo: `Simulado Curto E2E ${run}`, instrucoes: "Instruções E2E", duracao_minutos: 1 });',
  '    await adicionarQuestoes(simulado.id, questions.map((q) => q.id));',
  '    await adicionarQuestoes(simuladoCurto.id, questions.map((q) => q.id));',
  '    await publicarSimulado(simulado.id);',
  '    await publicarSimulado(simuladoCurto.id);',
  '    const product = await db.products.create({ data: { nome: `Assinatura E2E Simulado ${run}`, tipo: "assinatura", status: "ativo" } });',
  '    await db.entitlements.create({ data: { user_id: user.id, product_id: product.id, origem: "pagamento", acesso_ate: new Date(Date.now() + 86400000) } });',
  '    console.log(JSON.stringify({ courseId: course.id, moduleId: module.id, materialId: material.id, simuladoId: simulado.id, simuladoCurtoId: simuladoCurto.id, questionIds: questions.map((q) => q.id) }));',
  '    return;',
  '  }',
  '  throw new Error(`ação desconhecida: ${action}`);',
  '}',
  'main().catch((error) => { console.error(error); process.exitCode = 1; }).finally(() => { void db.$disconnect(); });',
].join("\n");

let fixture: Fixture;

function runHelper(action: "create" | "cleanup"): Fixture | null {
  const output = execSync(`npx tsx "${HELPER}" ${action}`, {
    cwd: ROOT,
    encoding: "utf8",
    windowsHide: true,
    env: {
      ...process.env,
      RUN,
      SIMULADO_IDS: JSON.stringify([fixture?.simuladoId, fixture?.simuladoCurtoId].filter(Boolean)),
      QUESTION_IDS: JSON.stringify(fixture?.questionIds ?? []),
      COURSE_IDS: JSON.stringify([fixture?.courseId].filter(Boolean)),
      MATERIAL_IDS: JSON.stringify([fixture?.materialId].filter(Boolean)),
      MODULE_IDS: JSON.stringify([fixture?.moduleId].filter(Boolean)),
    },
  });
  if (action === "cleanup") return null;
  return JSON.parse(output.trim().split("\n").pop() ?? "") as Fixture;
}

async function login(page: Page): Promise<void> {
  await page.goto("/login");
  await page.fill("#login-email", STUDENT);
  await page.fill("#login-senha", PASSWORD);
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page).toHaveURL(/\/app/);
}

async function iniciar(page: Page, simuladoId: string): Promise<void> {
  await page.goto(`/app/simulados/${simuladoId}`);
  await page.getByTestId("iniciar-simulado").click();
  await expect(page.getByTestId("tentativa-simulado")).toBeVisible();
}

async function answer(page: Page, index: number, letter: string): Promise<void> {
  const fieldset = page.locator("fieldset").nth(index);
  const b = fieldset.locator("b", { hasText: new RegExp(`^${letter}$`) });
  const label = b.locator("xpath=ancestor::label");
  await label.locator("input").check();
  await page.waitForTimeout(500);
}

test.beforeAll(() => {
  mkdirSync(HELPER_DIR, { recursive: true });
  writeFileSync(HELPER, SCRIPT, "utf8");
  execSync("npm run db:seed", { cwd: ROOT, stdio: "inherit" });
  fixture = runHelper("create") as Fixture;
});
test.afterAll(() => {
  try {
    runHelper("cleanup");
  } finally {
    execSync("npm run db:seed", { cwd: ROOT, stdio: "inherit" });
    rmSync(HELPER_DIR, { recursive: true, force: true });
  }
});

test("smoke lista simulados publicados e abre o detalhe", async ({ page }) => {
  await login(page);
  await page.goto("/app/simulados");
  await expect(page.getByRole("heading", { name: "Simulados" })).toBeVisible();
  await expect(page.locator(`a[href="/app/simulados/${fixture.simuladoId}"]`)).toBeVisible();
});

test("E2E-Q2 entrega manual produz correção com respostas parciais (sem scheduler)", async ({ page }) => {
  await login(page);
  await iniciar(page, fixture.simuladoId);
  await answer(page, 0, "A"); // gabarito A -> correta
  await answer(page, 1, "B"); // gabarito B -> correta
  await page.getByRole("button", { name: "Entregar" }).click();
  const correcao = page.getByTestId("correcao-simulado");
  await expect(correcao).toBeVisible();
  await expect(correcao).toContainText("40%"); // 2/5 acertos
  await expect(correcao).toContainText("Não respondida"); // 3 não respondidas contam como erro
});

test("E2E-Q2 cronômetro zerado entrega automaticamente com respostas parciais (sem scheduler)", async ({ page }) => {
  test.setTimeout(180_000);
  await login(page);
  await iniciar(page, fixture.simuladoCurtoId); // duração 1 minuto
  await answer(page, 0, "A"); // correta
  await answer(page, 1, "B"); // correta
  const correcao = page.getByTestId("correcao-simulado");
  // Sem depender de scheduler: o timer do cliente zera e dispara a entrega automática.
  await expect(correcao).toBeVisible({ timeout: 100_000 });
  await expect(correcao).toContainText("40%");
  await expect(correcao).toContainText("Não respondida");
});

test("E2E-Q3 duas tentativas aparecem no histórico sem sobrescrita", async ({ page }) => {
  await login(page);
  // 1ª tentativa: 1/5
  await iniciar(page, fixture.simuladoId);
  await answer(page, 0, "A");
  await page.getByRole("button", { name: "Entregar" }).click();
  await expect(page.getByTestId("correcao-simulado")).toBeVisible();
  // 2ª tentativa: nova tentativa, não sobrescreve a anterior
  await page.goto(`/app/simulados/${fixture.simuladoId}`);
  await page.getByTestId("iniciar-simulado").click();
  await expect(page.getByTestId("tentativa-simulado")).toBeVisible();
  await answer(page, 0, "B"); // errada
  await page.getByRole("button", { name: "Entregar" }).click();
  await expect(page.getByTestId("correcao-simulado")).toBeVisible();
  // histórico acumulado
  await page.goto(`/app/simulados/${fixture.simuladoId}`);
  await expect(page.getByTestId("tentativa-historico")).toHaveCount(2);
});
