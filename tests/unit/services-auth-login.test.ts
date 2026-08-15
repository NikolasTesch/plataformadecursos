// Testes unitários do serviço de login — US-02 (SPEC-auth §3.2).
//
// TDD (todo 11): testes escritos ANTES da implementação. Dependências
// injetadas via `deps` (db fake tipado `DbLogin` + limiter fake com
// check/record espiados). O módulo `@/lib/db` é mockado para impedir a
// construção do PrismaClient real; argon2 é mockado para espiar `verify`
// (prova de que o rate limit bloqueia ANTES do custo do hash).
//
// Convenção de erros (D27): falhas lançam `ErroAuth` (alias `AuthErro`) com
// code discriminante + mensagem pt-BR. Decisão D33: contas bloqueadas NÃO
// registram falha no limiter (já estão travadas).
import { describe, expect, it, vi, beforeEach } from "vitest";
import type { users } from "@/generated/prisma/client";

const verifyMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/db", () => ({
  db: {
    users: {
      findUnique: vi.fn(),
    },
  },
}));

vi.mock("argon2", () => ({ verify: verifyMock }));

import { login, type DbLogin, type LimiterLogin } from "@/services/auth/login";
import { ErroAuth } from "@/services/auth/erros";

// Mensagens canônicas — espelham as constantes locais do serviço (login.ts).
const MENSAGENS_LOGIN = {
  credenciaisInvalidas: "email ou senha incorretos",
  contaSuspensa: "conta suspensa",
  rateLimit: "muitas tentativas, tente novamente em 15 minutos",
} as const;

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

/** Fake do db de login — tipado contra o contrato mínimo do serviço. */
function criarDbFake(encontrado: users | null = null) {
  const findUnique = vi.fn<DbLogin["users"]["findUnique"]>(
    async () => encontrado,
  );
  return { db: { users: { findUnique } }, findUnique };
}

/** Fake do limiter — check/record espiados, resultado configurável. */
function criarLimiterFake(
  checkResult: { allowed: boolean; retryAfterSeconds: number } = {
    allowed: true,
    retryAfterSeconds: 0,
  },
) {
  const check = vi.fn<LimiterLogin["check"]>(() => checkResult);
  const record = vi.fn<LimiterLogin["record"]>();
  return { limiter: { check, record }, check, record };
}

const dadosLogin = {
  email: "  Maria@Exemplo.com  ",
  senha: "SenhaForte123",
  ip: "203.0.113.7",
};

// Email normalizado pelo serviço (trim + lowercase) — chave do limiter e busca.
const emailNormalizado = "maria@exemplo.com";
const chaveEsperada = `${dadosLogin.ip}:${emailNormalizado}`;

describe("login (US-02)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    verifyMock.mockReset();
  });

  describe("caso de sucesso", () => {
    it("retorna projeção sanitizada (SEM senha_hash) e NÃO registra falha", async () => {
      const usuario = criarUsuarioFake();
      const { db } = criarDbFake(usuario);
      const { limiter } = criarLimiterFake();
      verifyMock.mockResolvedValue(true);

      const resultado = await login(dadosLogin, { db, loginLimiter: limiter });

      // Projeção limpa: id/nome/email/role/verificado_em/bloqueado/tokenVersion.
      expect(resultado).toEqual({
        id: usuario.id,
        nome: usuario.nome,
        email: usuario.email,
        role: "aluno",
        verificado_em: null,
        bloqueado: false,
        tokenVersion: 0,
      });
      // A1: hash nunca é retornado ao caller.
      expect(resultado).not.toHaveProperty("senha_hash");
      // Busca feita com email normalizado.
      expect(db.users.findUnique).toHaveBeenCalledWith({
        where: { email: emailNormalizado },
      });
      // Sucesso não consome o orçamento (record-on-failure, MAJOR-3).
      expect(limiter.record).not.toHaveBeenCalled();
    });
  });

  describe("credenciais inválidas", () => {
    it("senha errada → erro genérico + record chamado exatamente 1x", async () => {
      const { db } = criarDbFake(criarUsuarioFake());
      const { limiter, record } = criarLimiterFake();
      verifyMock.mockResolvedValue(false);

      const erro = await login(dadosLogin, { db, loginLimiter: limiter }).catch(
        (e: unknown) => e,
      );
      expect(erro).toBeInstanceOf(ErroAuth);
      expect(erro).toMatchObject({
        code: "credenciais_invalidas",
        mensagem: MENSAGENS_LOGIN.credenciaisInvalidas,
      });

      // record-on-failure: registra a falha real com a chave `${ip}:${email}`.
      expect(record).toHaveBeenCalledTimes(1);
      expect(record).toHaveBeenCalledWith(chaveEsperada);
    });

    it("usuário inexistente → MESMO erro genérico do senha errada (sem leak) + record", async () => {
      const { db } = criarDbFake(null);
      const { limiter, record } = criarLimiterFake();

      await expect(login(dadosLogin, { db, loginLimiter: limiter })).rejects.toMatchObject(
        {
          code: "credenciais_invalidas",
          mensagem: MENSAGENS_LOGIN.credenciaisInvalidas,
        },
      );
      // Usuário inexistente não chega ao argon2 (proteção de custo + paridade
      // de comportamento com senha errada).
      expect(verifyMock).not.toHaveBeenCalled();
      expect(record).toHaveBeenCalledTimes(1);
      expect(record).toHaveBeenCalledWith(chaveEsperada);
    });
  });

  describe("conta suspensa (US-02 §3.2)", () => {
    it("bloqueado → 'conta suspensa' e record NÃO é chamado (D33)", async () => {
      const { db } = criarDbFake(criarUsuarioFake({ bloqueado: true }));
      const { limiter, record } = criarLimiterFake();
      // Mesmo que a senha fosse válida, o bloqueio precede a verificação.
      verifyMock.mockResolvedValue(true);

      await expect(login(dadosLogin, { db, loginLimiter: limiter })).rejects.toMatchObject(
        {
          code: "conta_suspensa",
          mensagem: MENSAGENS_LOGIN.contaSuspensa,
        },
      );
      // Conta bloqueada não registra falha (decisão D33) e não roda argon2.
      expect(record).not.toHaveBeenCalled();
      expect(verifyMock).not.toHaveBeenCalled();
    });
  });

  describe("rate limit (A4: 5 falhas/min por IP+email)", () => {
    it("6ª tentativa (bloqueado) → rate_limit com retryAfter; argon2 e db NÃO são chamados", async () => {
      const { db, findUnique } = criarDbFake(criarUsuarioFake());
      const { limiter } = criarLimiterFake({
        allowed: false,
        retryAfterSeconds: 55,
      });
      verifyMock.mockResolvedValue(false);

      await expect(login(dadosLogin, { db, loginLimiter: limiter })).rejects.toMatchObject(
        {
          code: "rate_limit",
          mensagem: MENSAGENS_LOGIN.rateLimit,
          retryAfter: 55,
        },
      );

      // Rate limit ANTES do argon2 e da busca — prova que verify não rodou.
      expect(verifyMock).not.toHaveBeenCalled();
      expect(findUnique).not.toHaveBeenCalled();
    });

    it("rate limit tem precedência sobre credenciais erradas", async () => {
      const { db, findUnique } = criarDbFake(null); // usuário nem existe
      const { limiter, record } = criarLimiterFake({
        allowed: false,
        retryAfterSeconds: 30,
      });

      await expect(login(dadosLogin, { db, loginLimiter: limiter })).rejects.toMatchObject(
        {
          code: "rate_limit",
          retryAfter: 30,
        },
      );
      expect(findUnique).not.toHaveBeenCalled();
      expect(record).not.toHaveBeenCalled();
    });

    it("5 logins bem-sucedidos NÃO bloqueiam e NÃO registram nenhuma falha", async () => {
      const { db } = criarDbFake(criarUsuarioFake());
      const { limiter, check, record } = criarLimiterFake();
      verifyMock.mockResolvedValue(true);

      for (let i = 0; i < 5; i++) {
        const resultado = await login(dadosLogin, { db, loginLimiter: limiter });
        expect(resultado.email).toBe(emailNormalizado);
      }

      // check foi consultado a cada login (permitido), mas nunca houve record.
      expect(check).toHaveBeenCalledTimes(5);
      expect(record).not.toHaveBeenCalled();
    });
  });
});
