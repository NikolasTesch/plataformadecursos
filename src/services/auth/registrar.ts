// Serviço de registro de aluno — US-01 (SPEC-auth §3.1).
//
// Valida entradas (nome 2–120, email válido, senha 8–72, consentimento LGPD
// obrigatório), confere unicidade do email ANTES de hashear (evita custo do
// argon2 para duplicatas), gera hash argon2id e cria o usuário com role
// "aluno". Email duplicado NÃO revela existência além do fluxo de registro:
// vira um erro de validação comum (code "validacao"), mesma forma de qualquer
// entrada inválida — decisão D28 (SPEC-auth §3.1).
//
// Dependência de banco INJETÁVEL: produção chama `registrar(dados)` (usa o
// singleton @/lib/db); testes injetam um fake tipado via `deps.db`.
import argon2 from "argon2";
import { db as dbPadrao } from "@/lib/db";
import type { users } from "@/generated/prisma/client";

import { erroValidacao } from "./erros";

export interface DbRegistrar {
  users: {
    findUnique: (args: { where: { email: string } }) => Promise<users | null>;
    create: (args: {
      data: {
        nome: string;
        email: string;
        senha_hash: string;
        role: "aluno";
        consentimento_lgpd_em: Date;
      };
    }) => Promise<users>;
  };
}

export interface DadosRegistro {
  nome: string;
  email: string;
  senha: string;
  consentimentoLgpd: boolean;
}

export interface DepsRegistrar {
  db?: DbRegistrar;
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validarNome(nome: unknown): string {
  const limpo = typeof nome === "string" ? nome.trim() : "";
  if (limpo.length < 2 || limpo.length > 120) {
    throw erroValidacao("nome", "o nome deve ter entre 2 e 120 caracteres");
  }
  return limpo;
}

function validarEmail(email: unknown): string {
  const normalizado = typeof email === "string" ? email.trim().toLowerCase() : "";
  if (!EMAIL_REGEX.test(normalizado)) {
    throw erroValidacao("email", "informe um email válido");
  }
  return normalizado;
}

function validarSenha(senha: unknown): void {
  if (typeof senha !== "string" || senha.length < 8) {
    throw erroValidacao("senha", "a senha deve ter no mínimo 8 caracteres");
  }
  if (senha.length > 72) {
    throw erroValidacao("senha", "a senha deve ter no máximo 72 caracteres");
  }
}

function validarConsentimento(consentimento: unknown): void {
  if (consentimento !== true) {
    throw erroValidacao(
      "consentimentoLgpd",
      "é necessário aceitar os termos da LGPD para continuar",
    );
  }
}

export async function registrar(
  dados: DadosRegistro,
  deps: DepsRegistrar = {},
): Promise<users> {
  const db = deps.db ?? dbPadrao;

  const nome = validarNome(dados.nome);
  const email = validarEmail(dados.email);
  validarSenha(dados.senha);
  validarConsentimento(dados.consentimentoLgpd);

  const existente = await db.users.findUnique({ where: { email } });
  if (existente) {
    throw erroValidacao("email", "este email já está cadastrado");
  }

  const senha_hash = await argon2.hash(dados.senha);

  return db.users.create({
    data: {
      nome,
      email,
      senha_hash,
      role: "aluno",
      consentimento_lgpd_em: new Date(),
    },
  });
}
