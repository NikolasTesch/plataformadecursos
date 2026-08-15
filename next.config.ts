import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Next 16 dev bloqueia por padrão recursos de dev (chunks/_next) cujo host
  // de origem não esteja na allowlist (o Playwright/E2E e o dev usam
  // 127.0.0.1 — ver playwright.config.ts). Sem isto, o client-side JS não
  // hidrata e server actions/forms quebram no dev.
  allowedDevOrigins: ["127.0.0.1"],
};

export default nextConfig;
