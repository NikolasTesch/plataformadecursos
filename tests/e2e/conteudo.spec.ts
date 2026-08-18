import { execSync } from "node:child_process";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { expect, test, type Page } from "@playwright/test";

const ADMIN_EMAIL = "admin@concursfoco.dev";
const ADMIN_PASSWORD = "Admin@1234";
const STUDENT_EMAIL = "aluno@concursfoco.dev";
const STUDENT_PASSWORD = "Aluno@1234";
const RUN_ID = `${Date.now()}-${crypto.randomUUID().slice(0, 8)}`;
const REPO_ROOT = process.cwd();
const HELPER_DIR = join(REPO_ROOT, ".omo", "e2e-helper");
const HELPER_PATH = join(HELPER_DIR, "conteudo.ts");

type Fixture = {
  courseId: string;
  courseSlug: string;
  courseName: string;
  sampleId: string;
  sampleTitle: string;
  candidateId: string;
  candidateTitle: string;
  unpublishId: string;
  unpublishTitle: string;
  unpublishBody: string;
  pdfId: string;
  pdfTitle: string;
  pdfKey: string;
};

const HELPER_SCRIPT = [
  'import "dotenv/config";',
  'import { rmSync } from "node:fs";',
  'import { tmpdir } from "node:os";',
  'import { join } from "node:path";',
  'import { db } from "../../src/lib/db";',
  'import { StubStorageDriver } from "../../src/lib/storage";',
  'const action = process.argv[2] ?? "";',
  'const runId = process.env["RUN_ID"] ?? "";',
  'async function main() {',
  '  if (action === "create") {',
  '    if (runId === "") throw new Error("RUN_ID ausente");',
  '    const course = await db.courses.create({ data: { nome: `E2E Conteudo ${runId}`, slug: `e2e-conteudo-${runId}`, incluido_assinatura: false } });',
  '    const module = await db.modules.create({ data: { course_id: course.id, nome: `Modulo E2E ${runId}`, ordem: 1 } });',
  '    const sampleTitle = `Amostra E2E ${runId}`;',
  '    const sample = await db.materials.create({ data: { module_id: module.id, titulo: sampleTitle, tipo: "texto", ordem: 1, status: "publicado", publicado_em: new Date(), amostra: true, conteudo_html: `<h1>Amostra ${runId}</h1>` } });',
  '    const candidateTitle = `Segunda Amostra E2E ${runId}`;',
  '    const candidate = await db.materials.create({ data: { module_id: module.id, titulo: candidateTitle, tipo: "texto", ordem: 2, status: "rascunho", amostra: false, conteudo_html: `<p>Candidato ${runId}</p>` } });',
  '    const unpublishTitle = `Despublicar E2E ${runId}`;',
  '    const unpublishBody = `SEGREDO_DESPUBLICAR_${runId}`;',
  '    const unpublish = await db.materials.create({ data: { module_id: module.id, titulo: unpublishTitle, tipo: "texto", ordem: 3, status: "publicado", publicado_em: new Date(), amostra: false, conteudo_html: `<p>${unpublishBody}</p>` } });',
  '    const pdfTitle = `PDF Bloqueado E2E ${runId}`;',
  '    const pdfKey = `materials/${course.id}/e2e-${runId}.pdf`;',
  '    const pdf = await db.materials.create({ data: { module_id: module.id, titulo: pdfTitle, tipo: "pdf", ordem: 4, status: "publicado", publicado_em: new Date(), amostra: false, arquivo_key: pdfKey } });',
  '    await new StubStorageDriver().salvarArquivo(pdfKey, Buffer.from("%PDF-1.7\\nE2E\\n"));',
  '    console.log(JSON.stringify({ courseId: course.id, courseSlug: course.slug, courseName: course.nome, sampleId: sample.id, sampleTitle, candidateId: candidate.id, candidateTitle, unpublishId: unpublish.id, unpublishTitle, unpublishBody, pdfId: pdf.id, pdfTitle, pdfKey }));',
    '    return;',
  '  }',
  '  if (action === "cleanup") {',
  '    const courseId = process.env["COURSE_ID"] ?? "";',
  '    if (courseId !== "") {',
  '      await db.courses.deleteMany({ where: { id: courseId } });',
  '      rmSync(join(tmpdir(), "concursfoco-stub-storage", "materials", courseId), { recursive: true, force: true });',
  '    }',
  '    return;',
  '  }',
  '  throw new Error(`acao desconhecida: ${action}`);',
  '}',
  'main().catch((error) => { console.error(error); process.exitCode = 1; }).finally(() => { void db.$disconnect(); });',
].join("\n");

let fixture: Fixture | undefined;

function runSeed(): void {
  execSync("npm run db:seed", { cwd: REPO_ROOT, stdio: "inherit" });
}

function runHelper(
  action: "create" | "cleanup",
  variables: Record<string, string>,
): Fixture | null {
  const output = execSync(`npx tsx "${HELPER_PATH}" ${action}`, {
    cwd: REPO_ROOT,
    encoding: "utf8",
    env: { ...process.env, ...variables },
    windowsHide: true,
  });
  if (action === "cleanup") return null;
  const line = output.trim().split("\n").pop();
  if (line === undefined) throw new Error(`helper "${action}" não produziu saída`);
  return JSON.parse(line) as Fixture;
}

function getFixture(): Fixture {
  if (fixture === undefined) throw new Error("fixture E2E de conteúdo ausente");
  return fixture;
}

async function enter(page: Page, email: string, password: string): Promise<void> {
  await page.goto("/login");
  await page.fill("#login-email", email);
  await page.fill("#login-senha", password);
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page).toHaveURL(/\/app/);
}

async function enterAdmin(page: Page): Promise<void> {
  await enter(page, ADMIN_EMAIL, ADMIN_PASSWORD);
  await page.goto("/admin/cursos");
  await expect(page.getByRole("heading", { name: "Cursos", exact: true })).toBeVisible();
}

async function enterStudent(page: Page): Promise<void> {
  await enter(page, STUDENT_EMAIL, STUDENT_PASSWORD);
  await expect(page.getByRole("heading", { name: "Área do aluno", exact: true })).toBeVisible();
}

test.beforeAll(() => {
  mkdirSync(HELPER_DIR, { recursive: true });
  writeFileSync(HELPER_PATH, HELPER_SCRIPT, "utf8");
  runSeed();
  const created = runHelper("create", { RUN_ID });
  if (created === null) throw new Error("helper não criou fixture");
  fixture = created;
});

test.afterAll(() => {
  try {
    if (fixture !== undefined) runHelper("cleanup", { COURSE_ID: fixture.courseId });
  } finally {
    try {
      runSeed();
    } finally {
      rmSync(HELPER_DIR, { recursive: true, force: true });
    }
  }
});

test("C1 rejeita a segunda amostra no mesmo curso", async ({ page }) => {
  const current = getFixture();
  await test.step("Given material candidato sem flag de amostra", async () => {
    await enterAdmin(page);
    await page.goto(`/admin/materiais/${current.candidateId}`);
    await expect(page.locator("#material-amostra")).not.toBeChecked();
  });
  await test.step("When admin marca o segundo material como amostra", async () => {
    await page.check("#material-amostra");
    await page.getByRole("button", { name: "Salvar alterações" }).click();
  });
  await test.step("Then erro de regra aparece e a flag não é persistida", async () => {
    const alert = page.locator('[role="alert"]:not(#__next-route-announcer__)');
    await expect(alert).toContainText("já existe 1 material de amostra neste curso");
    await page.reload();
    await expect(page.locator("#material-amostra")).not.toBeChecked();
  });
});

test("C2 despublicação remove da lista e bloqueia a próxima abertura", async ({ browser, page }) => {
  const current = getFixture();
  const studentContext = await browser.newContext();
  const studentPage = await studentContext.newPage();
  try {
    await test.step("Given material publicado visível ao aluno", async () => {
      await enterStudent(studentPage);
      await studentPage.goto(`/app/cursos/${current.courseSlug}`);
      // O aluno demo não possui entitlement; material publicado aparece
      // bloqueado, mas continua presente na árvore do curso.
      await expect(studentPage.getByTestId(`bloqueado-${current.unpublishId}`)).toBeVisible();
    });
    await test.step("When admin despublica o material", async () => {
      await enterAdmin(page);
      await page.goto(`/admin/materiais/${current.unpublishId}`);
      await page.getByRole("button", { name: "Despublicar" }).click();
      await expect(page.getByRole("button", { name: "Publicar" })).toBeVisible();
    });
    await test.step("Then listagem some e abertura direta mostra bloqueio", async () => {
      await studentPage.goto(`/app/cursos/${current.courseSlug}`);
      await expect(studentPage.getByTestId(`material-${current.unpublishId}`)).toHaveCount(0);
      await studentPage.goto(`/app/cursos/${current.courseSlug}/materiais/${current.unpublishId}`);
      await expect(studentPage.getByTestId(`bloqueado-${current.unpublishId}`)).toBeVisible();
      await expect(studentPage.locator("#material-conteudo")).toHaveCount(0);
      expect(await studentPage.content()).not.toContain(current.unpublishBody);
    });
  } finally {
    await studentContext.close();
  }
});

test("C3 aluno sem permissão não recebe URL assinada do PDF", async ({ page }) => {
  const current = getFixture();
  const stubRequests: string[] = [];
  page.on("request", (request) => {
    if (request.url().includes("/stub-storage/")) stubRequests.push(request.url());
  });
  await test.step("Given aluno sem entitlement do curso", async () => {
    await enterStudent(page);
  });
  await test.step("When aluno abre o material PDF", async () => {
    await page.goto(`/app/cursos/${current.courseSlug}/materiais/${current.pdfId}`);
  });
  await test.step("Then resposta é bloqueada sem URL ou request ao storage", async () => {
    await expect(page.getByTestId(`bloqueado-${current.pdfId}`)).toBeVisible();
    await expect(page.locator("#material-pdf")).toHaveCount(0);
    expect(stubRequests).toHaveLength(0);
    const html = await page.content();
    expect(html).not.toContain("/stub-storage/");
    expect(html).not.toContain(current.pdfKey);
  });
});

test("C4 sales page mostra metadados sem vazar conteúdo", async ({ page }) => {
  const current = getFixture();
  await test.step("Given visitante não autenticado", async () => {
    await page.goto(`/cursos/${current.courseSlug}`);
  });
  await test.step("Then grade mostra títulos, tipos, amostra e CTAs", async () => {
    await expect(page.getByRole("heading", { name: current.courseName, exact: true })).toBeVisible();
    await expect(page.getByText(current.sampleTitle, { exact: true })).toBeVisible();
    await expect(page.getByText(current.pdfTitle, { exact: true })).toBeVisible();
    const sampleLink = page.getByRole("link", { name: "Ler amostra grátis" });
    await expect(sampleLink).toHaveAttribute("href", `/app/cursos/${current.courseSlug}/materiais/${current.sampleId}`);
    await expect(sampleLink.locator("xpath=..")).toContainText("Texto");
    const pdfRow = page.locator("li").filter({ hasText: current.pdfTitle }).last();
    await expect(pdfRow).toContainText("PDF");
    await expect(pdfRow.getByRole("link")).toHaveCount(0);
    await expect(page.getByRole("link", { name: "Começar trial grátis" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Assinar e acessar" })).toBeVisible();
  });
  await test.step("And HTML não contém corpo nem chave do material", async () => {
    const html = await page.content();
    expect(html).not.toContain(current.unpublishBody);
    expect(html).not.toContain(current.pdfKey);
  });
});
