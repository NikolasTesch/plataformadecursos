// Testes unitários do serviço de registro de aluno — US-01 (SPEC-auth §3.1).
//
// TDD (todo 10): testes escritos ANTES da implementação. O `db` é injetado via
// `deps` (fake tipado com `DbRegistrar`) para isolar a regra de negócio; o
// módulo `@/lib/db` é mockado para impedir a construção do PrismaClient real
// (driver adapter exige DATABASE_URL — ver notepads todo 4, D11). Um teste
// cobre o wiring default (chamar `registrar` sem deps usa o singleton mockado).
//
// Convenção de erros (D27): TODA falha de validação — inclusive email duplicado
// — vira `ErroAuth` com code "validacao" (decisão D28: a duplicata não pode
// revelar existência além do fluxo de registro; a mesma forma de erro não
// distingue "email inválido" de "email já cadastrado" pelo code).
import { describe, expect, it, vi, beforeEach } from "vitest";
import type { users } from "@/generated/prisma/client";

const mocksDb = vi.hoisted(() => ({
  findUnique: vi.fn(),
  create: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  db: {
    users: mocksDb,
  },
}));

import {
  registrar,
  type DadosRegistro,
  type DbRegistrar,
} from "@/services/auth/registrar";
import { ErroAuth } from "@/services/auth/erros";

/** Usuário fake com TODOS os campos do model `users` (necessário p/ o tipo). */
function criarUsuarioFake(overrides: Partial<users> = {}): users {
  const agora = new Date("2026-08-15T12:00:00Z");
  return {
    id: "user-fake-uuid-1",
    nome: "Maria Aluna",
    email: "maria@exemplo.com",
    senha_hash: "$argon2id$fake-hash-para-teste",
    role: "aluno",
    verificado_em: null,
    bloqueado: false,
    consentimento_lgpd_em: agora,
    trial_usado: false,
    meta_diaria_minutos: 30,
    tokenVersion: 0,
    criado_em: agora,
    atualizado_em: agora,
    ...overrides,
  };
}

/** Fake do db de registro — tipado contra o contrato mínimo do serviço. */
function criarDbFake(
  existente: users | null = null,
  criado: users = criarUsuarioFake(),
) {
  const findUnique = vi.fn<DbRegistrar["users"]["findUnique"]>(
    async () => existente,
  );
  const create = vi.fn<DbRegistrar["users"]["create"]>(async () => criado);
  return { db: { users: { findUnique, create } }, findUnique, create };
}

const dadosValidos: DadosRegistro = {
  nome: "  Maria Aluna  ",
  email: "Maria@Exemplo.com",
  senha: "SenhaForte123",
  consentimentoLgpd: true,
};

describe("registrar (US-01)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("caso de sucesso", () => {
    it("cria aluno com hash argon2id, email normalizado, role aluno e consentimento registrado", async () => {
      const criado = criarUsuarioFake();
      const { db, findUnique, create } = criarDbFake(null, criado);

      const usuario = await registrar(dadosValidos, { db });

      expect(usuario).toBe(criado);
      // Unicidade conferida ANTES do hash (com email normalizado).
      expect(findUnique).toHaveBeenCalledWith({
        where: { email: "maria@exemplo.com" },
      });
      const argsCreate = create.mock.calls[0][0];
      expect(argsCreate.data.senha_hash).toMatch(/^\$argon2id\$/);
      expect(argsCreate.data.email).toBe("maria@exemplo.com");
      expect(argsCreate.data.nome).toBe("Maria Aluna"); // trim aplicado
      expect(argsCreate.data.role).toBe("aluno");
      expect(argsCreate.data.consentimento_lgpd_em).toBeInstanceOf(Date);
    });

    it("usa o db padrão (@/lib/db) quando deps não é informado", async () => {
      mocksDb.findUnique.mockResolvedValue(null);
      const criado = criarUsuarioFake();
      mocksDb.create.mockResolvedValue(criado);

      const usuario = await registrar(dadosValidos);

      expect(usuario).toBe(criado);
      expect(mocksDb.create).toHaveBeenCalledTimes(1);
    });
  });

  describe("validação de nome", () => {
    it("rejeita nome com menos de 2 caracteres", async () => {
      const { db } = criarDbFake();
      await expect(
        registrar({ ...dadosValidos, nome: "A" }, { db }),
      ).rejects.toMatchObject({ code: "validacao", campo: "nome" });
    });

    it("rejeita nome com mais de 120 caracteres", async () => {
      const { db } = criarDbFake();
      await expect(
        registrar({ ...dadosValidos, nome: "x".repeat(121) }, { db }),
      ).rejects.toMatchObject({ code: "validacao", campo: "nome" });
    });

    it("rejeita nome em branco (após trim)", async () => {
      const { db } = criarDbFake();
      await expect(
        registrar({ ...dadosValidos, nome: "   " }, { db }),
      ).rejects.toMatchObject({ code: "validacao", campo: "nome" });
    });
  });

  describe("validação de email", () => {
    it("rejeita email em formato inválido", async () => {
      const { db, findUnique } = criarDbFake();
      await expect(
        registrar({ ...dadosValidos, email: "email-sem-arroba" }, { db }),
      ).rejects.toMatchObject({ code: "validacao", campo: "email" });
      // Validação acontece antes de tocar no banco.
      expect(findUnique).not.toHaveBeenCalled();
    });

    it("email duplicado → erro amigável de validação e NENHUMA criação", async () => {
      const existente = criarUsuarioFake({ email: "maria@exemplo.com" });
      const { db, create } = criarDbFake(existente);

      const erro = await registrar(dadosValidos, { db }).catch(
        (e: unknown) => e,
      );

      expect(erro).toBeInstanceOf(ErroAuth);
      expect(erro).toMatchObject({
        code: "validacao",
        campo: "email",
        mensagem: "este email já está cadastrado",
      });
      // A duplicata NÃO gera uma segunda criação.
      expect(create).not.toHaveBeenCalled();
    });
  });

  describe("validação de senha", () => {
    it("rejeita senha com menos de 8 caracteres", async () => {
      const { db } = criarDbFake();
      await expect(
        registrar({ ...dadosValidos, senha: "1234567" }, { db }),
      ).rejects.toMatchObject({ code: "validacao", campo: "senha" });
    });

    it("rejeita senha com mais de 72 caracteres (limite do argon2)", async () => {
      const { db } = criarDbFake();
      await expect(
        registrar({ ...dadosValidos, senha: "a".repeat(73) }, { db }),
      ).rejects.toMatchObject({ code: "validacao", campo: "senha" });
    });
  });

  describe("consentimento LGPD (obrigatório por US-01)", () => {
    it("rejeita consentimentoLgpd: false", async () => {
      const { db } = criarDbFake();
      await expect(
        registrar({ ...dadosValidos, consentimentoLgpd: false }, { db }),
      ).rejects.toMatchObject({ code: "validacao", campo: "consentimentoLgpd" });
    });

    it("rejeita consentimentoLgpd ausente", async () => {
      const { db } = criarDbFake();
      const semConsentimento = {
        nome: dadosValidos.nome,
        email: dadosValidos.email,
        senha: dadosValidos.senha,
      } as DadosRegistro;
      await expect(
        registrar(semConsentimento, { db }),
      ).rejects.toMatchObject({ code: "validacao", campo: "consentimentoLgpd" });
    });

    it("não toca no banco quando a validação falha (nenhum findUnique/create)", async () => {
      const { db, findUnique, create } = criarDbFake();
      await expect(
        registrar({ ...dadosValidos, senha: "curta" }, { db }),
      ).rejects.toMatchObject({ code: "validacao", campo: "senha" });
      expect(findUnique).not.toHaveBeenCalled();
      expect(create).not.toHaveBeenCalled();
    });
  });
});
