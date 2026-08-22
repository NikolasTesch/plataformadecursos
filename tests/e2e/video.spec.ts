import { execSync } from "node:child_process";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { expect, test, type Page } from "@playwright/test";

const ROOT = process.cwd();
const HELPER_DIR = join(ROOT, ".omo", "e2e-helper");
const HELPER = join(HELPER_DIR, "video.ts");
const RUN = `${Date.now()}-${crypto.randomUUID().slice(0, 8)}`;
const ADMIN_EMAIL = "admin@concursfoco.dev";
const ADMIN_PASSWORD = "Admin@1234";
const STUDENT_EMAIL = "aluno@concursfoco.dev";
const STUDENT_PASSWORD = "Aluno@1234";

type Video = { id: string; slug: string; providerId: string; title: string };
type Fixture = {
  processing: Video;
  error: Video;
  authorized: Video;
  completion: Video;
  unauthorized: Video;
  courseIds: string[];
};

const HELPER_SCRIPT = [
  'import "dotenv/config";',
  'import { db } from "../../src/lib/db";',
  'const run = process.env["RUN"] ?? "";',
  'async function main() {',
  '  if (process.argv[2] === "cleanup") {',
  '    await db.user_progress.deleteMany({ where: { material: { modulo: { course_id: { in: JSON.parse(process.env["COURSE_IDS"] ?? "[]") } } } } });',
  '    await db.entitlements.deleteMany({ where: { product: { nome: { contains: run } } } });',
  '    await db.products.deleteMany({ where: { nome: { contains: run } } });',
  '    await db.courses.deleteMany({ where: { id: { in: JSON.parse(process.env["COURSE_IDS"] ?? "[]") } } });',
  '    return;',
  '  }',
  '  const user = await db.users.findUniqueOrThrow({ where: { email: "aluno@concursfoco.dev" } });',
  '  const courseIds: string[] = [];',
  '  async function make(name: string, status: "processando" | "erro" | "pronto", entitled: boolean) {',
  '    const course = await db.courses.create({ data: { nome: `E2E Vídeo ${name} ${run}`, slug: `e2e-video-${name}-${run}`, incluido_assinatura: false } });',
  '    courseIds.push(course.id);',
  '    const modulo = await db.modules.create({ data: { course_id: course.id, nome: `Módulo vídeo ${run}`, ordem: 1 } });',
  '    const title = `Vídeo ${name} ${run}`;',
  '    const material = await db.materials.create({ data: { module_id: modulo.id, titulo: title, tipo: "video", ordem: 1, status: status === "pronto" ? "publicado" : "rascunho", publicado_em: status === "pronto" ? new Date() : null, video_provider_id: `provider-${name}-${run}`, video_status: status } });',
  '    if (entitled) {',
  '      const product = await db.products.create({ data: { tipo: "venda_unica", nome: `Produto vídeo ${name} ${run}`, status: "ativo", curso_id: course.id } });',
  '      await db.entitlements.create({ data: { user_id: user.id, product_id: product.id, origem: "admin", acesso_ate: null } });',
  '    }',
  '    return { id: material.id, slug: course.slug, providerId: material.video_provider_id as string, title };',
  '  }',
  '  const processing = await make("processando", "processando", false);',
  '  const error = await make("erro", "erro", false);',
  '  const authorized = await make("retomada", "pronto", true);',
  '  const completion = await make("conclusao", "pronto", true);',
  '  const unauthorized = await make("sem-acesso", "pronto", false);',
  '  console.log(JSON.stringify({ processing, error, authorized, completion, unauthorized, courseIds }));',
  '}',
  'main().catch((error) => { console.error(error); process.exitCode = 1; }).finally(() => { void db.$disconnect(); });',
].join("\n");

let fixture: Fixture;

function runHelper(action: "create" | "cleanup"): Fixture | null {
  const output = execSync(`npx tsx "${HELPER}" ${action}`, {
    cwd: ROOT,
    encoding: "utf8",
    env: {
      ...process.env,
      RUN,
      COURSE_IDS: JSON.stringify(fixture?.courseIds ?? []),
    },
    windowsHide: true,
  });
  if (action === "cleanup") return null;
  return JSON.parse(output.trim().split("\n").pop() ?? "") as Fixture;
}

async function login(page: Page, email: string, password: string): Promise<void> {
  await page.goto("/login");
  await page.fill("#login-email", email);
  await page.fill("#login-senha", password);
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page).toHaveURL(/\/app/);
}

async function loginAdmin(page: Page): Promise<void> {
  await login(page, ADMIN_EMAIL, ADMIN_PASSWORD);
  await page.goto("/admin/cursos");
  await expect(page.getByRole("heading", { name: "Cursos", exact: true })).toBeVisible();
}

async function loginStudent(page: Page): Promise<void> {
  await login(page, STUDENT_EMAIL, STUDENT_PASSWORD);
  await expect(page.getByRole("heading", { name: /Olá,/ })).toBeVisible();
}

async function installPlayerMock(page: Page): Promise<void> {
  await page.addInitScript(() => {
    let ready = false;
    let seekedTo: number | null = null;
    const iframe = () => document.querySelector<HTMLIFrameElement>('iframe[title="Player da videoaula"]');
    const send = (command: string, value?: number | string) => {
      iframe()?.contentWindow?.postMessage(JSON.stringify({ context: "e2e-video-mock", command, value }), "*");
    };
    window.addEventListener("message", (event) => {
      if (typeof event.data !== "string") return;
      try {
        const data = JSON.parse(event.data) as { context?: string; event?: string; value?: number };
        if (data.context === "e2e-video-mock" && data.event === "ready") ready = true;
        if (data.context === "e2e-video-mock" && data.event === "seeked") seekedTo = data.value ?? null;
      } catch {
        // Ignore messages not belonging to the test player.
      }
    });
    Object.defineProperty(window, "__videoMock", {
      configurable: true,
      value: {
        setCurrentTime(seconds: number) {
          send("setCurrentTime", seconds);
        },
        emit(event: string) {
          send("emit", event);
        },
        instanceCount() {
          return ready ? 1 : 0;
        },
        seekedTo() {
          return seekedTo;
        },
      },
    });
  });
}

async function stubBunnyEmbed(page: Page): Promise<void> {
  await page.route("https://player.mediadelivery.net/embed/**", (route) =>
    route.fulfill({
      status: 200,
      contentType: "text/html",
      body: `<!doctype html><title>fake Bunny player</title><script>
        (() => {
          const PLAYER_CONTEXT = "player.js";
          const TEST_CONTEXT = "e2e-video-mock";
          const duration = 1800;
          let currentTime = 0;
          let ready = false;
          const listeners = {};
          const send = (message) => window.parent.postMessage(JSON.stringify(message), "*");
          const announceReady = (listener) => send({
            context: PLAYER_CONTEXT,
            version: "0.0.11",
            event: "ready",
            value: {
              src: location.href,
              events: ["ready", "play", "pause", "ended", "timeupdate", "progress", "error"],
              methods: ["play", "pause", "getPaused", "mute", "unmute", "getMuted", "getDuration", "setCurrentTime", "getCurrentTime", "setLoop", "getLoop", "removeEventListener", "addEventListener"]
            },
            listener
          });
          window.addEventListener("message", (event) => {
            if (typeof event.data !== "string") return;
            let data;
            try { data = JSON.parse(event.data); } catch { return; }
            if (data.context === TEST_CONTEXT) {
              if (data.command === "setCurrentTime") currentTime = data.value;
              if (data.command === "emit") {
                for (const listener of listeners[data.value] || []) send({ context: PLAYER_CONTEXT, version: "0.0.11", event: data.value, listener });
              }
              return;
            }
            if (data.context !== PLAYER_CONTEXT || !data.method) return;
            if (data.method === "addEventListener") {
              (listeners[data.value] ||= []).push(data.listener);
              if (data.value === "ready" && ready) announceReady(data.listener);
              return;
            }
            if (data.method === "removeEventListener") return;
            if (data.method === "getCurrentTime") send({ context: PLAYER_CONTEXT, version: "0.0.11", event: data.method, value: currentTime, listener: data.listener });
            if (data.method === "getDuration") send({ context: PLAYER_CONTEXT, version: "0.0.11", event: data.method, value: duration, listener: data.listener });
            if (data.method === "setCurrentTime") {
              currentTime = data.value;
              window.parent.postMessage(JSON.stringify({ context: TEST_CONTEXT, event: "seeked", value: currentTime }), "*");
            }
          });
          ready = true;
          announceReady();
          window.parent.postMessage(JSON.stringify({ context: TEST_CONTEXT, event: "ready" }), "*");
        })();
      </script>`,
    }),
  );
}

test.beforeAll(() => {
  mkdirSync(HELPER_DIR, { recursive: true });
  writeFileSync(HELPER, HELPER_SCRIPT, "utf8");
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

test("E2E-V1 vídeo processando ou em erro não publica e fica bloqueado", async ({ browser, page }) => {
  await loginAdmin(page);

  for (const [status, video, mensagem] of [
    ["processando", fixture.processing, "o vídeo ainda está sendo processado e não pode ser publicado"],
    ["erro", fixture.error, "o vídeo precisa ser processado com sucesso para publicar"],
  ] as const) {
    await test.step(`admin não publica vídeo ${status}`, async () => {
      await page.goto(`/admin/materiais/${video.id}`);
      await expect(page.getByText(status === "erro" ? "Erro" : "Processando", { exact: true })).toBeVisible();
      await page.getByRole("button", { name: "Publicar" }).click();
      await expect(page.locator('[role="alert"]:not(#__next-route-announcer__)')).toContainText(mensagem);
      await page.reload();
      await expect(page.getByRole("button", { name: "Publicar" })).toBeVisible();
    });
  }

  const studentContext = await browser.newContext();
  const studentPage = await studentContext.newPage();
  try {
    await loginStudent(studentPage);
    for (const video of [fixture.processing, fixture.error]) {
      await studentPage.goto(`/app/cursos/${video.slug}/materiais/${video.id}`);
      await expect(studentPage.getByTestId(`bloqueado-${video.id}`)).toBeVisible();
      await expect(studentPage.locator('iframe[title="Player da videoaula"]')).toHaveCount(0);
    }
  } finally {
    await studentContext.close();
  }
});

test("E2E-V2 aluno autorizado recebe player e retoma posição salva", async ({ page }) => {
  await stubBunnyEmbed(page);
  await installPlayerMock(page);
  await loginStudent(page);
  const url = `/app/cursos/${fixture.authorized.slug}/materiais/${fixture.authorized.id}`;

  await page.goto(url);
  await expect(page.locator('iframe[title="Player da videoaula"]')).toBeVisible();
  await expect(page.locator('iframe[title="Player da videoaula"]')).toHaveAttribute(
    "src",
    new RegExp(`/embed/[^/]+/${fixture.authorized.providerId}(?:[?]|$)`),
  );
  await expect.poll(() => page.evaluate(() => (window as unknown as { __videoMock: { instanceCount(): number } }).__videoMock.instanceCount())).toBeGreaterThan(0);

  const resposta = page.waitForResponse((response) => response.url().includes(`/api/materiais/${fixture.authorized.id}/video/progresso`) && response.request().method() === "POST");
  await page.evaluate(() => {
    const mock = (window as unknown as { __videoMock: { setCurrentTime(seconds: number): void; emit(event: string): void } }).__videoMock;
    mock.setCurrentTime(720);
    mock.emit("pause");
  });
  expect((await resposta).status()).toBe(200);

  await page.reload();
  await expect.poll(() => page.evaluate(() => (window as unknown as { __videoMock: { seekedTo(): number | null } }).__videoMock.seekedTo())).toBe(720);
});

test("E2E-V3 atingir 95% conclui o material", async ({ page }) => {
  await stubBunnyEmbed(page);
  await installPlayerMock(page);
  await loginStudent(page);
  await page.goto(`/app/cursos/${fixture.completion.slug}/materiais/${fixture.completion.id}`);
  await expect.poll(() => page.evaluate(() => (window as unknown as { __videoMock: { instanceCount(): number } }).__videoMock.instanceCount())).toBeGreaterThan(0);

  const resposta = page.waitForResponse((response) => response.url().includes(`/api/materiais/${fixture.completion.id}/video/progresso`) && response.request().method() === "POST");
  await page.evaluate(() => {
    const mock = (window as unknown as { __videoMock: { setCurrentTime(seconds: number): void; emit(event: string): void } }).__videoMock;
    mock.setCurrentTime(1710);
    mock.emit("ended");
  });
  expect((await resposta).status()).toBe(200);
  await page.goto(`/app/cursos/${fixture.completion.slug}`);
  await expect(page.getByTestId(`concluido-${fixture.completion.id}`)).toBeVisible();
});

test("E2E-V4 aluno sem entitlement não recebe URL ou embed de streaming", async ({ page }) => {
  const streamingRequests: string[] = [];
  page.on("request", (request) => {
    if (request.url().includes("player.mediadelivery.net")) streamingRequests.push(request.url());
  });

  await loginStudent(page);
  await page.goto(`/app/cursos/${fixture.unauthorized.slug}/materiais/${fixture.unauthorized.id}`);
  await expect(page.getByTestId(`bloqueado-${fixture.unauthorized.id}`)).toBeVisible();
  await expect(page.locator('iframe[title="Player da videoaula"]')).toHaveCount(0);
  expect(streamingRequests).toHaveLength(0);
  const html = await page.content();
  expect(html).not.toContain(fixture.unauthorized.providerId);
  expect(html).not.toContain("player.mediadelivery.net/embed");
});
