// Testes unitários da config de auth SPLIT (edge-safe × Node) — auth-config.test.ts.
//
// Cobrem o contrato descoberto no todo 7 (learnings) e a regra BLOCKER-1 do
// plano S1: o middleware (Edge) importa APENAS auth.config.ts, que NÃO pode
// ter db/Prisma/argon2 no top-level. Por isso os testes têm DUAS camadas:
//
// 1. CHECKS ESTÁTICOS (fs.readFileSync) — o gate de segurança da divisão:
//    top-level do auth.config.ts só importa next-auth; db/argon2 entram
//    EXCLUSIVAMENTE via dynamic import LAZY dentro do corpo do authorize;
//    o wrapper Node (auth.ts) concentra PrismaAdapter + invariantes de
//    sessão (jwt/30d/24h). São assertions sobre o código-fonte (não é
//    tautologia: um import estático futuro de @/lib/db QUEBRA estes testes).
//
// 2. COMPORTAMENTO (runtime, com mocks) — authorize e verificarSessaoValida
//    com `vi.mock("@/lib/db")` + `vi.mock("argon2")`: no vitest, mocks de
//    módulo valem TAMBÉM para dynamic import() (o authorize usa
//    `await import("@/lib/db")` e `await import("argon2")` — ambos são
//    interceptados). O authorize REAL é `provider.options.authorize`: o
//    factory `Credentials()` devolve o provider com o authorize STUB
//    (`() => null`) e a config real em `options` — o runtime do Auth.js faz
//    `merge(defaults, options)` em parseProviders (verificado em
//    @auth/core/lib/utils/providers.js). Chamar `options.authorize` testa
//    exatamente o código que o Auth.js executa no sign-in.
import fs from "node:fs";
import { fileURLToPath } from "node:url";

import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Session } from "next-auth";
import type { CredentialsConfig } from "next-auth/providers/credentials";

// Mocks hoisted (vitest exige factory ANTES dos imports do sujeito).
const findUniqueMock = vi.hoisted(() => vi.fn());
const verifyMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/db", () => ({
  db: { users: { findUnique: findUniqueMock } },
}));

vi.mock("argon2", () => ({ verify: verifyMock }));

import { authConfig } from "@/lib/auth/auth.config";
import { verificarSessaoValida } from "@/lib/auth/verificar-sessao";

// Caminhos para os checks estáticos — resolvidos a partir deste arquivo
// (tests/unit/ → ../../src/lib/auth/), independem do cwd do runner.
const CAMINHO_AUTH_CONFIG = fileURLToPath(
  new URL("../../src/lib/auth/auth.config.ts", import.meta.url),
);
const CAMINHO_AUTH = fileURLToPath(
  new URL("../../src/lib/auth/auth.ts", import.meta.url),
);

// O runtime do Auth.js funde `options` no provider (parseProviders) — a
// interface pública não expõe `options`, então estreitamos o tipo com uma
// interseção declarada localmente (sem `any`).
type ProviderComOptions = CredentialsConfig & {
  options: { authorize: CredentialsConfig["authorize"] };
};

const provider = authConfig.providers[0] as ProviderComOptions;

/** Usuário fake — campos que o authorize lê do Prisma (users). */
interface UsuarioFake {
  id: string;
  email: string;
  nome: string;
  senha_hash: string;
  role: "aluno" | "admin";
  tokenVersion: number;
  bloqueado: boolean;
}

function criarUsuarioFake(overrides: Partial<UsuarioFake> = {}): UsuarioFake {
  return {
    id: "user-fake-uuid-1",
    email: "maria@exemplo.com",
    nome: "Maria Aluna",
    senha_hash: "$argon2id$fake-hash-para-teste",
    role: "aluno",
    tokenVersion: 7,
    bloqueado: false,
    ...overrides,
  };
}

/** Sessão mínima tipada (augmentation de types.d.ts: role + tokenVersion). */
function criaSessao(opts: { id?: string; tokenVersion?: number } = {}): Session {
  return {
    user: {
      id: opts.id ?? "user-1",
      role: "aluno",
      tokenVersion: opts.tokenVersion ?? 1,
      name: "Aluno",
      email: "aluno@exemplo.com",
      image: null,
    },
    expires: new Date(Date.now() + 86_400_000).toISOString(),
  };
}

beforeEach(() => {
  findUniqueMock.mockReset();
  verifyMock.mockReset();
});

describe("BLOCKER-1 — auth.config.ts é edge-safe (sem db/Prisma/argon2 no top-level)", () => {
  it("imports estáticos top-level: APENAS next-auth (types) e o provider Credentials", () => {
    const src = fs.readFileSync(CAMINHO_AUTH_CONFIG, "utf8");

    const linhasImport = src
      .split("\n")
      .map((l) => l.trim())
      .filter((l) => /^import\b/.test(l));

    expect(linhasImport.length).toBeGreaterThan(0);
    const especificadores = linhasImport.map((l) => {
      const m = l.match(/from\s+["']([^"']+)["']/);
      expect(m, `import sem specifier: ${l}`).not.toBeNull();
      return m![1];
    });

    // O coração do gate: qualquer import estático de db/Prisma/argon2 aqui
    // quebraria o bundle Edge do middleware (BLOCKER-1).
    expect(especificadores).toEqual(["next-auth", "next-auth/providers/credentials"]);
  });

  it("db/argon2 entram SÓ via dynamic import LAZY dentro do corpo do authorize", () => {
    const src = fs.readFileSync(CAMINHO_AUTH_CONFIG, "utf8");

    // Os dois lazy imports EXISTEM (são o mecanismo de acesso em runtime).
    expect(src).toContain('await import("@/lib/db")');
    expect(src).toContain('await import("argon2")');

    // E aparecem DEPOIS da declaração do authorize — nunca no top-level.
    const posAuthorize = src.indexOf("authorize:");
    const posDbLazy = src.indexOf('await import("@/lib/db")');
    const posArgon2Lazy = src.indexOf('await import("argon2")');
    expect(posAuthorize).toBeGreaterThan(0);
    expect(posDbLazy).toBeGreaterThan(posAuthorize);
    expect(posArgon2Lazy).toBeGreaterThan(posAuthorize);
  });

  it("PrismaClient/PrismaAdapter/PrismaPg NÃO aparecem no CÓDIGO do auth.config (nem lazy)", () => {
    const src = fs.readFileSync(CAMINHO_AUTH_CONFIG, "utf8");

    // Check code-aware: comentários documentam o contrato e citam os nomes
    // proibidos — o gate vale para o CÓDIGO (imports/uso), não para a prosa.
    const codigo = src
      .split("\n")
      .map((l) => l.replace(/\/\/.*$/, ""))
      .filter((l) => l.trim().length > 0)
      .join("\n");

    expect(codigo).not.toContain("PrismaClient");
    expect(codigo).not.toContain("PrismaAdapter");
    expect(codigo).not.toContain("@auth/prisma-adapter");
    expect(codigo).not.toContain("PrismaPg");
  });
});

describe("split-config — 1 provider Credentials; invariantes de sessão só no wrapper Node (auth.ts)", () => {
  it("authConfig expõe exatamente 1 provider do tipo credentials", () => {
    expect(authConfig.providers).toHaveLength(1);
    expect(provider.type).toBe("credentials");
  });

  it("auth.ts (Node) concentra o adapter Prisma e a estratégia JWT com maxAge 30d / updateAge 24h", () => {
    const src = fs.readFileSync(CAMINHO_AUTH, "utf8");

    expect(src).toContain("PrismaAdapter(db)");
    expect(src).toContain('strategy: "jwt"');
    expect(src).toContain("maxAge: 30 * 24 * 60 * 60");
    expect(src).toContain("updateAge: 24 * 60 * 60");
  });
});

describe("authorize — caminhos de rejeição e sucesso (db + argon2 mockados)", () => {
  it("credenciais ausentes/vazias → null ANTES de tocar o banco", async () => {
    const resultado = await provider.options.authorize({}, {} as Request);

    expect(resultado).toBeNull();
    expect(findUniqueMock).not.toHaveBeenCalled();
    expect(verifyMock).not.toHaveBeenCalled();
  });

  it("usuário desconhecido → null (mesmo erro genérico) sem custo de argon2", async () => {
    findUniqueMock.mockResolvedValue(null);

    const resultado = await provider.options.authorize(
      { email: "nao-existe@exemplo.com", password: "SenhaQualquer1" },
      {} as Request,
    );

    expect(resultado).toBeNull();
    expect(findUniqueMock).toHaveBeenCalledWith({
      where: { email: "nao-existe@exemplo.com" },
    });
    expect(verifyMock).not.toHaveBeenCalled();
  });

  it("usuário bloqueado → null, mesmo com senha correta (não chega ao argon2)", async () => {
    findUniqueMock.mockResolvedValue(criarUsuarioFake({ bloqueado: true }));

    const resultado = await provider.options.authorize(
      { email: "maria@exemplo.com", password: "SenhaForte123" },
      {} as Request,
    );

    expect(resultado).toBeNull();
    expect(verifyMock).not.toHaveBeenCalled();
  });

  it("senha errada → null (verify chamado com o hash real do usuário)", async () => {
    const usuario = criarUsuarioFake();
    findUniqueMock.mockResolvedValue(usuario);
    verifyMock.mockResolvedValue(false);

    const resultado = await provider.options.authorize(
      { email: usuario.email, password: "SenhaErrada123" },
      {} as Request,
    );

    expect(resultado).toBeNull();
    expect(verifyMock).toHaveBeenCalledWith(usuario.senha_hash, "SenhaErrada123");
  });

  it("credenciais válidas → usuário com id/email/name/role/tokenVersion (projeção do authorize)", async () => {
    const usuario = criarUsuarioFake();
    findUniqueMock.mockResolvedValue(usuario);
    verifyMock.mockResolvedValue(true);

    const resultado = await provider.options.authorize(
      { email: usuario.email, password: "SenhaForte123" },
      {} as Request,
    );

    expect(resultado).toEqual({
      id: usuario.id,
      email: usuario.email,
      name: usuario.nome,
      role: usuario.role,
      tokenVersion: usuario.tokenVersion,
    });
    expect(verifyMock).toHaveBeenCalledTimes(1);
  });
});

describe("verificarSessaoValida (enforcement NODE — BLOCKER-1: nunca no middleware)", () => {
  it("sem sessão (null/undefined) → inválida, sem consulta ao banco", async () => {
    await expect(verificarSessaoValida(null)).resolves.toBe(false);
    await expect(verificarSessaoValida(undefined)).resolves.toBe(false);
    expect(findUniqueMock).not.toHaveBeenCalled();
  });

  it("sessão sem user.id → inválida, sem consulta ao banco", async () => {
    const sessaoSemId = {
      user: {
        role: "aluno" as const,
        tokenVersion: 1,
        name: "Aluno",
        email: "aluno@exemplo.com",
        image: null,
      },
      expires: new Date(Date.now() + 86_400_000).toISOString(),
    } as unknown as Session;

    await expect(verificarSessaoValida(sessaoSemId)).resolves.toBe(false);
    expect(findUniqueMock).not.toHaveBeenCalled();
  });

  it("usuário não encontrado no banco → sessão inválida", async () => {
    findUniqueMock.mockResolvedValue(null);

    await expect(verificarSessaoValida(criaSessao())).resolves.toBe(false);
  });

  it("tokenVersion divergente (bump do bloqueio) → sessão inválida", async () => {
    findUniqueMock.mockResolvedValue({ tokenVersion: 9, bloqueado: false });

    await expect(
      verificarSessaoValida(criaSessao({ tokenVersion: 1 })),
    ).resolves.toBe(false);
  });

  it("usuário bloqueado → sessão inválida (mesmo com versão igual)", async () => {
    findUniqueMock.mockResolvedValue({ tokenVersion: 1, bloqueado: true });

    await expect(verificarSessaoValida(criaSessao())).resolves.toBe(false);
  });

  it("tokenVersion igual + usuário ativo → sessão válida", async () => {
    findUniqueMock.mockResolvedValue({ tokenVersion: 1, bloqueado: false });

    await expect(verificarSessaoValida(criaSessao())).resolves.toBe(true);
  });
});
