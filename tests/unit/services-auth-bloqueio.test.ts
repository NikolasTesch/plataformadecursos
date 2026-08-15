// Testes unitários de logout + bloqueio (A3) e do enforcement Node de sessão.
//
// TDD (todo 12): teste escrito PRIMEIRO — fase RED verifica que os módulos
// ainda não existem; fase GREEN valida o comportamento contratual:
//
//   - setBloqueado(true): update com `tokenVersion: { increment: 1 }` E
//     `bloqueado: true` (E2E-A1 — o bump É o mecanismo de revogação: invalida
//     TODOS os JWTs emitidos antes imediatamente);
//   - setBloqueado(false): desbloqueio NÃO toca tokenVersion (A3/US-20 — o
//     desbloqueio não exige nova senha nem re-login);
//   - guard: admin não pode bloquear a si mesmo (erro, sem chamada de update);
//   - logout(): signOut com redirectTo "/login" (limpa cookie; a revogação
//     efetiva de sessões ativas é via tokenVersion);
//   - verificarSessaoValida (src/lib/auth/verificar-sessao.ts): enforcement
//     NODE da revogação, usado por páginas/actions/route handlers — NUNCA no
//     middleware/Edge (BLOCKER-1).
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Session } from "next-auth";

// Mocks hoisted (vitest exige que a fábrica do vi.mock rode antes dos imports).
const { updateMock, findUniqueMock, signOutMock } = vi.hoisted(() => ({
  updateMock: vi.fn(),
  findUniqueMock: vi.fn(),
  signOutMock: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  db: {
    users: {
      update: updateMock,
      findUnique: findUniqueMock,
    },
  },
}));

vi.mock("@/lib/auth/auth", () => ({
  signOut: signOutMock,
}));

import { setBloqueado } from "@/services/auth/bloqueio";
import { logout } from "@/services/auth/logout";
import { verificarSessaoValida } from "@/lib/auth/verificar-sessao";

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
  updateMock.mockReset();
  findUniqueMock.mockReset();
  signOutMock.mockReset();
});

describe("setBloqueado (A3 — bloquear revoga TODAS as sessões via tokenVersion)", () => {
  it("bloqueio: update com tokenVersion increment + bloqueado true (E2E-A1)", async () => {
    updateMock.mockResolvedValue({ id: "user-1", tokenVersion: 2, bloqueado: true });

    const updated = await setBloqueado("user-1", true);

    expect(updateMock).toHaveBeenCalledTimes(1);
    const args = updateMock.mock.calls[0][0];
    expect(args.where).toEqual({ id: "user-1" });
    // O bump É o mecanismo de revogação — assert dos DOIS campos.
    expect(args.data).toEqual({ tokenVersion: { increment: 1 }, bloqueado: true });
    expect(updated.id).toBe("user-1");
  });

  it("desbloqueio: update com bloqueado false e SEM tocar tokenVersion (A3)", async () => {
    updateMock.mockResolvedValue({ id: "user-1", tokenVersion: 1, bloqueado: false });

    const updated = await setBloqueado("user-1", false);

    expect(updateMock).toHaveBeenCalledTimes(1);
    const args = updateMock.mock.calls[0][0];
    expect(args.data).toEqual({ bloqueado: false });
    expect(args.data.tokenVersion).toBeUndefined();
    expect(updated.bloqueado).toBe(false);
  });

  it("admin não pode bloquear a si mesmo (erro, sem chamada de update)", async () => {
    await expect(
      setBloqueado("admin-1", true, { adminId: "admin-1" }),
    ).rejects.toThrow("não é possível bloquear a si mesmo");

    expect(updateMock).not.toHaveBeenCalled();
  });

  it("guard só protege o BLOQUEIO — desbloquear a si mesmo é permitido", async () => {
    updateMock.mockResolvedValue({ id: "admin-1", tokenVersion: 1, bloqueado: false });

    const updated = await setBloqueado("admin-1", false, { adminId: "admin-1" });

    expect(updateMock).toHaveBeenCalledTimes(1);
    expect(updated.bloqueado).toBe(false);
  });

  it("adminId de outro usuário não dispara o guard", async () => {
    updateMock.mockResolvedValue({ id: "user-2", tokenVersion: 2, bloqueado: true });

    await setBloqueado("user-2", true, { adminId: "admin-1" });

    expect(updateMock).toHaveBeenCalledTimes(1);
  });
});

describe("logout (US-02 — limpa a sessão)", () => {
  it("chama signOut com redirectTo /login (cookie limpo no cliente)", async () => {
    signOutMock.mockResolvedValue(undefined);

    await logout();

    expect(signOutMock).toHaveBeenCalledTimes(1);
    expect(signOutMock).toHaveBeenCalledWith({ redirectTo: "/login" });
  });
});

describe("verificarSessaoValida (enforcement NODE — BLOCKER-1: nunca no middleware)", () => {
  it("tokenVersion igual + usuário ativo → sessão válida", async () => {
    findUniqueMock.mockResolvedValue({ tokenVersion: 1, bloqueado: false });

    await expect(verificarSessaoValida(criaSessao())).resolves.toBe(true);
  });

  it("tokenVersion diferente (bump do bloqueio) → sessão inválida", async () => {
    findUniqueMock.mockResolvedValue({ tokenVersion: 5, bloqueado: false });

    await expect(
      verificarSessaoValida(criaSessao({ tokenVersion: 1 })),
    ).resolves.toBe(false);
  });

  it("usuário bloqueado → sessão inválida (mesmo com versão igual)", async () => {
    findUniqueMock.mockResolvedValue({ tokenVersion: 1, bloqueado: true });

    await expect(verificarSessaoValida(criaSessao())).resolves.toBe(false);
  });

  it("sem sessão (null/undefined) → inválida, sem consulta ao banco", async () => {
    await expect(verificarSessaoValida(null)).resolves.toBe(false);
    await expect(verificarSessaoValida(undefined)).resolves.toBe(false);
    expect(findUniqueMock).not.toHaveBeenCalled();
  });

  it("usuário não encontrado no banco → sessão inválida", async () => {
    findUniqueMock.mockResolvedValue(null);

    await expect(verificarSessaoValida(criaSessao())).resolves.toBe(false);
  });
});
