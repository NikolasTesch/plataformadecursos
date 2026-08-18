// Configuração do Playwright (todo 15 — E2E auth).
//
// Decisões:
// - baseURL 127.0.0.1:3000 (NÃO localhost): nesta máquina um Vite estrangeiro
//   (outro projeto) escuta em `::1:3000` — localhost resolveria para ele.
//   Next dev faz bind em 127.0.0.1:3000 sem conflito (dual-stack).
// - webServer `npm run dev` com reuseExistingServer:true: o Playwright gerencia
//   o servidor (boota e derruba); se já houver um dev server NOSSO em
//   127.0.0.1:3000, ele é reutilizado (nunca matamos processo alheio).
// - fullyParallel:false + workers:1: o fluxo usa 1 registro por run (rate limit
//   de registro 10/h por IP é in-memory — servidor fresco por run). Serial evita
//   colisão de orçamento e garante ordem.
// - trace:'on': artefato de debug em test-results/ (gitignored).
import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [["list"]],
  timeout: 120_000,
  expect: {
    // Dev-mode compila rotas no primeiro acesso — folga nas asserts.
    timeout: 20_000,
  },
  use: {
    baseURL: "http://127.0.0.1:3000",
    trace: "on",
  },
  webServer: {
    command: "npm run dev -- --hostname 127.0.0.1",
    url: "http://127.0.0.1:3000",
    reuseExistingServer: true,
    timeout: 120_000,
  },
});
