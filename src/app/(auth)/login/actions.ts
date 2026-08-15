// Server Action de LOGIN — rota fina: parse → service → respond (AGENTS §6).
//
// Fluxo: parse do FormData + IP → `login()` (service: rate limit, credenciais,
// conta suspensa — TODA a lógica está lá) → em SUcesso `signIn` (cria a sessão
// Auth.js) → redirect /app. Erros `ErroAuth` viram estado serializável para a
// UI (mensagem pt-BR + retryAfter quando rate_limit). Nenhuma regra de negócio
// duplicada aqui.
"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { AuthError } from "next-auth";

import { signIn } from "@/lib/auth/auth";
import { ErroAuth } from "@/services/auth/erros";
import { login } from "@/services/auth/login";

/** Erro serializável exibido pela UI (shape do ErroAuth, sem a instância). */
export interface ErroLogin {
  code: string;
  mensagem: string;
  retryAfter?: number;
}

export interface EstadoLogin {
  erro?: ErroLogin;
}

export async function loginAction(
  _prevState: EstadoLogin,
  formData: FormData,
): Promise<EstadoLogin> {
  // Parse (nunca logar a senha).
  const email = String(formData.get("email") ?? "").trim();
  const senha = String(formData.get("senha") ?? "");

  try {
    await login({ email, senha, ip: await obterIp() });
  } catch (erro) {
    if (erro instanceof ErroAuth) {
      // Mensagens canônicas pt-BR vêm do service (credenciais genéricas,
      // conta suspensa, rate limit com retryAfter) — a UI apenas renderiza.
      return {
        erro: {
          code: erro.code,
          mensagem: erro.mensagem,
          retryAfter: erro.retryAfter,
        },
      };
    }
    console.error("[loginAction] erro inesperado do service", erro);
    return {
      erro: {
        code: "erro_interno",
        mensagem: "algo deu errado, tente novamente",
      },
    };
  }

  try {
    // Padrão que funciona com next-auth@beta.32 (verificado no source):
    // o authorize do Credentials recebe o body BRUTO — ele lê `c.email` e
    // `c.password` (chaves declaradas em `credentials:` no auth.config).
    // Por isso o campo pt-BR `senha` é mapeado para a chave `password`.
    // `redirect: false` devolve a URL em vez de redirecionar (o redirect é
    // feito abaixo com controle explícito para /app).
    await signIn("credentials", {
      email,
      password: senha,
      redirectTo: "/app",
      redirect: false,
    });
  } catch (erro) {
    // Corrida rara: o service validou, mas o authorize falhou (ex.: senha
    // alterada entre as duas chamadas). Mensagem genérica — nunca revelar
    // detalhes. Demais erros sobem (bug real deve estourar).
    if (erro instanceof AuthError && erro.type === "CredentialsSignin") {
      return {
        erro: {
          code: "credenciais_invalidas",
          mensagem: "email ou senha incorretos",
        },
      };
    }
    throw erro;
  }

  redirect("/app");
}

/** IP do cliente: primeiro valor de x-forwarded-for, ou 'unknown' (dev = ::1). */
async function obterIp(): Promise<string> {
  const cabecalhos = await headers();
  return cabecalhos.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
}
