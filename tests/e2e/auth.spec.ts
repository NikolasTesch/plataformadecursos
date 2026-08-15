// E2E do fluxo de autenticação (todo 15) — US-01/02 end-to-end no app real.
//
// Fluxo (UM teste — cookies não persistem entre testes no Playwright):
//   /cadastro (email único) → redirect /app (stub "Área do aluno")
//   → logout (POST /api/auth/signout com csrf) → /app sem sessão → /login
//   → login com as MESMAS credenciais → /app
//
// Mecanismo de logout (next-auth@5.0.0-beta.32 — verificado no source):
// - GET /api/auth/signout renderiza a página default de confirmação, MAS o
//   `action` do form aponta para `options.url` (a ORIGEM, `/`) — o botão
//   postaria para a landing (405). O caminho de clique é inválido nesta versão.
// - Caminho confiável (idêntico ao `signOut` server-action interno, que usa
//   skipCSRFCheck): GET /api/auth/csrf → { csrfToken } (+ cookie csrf) → POST
//   /api/auth/signout com body form-encoded { csrfToken, callbackUrl }.
//   `actions.signOut` limpa o cookie de sessão (strategy jwt) e responde 302
//   para callbackUrl. Sem mudança de código de app necessária.
import { expect, test } from "@playwright/test";

// Senha do teste: >= 8 e <= 72 chars, com maiúscula + dígito (validação A1 do
// service registrar). Não é um segredo real — conta de teste em DB dev.
const SENHA = "E2e@12345";
const NOME = "Aluno E2E";

// Email ÚNICO por run (timestamp): nunca colide com seed users nem com runs
// anteriores. Um registro por run é o design (rate limit de registro 10/h por
// IP é in-memory e o webServer sobe um servidor fresco a cada run).
const EMAIL = `e2e-${Date.now()}@test.dev`;

test("fluxo registro → /app → logout → /login → login → /app", async ({
  page,
}) => {
  await test.step("cadastro com email único (US-01 pela UI)", async () => {
    await page.goto("/cadastro");
    await page.fill("#cadastro-nome", NOME);
    await page.fill("#cadastro-email", EMAIL);
    await page.fill("#cadastro-senha", SENHA);
    await page.check("#cadastro-lgpd");
    await page.getByRole("button", { name: "Criar conta" }).click();
  });

  await test.step("registro redireciona para /app (sessão criada)", async () => {
    // form → server action → registrar() → signIn → redirect("/app")
    await expect(page).toHaveURL(/\/app/);
    await expect(
      page.getByRole("heading", { name: "Área do aluno" }),
    ).toBeVisible();
  });

  await test.step("logout: POST /api/auth/signout com csrf", async () => {
    // page.request compartilha os cookies do contexto (sessão + csrf).
    const csrfResposta = await page.request.get("/api/auth/csrf");
    expect(csrfResposta.ok()).toBeTruthy();
    const { csrfToken } = (await csrfResposta.json()) as { csrfToken: string };
    expect(csrfToken).toBeTruthy();

    const resposta = await page.request.post("/api/auth/signout", {
      form: { csrfToken, callbackUrl: "/login" },
      // APIRequestContext segue redirects por padrão (maxRedirects=20) — o 302
      // do signout seria seguido até /login e o status final viraria 200.
      maxRedirects: 0,
    });
    expect(resposta.status()).toBe(302);
    expect(resposta.headers()["location"]).toContain("/login");
  });

  await test.step("sessão destruída: /app redireciona para /login", async () => {
    // Middleware (sem JWT) → 307 /login — prova que o cookie foi limpo.
    await page.goto("/app");
    await expect(page).toHaveURL(/\/login/);
  });

  await test.step("login com as mesmas credenciais (US-02)", async () => {
    await page.fill("#login-email", EMAIL);
    await page.fill("#login-senha", SENHA);
    await page.getByRole("button", { name: "Entrar" }).click();
  });

  await test.step("login redireciona para /app", async () => {
    await expect(page).toHaveURL(/\/app/);
    await expect(
      page.getByRole("heading", { name: "Área do aluno" }),
    ).toBeVisible();
  });
});
