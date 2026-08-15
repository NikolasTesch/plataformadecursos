// Serviço de login — US-02 (SPEC-auth §3.2).
//
// Ordem dos checks (MAJOR-3, protege o custo do argon2):
//   1. RATE LIMIT PRIMEIRO: `check(`${ip}:${email}`)` ANTES de buscar usuário
//      ou rodar argon2 — bloqueado → `ErroAuth` code "rate_limit" com
//      `retryAfter` (segundos), mensagem canônica MENSAGENS_AUTH.rateLimit;
//   2. find user por email (normalizado: trim + lowercase);
//   3. !user OU senha inválida → erro genérico IDÊNTICO "email ou senha
//      incorretos" (sem diferenciar ausência de senha errada — sem leak de
//      existência) + `record` da falha (record-on-failure);
//   4. user.bloqueado → "conta suspensa" SEM `record` (decisão D33: contas
//      bloqueadas já estão travadas; registrar tentativa seria ruído e a
//      mensagem não deve revelar detalhe além do bloqueio);
//   5. sucesso → retorna projeção SANITIZADA do usuário (SEM senha_hash, A1) —
//      o caller (todo 13) chama signIn; NÃO registra.
//
// Dependências INJETÁVEIS: produção chama `login(dados)` (usa `@/lib/db` e
// `loginLimiter`); testes injetam fakes tipados via `deps`.
import { verify } from "argon2";
import { db as dbPadrao } from "@/lib/db";
import { loginLimiter } from "@/lib/rate-limit";
import type { Role, users } from "@/generated/prisma/client";

import { ErroAuth } from "./erros";

// Mensagens canônicas do login (SPEC-auth §3.2) — locais ao serviço; o
// erros.ts compartilhado (todo 10) define o shape, não as mensagens de login.
const MENSAGENS_LOGIN = {
  credenciaisInvalidas: "email ou senha incorretos",
  contaSuspensa: "conta suspensa",
  rateLimit: "muitas tentativas, tente novamente em 15 minutos",
} as const;

export interface DbLogin {
  users: {
    findUnique: (args: { where: { email: string } }) => Promise<users | null>;
  };
}

export interface LimiterLogin {
  check: (chave: string) => { allowed: boolean; retryAfterSeconds: number };
  record: (chave: string) => void;
}

export interface DadosLogin {
  email: string;
  senha: string;
  ip: string;
}

export interface DepsLogin {
  db?: DbLogin;
  loginLimiter?: LimiterLogin;
}

/** Projeção sanitizada do usuário logado — nunca contém `senha_hash` (A1). */
export interface UsuarioLogin {
  id: string;
  nome: string;
  email: string;
  role: Role;
  verificado_em: Date | null;
  bloqueado: boolean;
  tokenVersion: number;
}

export async function login(
  dados: DadosLogin,
  deps: DepsLogin = {},
): Promise<UsuarioLogin> {
  const db = deps.db ?? dbPadrao;
  const limiter = deps.loginLimiter ?? loginLimiter;

  // Email normalizado para a chave do rate limit e para a busca (evita que
  // variações de caixa burlem o limite e o lookup case-sensitive).
  const email = dados.email.trim().toLowerCase();
  const chave = `${dados.ip}:${email}`;

  // 1. Rate limit PRIMEIRO — bloqueio independe da credencial.
  const limite = limiter.check(chave);
  if (!limite.allowed) {
    throw new ErroAuth({
      code: "rate_limit",
      mensagem: MENSAGENS_LOGIN.rateLimit,
      retryAfter: limite.retryAfterSeconds,
    });
  }

  const user = await db.users.findUnique({ where: { email } });

  // 2+3. Usuário inexistente OU senha inválida: MESMO erro genérico.
  if (!user) {
    limiter.record(chave);
    throw new ErroAuth({
      code: "credenciais_invalidas",
      mensagem: MENSAGENS_LOGIN.credenciaisInvalidas,
    });
  }

  // 4. Conta bloqueada — checado ANTES do argon2 (economia de custo) e SEM
  //    registro (D29): a mensagem não detalha o motivo do bloqueio.
  if (user.bloqueado) {
    throw new ErroAuth({
      code: "conta_suspensa",
      mensagem: MENSAGENS_LOGIN.contaSuspensa,
    });
  }

  const senhaValida = await verify(user.senha_hash, dados.senha);
  if (!senhaValida) {
    limiter.record(chave);
    throw new ErroAuth({
      code: "credenciais_invalidas",
      mensagem: MENSAGENS_LOGIN.credenciaisInvalidas,
    });
  }

  // 5. Sucesso — projeção sem senha_hash (A1); caller faz o signIn.
  return {
    id: user.id,
    nome: user.nome,
    email: user.email,
    role: user.role,
    verificado_em: user.verificado_em,
    bloqueado: user.bloqueado,
    tokenVersion: user.tokenVersion,
  };
}
