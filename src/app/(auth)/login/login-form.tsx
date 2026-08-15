// Formulário de LOGIN (client) — UX sugar sobre a server action.
//
// Validação AUTORITATIVA no servidor (service `login()`); este componente só
// coleta os campos, exibe o estado (pendente/erro) e mapeia o erro retornado.
// Validação nativa do browser (required/type) é açúcar UX apenas.
//
// Seletores estáveis para o E2E (todo 15): #login-email, #login-senha,
// botão submit type=submit.
"use client";

import Link from "next/link";
import { useActionState } from "react";
import { cn } from "@/lib/utils";

import { loginAction, type EstadoLogin } from "./actions";

const ESTADO_INICIAL: EstadoLogin = {};

const CLASSE_INPUT =
  "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 " +
  "text-sm shadow-sm transition-colors placeholder:text-muted-foreground " +
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring " +
  "disabled:cursor-not-allowed disabled:opacity-50";

export function LoginForm() {
  const [state, formAction, pendente] = useActionState(
    loginAction,
    ESTADO_INICIAL,
  );

  return (
    <form action={formAction} className="space-y-4">
      <div className="space-y-1.5">
        <label htmlFor="login-email" className="text-sm font-medium">
          Email
        </label>
        <input
          id="login-email"
          name="email"
          type="email"
          autoComplete="email"
          required
          disabled={pendente}
          className={CLASSE_INPUT}
        />
      </div>

      <div className="space-y-1.5">
        <label htmlFor="login-senha" className="text-sm font-medium">
          Senha
        </label>
        <input
          id="login-senha"
          name="senha"
          type="password"
          autoComplete="current-password"
          required
          disabled={pendente}
          className={CLASSE_INPUT}
        />
      </div>

      {state.erro && (
        <div
          role="alert"
          className="rounded-md border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive"
        >
          <p>{state.erro.mensagem}</p>
          {state.erro.code === "rate_limit" && state.erro.retryAfter !== undefined && (
            <p className="mt-1 text-xs opacity-90">
              aguarde {Math.ceil(state.erro.retryAfter / 60)} minuto(s) para
              tentar novamente
            </p>
          )}
        </div>
      )}

      <button
        type="submit"
        disabled={pendente}
        className={cn(
          "inline-flex h-9 w-full items-center justify-center rounded-md",
          "bg-primary px-4 text-sm font-medium text-primary-foreground",
          "shadow-sm transition-colors hover:bg-primary/90",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          "disabled:cursor-not-allowed disabled:opacity-50",
        )}
      >
        {pendente ? "Entrando…" : "Entrar"}
      </button>

      <p className="text-center text-sm text-muted-foreground">
        Não tem conta?{" "}
        <Link
          href="/cadastro"
          className="font-medium text-foreground hover:underline"
        >
          cadastre-se
        </Link>
      </p>
    </form>
  );
}
