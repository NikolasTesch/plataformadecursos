// Testes unitários do matcher de proteção de rotas do proxy — ConcursFoco.
//
// Testa a função PURA protegerRota (src/proxy.ts) — sem runtime Next:
// apenas pathname + estado de auth → destino do redirect (ou null). Os casos
// cobrem o contrato do plano S1 todo 8 e SPEC-frontend.md:89.
//
// MOCKS (obrigatórios — descoberto no todo 8, ver notepads/issues):
// Importar src/proxy.ts executa o top-level `NextAuth(authConfig)` e o
// `import { NextResponse } from "next/server"`. Sob o configLoader nativo do
// Vite 7 (vitest v4), o next-auth real falha ao resolver `next/server`
// ("Cannot find module 'next/server' ... Did you mean next/server.js?").
// Como o teste cobre APENAS a função pura (sem runtime Next), o padrão é
// mockar `next-auth` e `next/server` (vi.mock é hoisted antes dos imports).
import { describe, expect, it, vi } from "vitest";

vi.mock("next-auth", () => ({
  default: () => ({ auth: () => undefined }),
}));

vi.mock("next/server", () => ({
  NextResponse: { redirect: () => undefined },
}));

import { protegerRota } from "@/proxy";

describe("protegerRota (matcher de proteção do proxy)", () => {
  describe("/admin/* — painel administrativo", () => {
    it("sem sessão → redireciona para /login", () => {
      expect(protegerRota("/admin", false, false)).toBe("/login");
    });

    it("com role aluno → redireciona para / (não é admin)", () => {
      expect(protegerRota("/admin", true, false)).toBe("/");
    });

    it("com role admin → permite (null)", () => {
      expect(protegerRota("/admin", true, true)).toBeNull();
    });

    it("sub-rota /admin/cursos segue a mesma regra (aluno → /)", () => {
      expect(protegerRota("/admin/cursos", true, false)).toBe("/");
    });

    it("sub-rota /admin/cursos sem sessão → /login", () => {
      expect(protegerRota("/admin/cursos", false, false)).toBe("/login");
    });

    it("sub-rota /admin/cursos com admin → permite (null)", () => {
      expect(protegerRota("/admin/cursos", true, true)).toBeNull();
    });
  });

  describe("/app/* — área do aluno", () => {
    it("sem sessão → redireciona para /login", () => {
      expect(protegerRota("/app", false, false)).toBe("/login");
    });

    it("com role aluno → permite (null)", () => {
      expect(protegerRota("/app", true, false)).toBeNull();
    });

    it("com role admin → permite (null)", () => {
      expect(protegerRota("/app", true, true)).toBeNull();
    });

    it("sub-rota /app/questoes sem sessão → /login", () => {
      expect(protegerRota("/app/questoes", false, false)).toBe("/login");
    });

    it("sub-rota /app/questoes com aluno → permite (null)", () => {
      expect(protegerRota("/app/questoes", true, false)).toBeNull();
    });
  });

  describe("fora do matcher — rotas públicas", () => {
    it("/login sem sessão → permite (null)", () => {
      expect(protegerRota("/login", false, false)).toBeNull();
    });

    it("/cadastro sem sessão → permite (null)", () => {
      expect(protegerRota("/cadastro", false, false)).toBeNull();
    });

    it("/ (landing) sem sessão → permite (null)", () => {
      expect(protegerRota("/", false, false)).toBeNull();
    });

    it("pathname com prefixo parecido (/administrador) NÃO é /admin → permite", () => {
      expect(protegerRota("/administrador", false, false)).toBeNull();
    });
  });
});
