// Server Action de CADASTRO — rota fina: parse → service → respond (AGENTS §6).
//
// Fluxo: parse do FormData + IP → `registrar()` (service US-01: validação
// nome/email/senha/LGPD + unicidade + hash argon2 — TODA a lógica está lá) →
// em sucesso `signIn` (cria a sessão do usuário recém-criado) → redirect /app.
// Erros `ErroAuth` (code "validacao" com `campo`) viram estado serializável;
// a UI exibe a mensagem sob o campo correspondente. Nenhuma regra de negócio
// duplicada aqui.
"use server";

import { redirect } from "next/navigation";
import { AuthError } from "next-auth";

import { signIn } from "@/lib/auth/auth";
import { ErroAuth } from "@/services/auth/erros";
import { registrar } from "@/services/auth/registrar";

/** Erro serializável exibido pela UI (shape do ErroAuth, sem a instância). */
export interface ErroCadastro {
  code: string;
  mensagem: string;
  campo?: string;
}

export interface EstadoCadastro {
  erro?: ErroCadastro;
}

export async function cadastroAction(
  _prevState: EstadoCadastro,
  formData: FormData,
): Promise<EstadoCadastro> {
  // Parse (nunca logar a senha). Checkbox ausente = `null` → false.
  const nome = String(formData.get("nome") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const senha = String(formData.get("senha") ?? "");
  const consentimentoLgpd = formData.get("consentimentoLgpd") === "on";

  try {
    await registrar({ nome, email, senha, consentimentoLgpd });
  } catch (erro) {
    if (erro instanceof ErroAuth) {
      // Mensagens pt-BR e `campo` vêm do service — a UI mapeia campo → input.
      return {
        erro: {
          code: erro.code,
          mensagem: erro.mensagem,
          campo: erro.campo,
        },
      };
    }
    console.error("[cadastroAction] erro inesperado do service", erro);
    return {
      erro: {
        code: "erro_interno",
        mensagem: "algo deu errado, tente novamente",
      },
    };
  }

  try {
    // Mesmo padrão do login (ver actions.ts do login): authorize lê as chaves
    // `email`/`password` do body — o campo pt-BR `senha` é mapeado aqui.
    await signIn("credentials", {
      email,
      password: senha,
      redirectTo: "/app",
      redirect: false,
    });
  } catch (erro) {
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
