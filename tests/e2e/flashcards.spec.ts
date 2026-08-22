import { execSync } from "node:child_process";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { expect, test, type Page } from "@playwright/test";

const ROOT = process.cwd();
const HELPER_DIR = join(ROOT, ".omo", "e2e-helper");
const HELPER = join(HELPER_DIR, "flashcards.ts");
const RUN = `${Date.now()}-${crypto.randomUUID().slice(0, 8)}`;
const STUDENT = "aluno@concursfoco.dev";
const PASSWORD = "Aluno@1234";

type Fixture = {
  flashcardIds: string[];
  perguntas: string[];
  courseId: string;
  moduleId: string;
  materialId: string;
  questionIds: string[];
  enunciados: string[];
  comentarios: string[];
};

// Helper ESM gerado em .omo/e2e-helper (gitignored). Setup de dados usa o padrão do
// repo: curso+entitlement, bloco de questões, erros reais do aluno (via `responder`)
// e cartões diretos para F1/F2. O fluxo de sugestão/confirmação/descarte é 100% UI.
const SCRIPT = [
  'import "dotenv/config";',
  'import { db } from "../../src/lib/db";',
  'import { responder } from "../../src/services/questoes/resposta";',
  'const run = process.env["RUN"] ?? "";',
  'async function main() {',
  '  const action = process.argv[2] ?? "";',
  '  const user = await db.users.findUniqueOrThrow({ where: { email: "aluno@concursfoco.dev" } });',
  '  if (action === "cleanup") {',
  '    const ids = JSON.parse(process.env["FLASHCARD_IDS"] ?? "[]") as string[];',
  '    if (ids.length) await db.flashcards.deleteMany({ where: { id: { in: ids } } });',
  '    await db.flashcards.deleteMany({ where: { pergunta: { contains: run } } });',
  '    const questionIds = JSON.parse(process.env["QUESTION_IDS"] ?? "[]") as string[];',
  '    if (questionIds.length) {',
  '      await db.attempts.deleteMany({ where: { question_id: { in: questionIds }, user_id: user.id } });',
  '      await db.questions.deleteMany({ where: { id: { in: questionIds } } });',
  '    }',
  '    const materialIds = JSON.parse(process.env["MATERIAL_IDS"] ?? "[]") as string[];',
  '    if (materialIds.length) await db.materials.deleteMany({ where: { id: { in: materialIds } } });',
  '    const moduleIds = JSON.parse(process.env["MODULE_IDS"] ?? "[]") as string[];',
  '    if (moduleIds.length) await db.modules.deleteMany({ where: { id: { in: moduleIds } } });',
  '    await db.entitlements.deleteMany({ where: { product: { nome: { contains: run } } } });',
  '    await db.products.deleteMany({ where: { nome: { contains: run } } });',
  '    const courseIds = JSON.parse(process.env["COURSE_IDS"] ?? "[]") as string[];',
  '    for (const id of courseIds) await db.courses.delete({ where: { id } });',
  '    return;',
  '  }',
  '  if (action === "count") {',
  '    const total = await db.flashcards.count({ where: { user_id: user.id, pergunta: { contains: run } } });',
  '    console.log(JSON.stringify({ total }));',
  '    return;',
  '  }',
  '  if (action === "flashcard") {',
  '    const id = process.env["FLASHCARD_ID"] ?? "";',
  '    const c = await db.flashcards.findUniqueOrThrow({ where: { id } });',
  '    console.log(JSON.stringify({ id: c.id, nivel: c.nivel, proxima_revisao: c.proxima_revisao.toISOString() }));',
  '    return;',
  '  }',
  '  if (action === "create") {',
  '    const course = await db.courses.create({ data: { nome: `E2E FC ${run}`, slug: `e2e-fc-${run}`, incluido_assinatura: true } });',
  '    const module = await db.modules.create({ data: { course_id: course.id, nome: `Módulo FC ${run}`, ordem: 1 } });',
  '    const material = await db.materials.create({ data: { module_id: module.id, titulo: `Bloco FC ${run}`, tipo: "questoes", ordem: 1, status: "publicado", publicado_em: new Date(), amostra: false } });',
  '    const alternativas = [{ letra: "A", texto: "A" }, { letra: "B", texto: "B" }, { letra: "C", texto: "C" }, { letra: "D", texto: "D" }];',
  '    const enunciados = [`Enunciado FC Q1 ${run}`, `Enunciado FC Q2 ${run}`, `Enunciado FC Q3 ${run}`];',
  '    const comentarios = [`RESPOSTA_SECRETA_FC_Q1_${run}`, `RESPOSTA_SECRETA_FC_Q2_${run}`, `RESPOSTA_SECRETA_FC_Q3_${run}`];',
  '    const questions = [];',
  '    for (let i = 0; i < 3; i++) questions.push(await db.questions.create({ data: { material_id: material.id, enunciado: enunciados[i], alternativas, gabarito: "A", comentario_html: `<strong>${comentarios[i]}</strong>`, ordem: i + 1 } }));',
  '    const product = await db.products.create({ data: { nome: `Assinatura E2E FC ${run}`, tipo: "assinatura", status: "ativo" } });',
  '    await db.entitlements.create({ data: { user_id: user.id, product_id: product.id, origem: "pagamento", acesso_ate: new Date(Date.now() + 86400000) } });',
  '    await responder(user.id, questions[0].id, "B");',
  '    await responder(user.id, questions[1].id, "B");',
  '    const cards = [];',
  '    for (let i = 0; i < 2; i++) cards.push(await db.flashcards.create({ data: { user_id: user.id, material_id: null, question_id: null, pergunta: `Pergunta FC ${i + 1} ${run}`, resposta: `Resposta FC ${i + 1} ${run}`, nivel: 0, proxima_revisao: new Date(Date.now() - 60000), revisoes: 0 } }));',
  '    console.log(JSON.stringify({ flashcardIds: cards.map((c) => c.id), perguntas: cards.map((c) => c.pergunta), courseId: course.id, moduleId: module.id, materialId: material.id, questionIds: questions.map((q) => q.id), enunciados, comentarios }));',
  '    return;',
  '  }',
  '  throw new Error(`ação desconhecida: ${action}`);',
  '}',
  'main().catch((error) => { console.error(error); process.exitCode = 1; }).finally(() => { void db.$disconnect(); });',
].join("\n");

let fixture: Fixture;

function runHelper(action: "create" | "cleanup" | "count" | "flashcard", envExtra: Record<string, string> = {}): Fixture | Record<string, unknown> | null {
  const output = execSync(`npx tsx "${HELPER}" ${action}`, {
    cwd: ROOT,
    encoding: "utf8",
    windowsHide: true,
    env: {
      ...process.env,
      RUN,
      FLASHCARD_IDS: JSON.stringify(fixture?.flashcardIds ?? []),
      QUESTION_IDS: JSON.stringify(fixture?.questionIds ?? []),
      MATERIAL_IDS: JSON.stringify([fixture?.materialId].filter(Boolean)),
      MODULE_IDS: JSON.stringify([fixture?.moduleId].filter(Boolean)),
      COURSE_IDS: JSON.stringify([fixture?.courseId].filter(Boolean)),
      ...envExtra,
    },
  });
  if (action === "cleanup") return null;
  return JSON.parse(output.trim().split("\n").pop() ?? "") as Fixture | Record<string, unknown>;
}

function readFlashcard(id: string): Record<string, number> {
  return runHelper("flashcard", { FLASHCARD_ID: id }) as Record<string, number>;
}

async function login(page: Page): Promise<void> {
  await page.goto("/login");
  await page.fill("#login-email", STUDENT);
  await page.fill("#login-senha", PASSWORD);
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page).toHaveURL(/\/app/);
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

test("E2E-F1 revisão com acerto avança nível e remove da fila", async ({ page }) => {
  await login(page);
  await page.goto("/app/flashcards");
  const pergunta = fixture.perguntas[0];
  const card = page.getByTestId("flashcard").filter({ hasText: pergunta });
  await expect(card).toBeVisible();
  await card.locator("summary").click();
  await card.getByRole("button", { name: "Acertei" }).click();
  await expect(card).toHaveCount(0);
  expect(readFlashcard(fixture.flashcardIds[0]).nivel).toBe(1); // F1: acerto sobe nível 0 -> 1
});

test("E2E-F2 revisão com erro reinicia nível e remove da fila", async ({ page }) => {
  await login(page);
  await page.goto("/app/flashcards");
  const pergunta = fixture.perguntas[1];
  const card = page.getByTestId("flashcard").filter({ hasText: pergunta });
  await expect(card).toBeVisible();
  await card.locator("summary").click();
  await card.getByRole("button", { name: "Errei" }).click();
  await expect(card).toHaveCount(0);
  expect(readFlashcard(fixture.flashcardIds[1]).nivel).toBe(0); // F2: erro reinicia ao nível 0
});

test("E2E-F3 sugestão surge de erro real e não de questão sem erro", async ({ page }) => {
  await login(page);
  await page.goto("/app/flashcards");
  await expect(page.getByTestId("sugestoes-flashcard")).toBeVisible();
  const q1 = fixture.enunciados[0];
  const q3 = fixture.enunciados[2];
  // Q1 (erro real do aluno) -> sugestão presente
  const cardQ1 = page.getByTestId("sugestao-flashcard").filter({ hasText: q1 });
  await expect(cardQ1).toBeVisible();
  // Q3 (sem erro) -> nenhuma sugestão
  await expect(page.getByTestId("sugestao-flashcard").filter({ hasText: q3 })).toHaveCount(0);
  // gabarito/resposta não é exibido na etapa de sugestão
  await expect(cardQ1).not.toContainText(fixture.comentarios[0]);
});

test("E2E-F3 confirmação explícita cria flashcard", async ({ page }) => {
  await login(page);
  await page.goto("/app/flashcards");
  const antes = (runHelper("count") as { total: number }).total;
  const q1 = fixture.enunciados[0];
  await page.getByTestId("sugestao-flashcard").filter({ hasText: q1 }).getByTestId("confirmar-sugestao").click();
  await expect(page.getByText(/Flashcard criado/)).toBeVisible();
  const depois = (runHelper("count") as { total: number }).total;
  expect(depois).toBe(antes + 1);
});

test("E2E-F3 descarte não cria flashcard", async ({ page }) => {
  await login(page);
  await page.goto("/app/flashcards");
  const antes = (runHelper("count") as { total: number }).total;
  const q2 = fixture.enunciados[1];
  await page.getByTestId("sugestao-flashcard").filter({ hasText: q2 }).getByTestId("descartar-sugestao").click();
  await expect(page.getByText(/Sugestão descartada/)).toBeVisible();
  const depois = (runHelper("count") as { total: number }).total;
  expect(depois).toBe(antes);
});
