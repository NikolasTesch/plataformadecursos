import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Next 16 dev bloqueia por padrão recursos de dev (chunks/_next) cujo host
  // de origem não esteja na allowlist (o Playwright/E2E e o dev usam
  // 127.0.0.1 — ver playwright.config.ts). Sem isto, o client-side JS não
  // hidrata e server actions/forms quebram no dev.
  allowedDevOrigins: ["127.0.0.1"],
  // pdfkit (todo 9, US-41) lê os AFMs das fontes padrão via __dirname em
  // runtime — bundlado, o __dirname vira a raiz do bundle ("C:\ROOT") e o
  // load quebra (ENOENT Helvetica.afm). Externo ao bundle = require() de
  // node_modules em runtime (fix oficial p/ libs com runtime fs).
  serverExternalPackages: ["pdfkit"],
};

export default nextConfig;
