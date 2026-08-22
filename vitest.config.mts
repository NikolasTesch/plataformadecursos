// Configuração do Vitest (v4) — ConcursFoco.
//
// Testes unitários rodam em ambiente `node` (bibliotecas puras TS — nenhuma
// dependência de DOM). `globals: true` expõe describe/it/expect sem import
// explícito. O include restringe a busca a `tests/unit/**/*.test.ts` (E2E
// fica sob Playwright em tests/e2e). O alias `@` → `./src` espelha o
// tsconfig.json (`@/*` → `./src/*`) para os imports do código-fonte.
import path from "node:path";
import { fileURLToPath } from "node:url";

import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    globals: true,
    include: ["tests/unit/**/*.test.ts"],
  },
  resolve: {
    alias: {
      "@": path.resolve(fileURLToPath(new URL(".", import.meta.url)), "./src"),
    },
  },
});
