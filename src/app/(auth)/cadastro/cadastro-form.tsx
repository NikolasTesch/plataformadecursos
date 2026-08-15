// Formulário de CADASTRO (client) — UX sugar sobre a server action.
//
// Validação AUTORITATIVA no servidor (service `registrar()`); este componente
// coleta os campos, exibe pendência e mapeia o erro retornado (ErroAuth
// `validacao` com `campo`) sob o input correspondente. Validação nativa do
// browser (required/type) é açúcar UX apenas.
//
// Seletores estáveis para o E2E (todo 15): #cadastro-nome, #cadastro-email,
// #cadastro-senha, #cadastro-lgpd, botão submit type=submit.
"use client";

import Link from "next/link";
import { useActionState } from "react";
import { cn } from "@/lib/utils";

import { cadastroAction, type EstadoCadastro } from "./actions";

const ESTADO_INICIAL: EstadoCadastro = {};

const CLASSE_INPUT =
  "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 " +
  "text-sm shadow-sm transition-colors placeholder:text-muted-foreground " +
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring " +
  "disabled:cursor-not-allowed disabled:opacity-50";

const CLASSE_INPUT_ERRO =
  "border-destructive focus-visible:ring-destructive aria-[invalid=true]:border-destructive";

/** Mensagem de erro de um campo (ErroAuth.campo → input). */
function CampoErro({ id, texto }: { id: string; texto: string }) {
  if (!texto) return null;
  return (
    <p id={id} className="text-sm text-destructive" role="alert">
      {texto}
    </p>
  );
}

export function CadastroForm() {
  const [state, formAction, pendente] = useActionState(
    cadastroAction,
    ESTADO_INICIAL,
  );

  const erroCampo = state.erro?.campo;
  const erroNome = state.erro && erroCampo === "nome" ? state.erro.mensagem : "";
  const erroEmail =
    state.erro && erroCampo === "email" ? state.erro.mensagem : "";
  const erroSenha =
    state.erro && erroCampo === "senha" ? state.erro.mensagem : "";
  const erroLgpd =
    state.erro && erroCampo === "consentimentoLgpd"
      ? state.erro.mensagem
      : "";
  const erroGeral =
    state.erro && erroCampo === undefined ? state.erro.mensagem : "";

  return (
    <form action={formAction} className="space-y-4">
      <div className="space-y-1.5">
        <label htmlFor="cadastro-nome" className="text-sm font-medium">
          Nome
        </label>
        <input
          id="cadastro-nome"
          name="nome"
          type="text"
          autoComplete="name"
          required
          disabled={pendente}
          aria-invalid={erroNome ? true : undefined}
          aria-describedby={erroNome ? "cadastro-nome-erro" : undefined}
          className={cn(CLASSE_INPUT, erroNome && CLASSE_INPUT_ERRO)}
        />
        <CampoErro id="cadastro-nome-erro" texto={erroNome} />
      </div>

      <div className="space-y-1.5">
        <label htmlFor="cadastro-email" className="text-sm font-medium">
          Email
        </label>
        <input
          id="cadastro-email"
          name="email"
          type="email"
          autoComplete="email"
          required
          disabled={pendente}
          aria-invalid={erroEmail ? true : undefined}
          aria-describedby={erroEmail ? "cadastro-email-erro" : undefined}
          className={cn(CLASSE_INPUT, erroEmail && CLASSE_INPUT_ERRO)}
        />
        <CampoErro id="cadastro-email-erro" texto={erroEmail} />
      </div>

      <div className="space-y-1.5">
        <label htmlFor="cadastro-senha" className="text-sm font-medium">
          Senha
        </label>
        <input
          id="cadastro-senha"
          name="senha"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
          disabled={pendente}
          aria-invalid={erroSenha ? true : undefined}
          aria-describedby={erroSenha ? "cadastro-senha-erro" : undefined}
          className={cn(CLASSE_INPUT, erroSenha && CLASSE_INPUT_ERRO)}
        />
        <p className="text-xs text-muted-foreground">
          mínimo de 8 caracteres
        </p>
        <CampoErro id="cadastro-senha-erro" texto={erroSenha} />
      </div>

      <div className="space-y-1.5">
        <div className="flex items-start gap-2">
          <input
            id="cadastro-lgpd"
            name="consentimentoLgpd"
            type="checkbox"
            required
            disabled={pendente}
            aria-invalid={erroLgpd ? true : undefined}
            aria-describedby={erroLgpd ? "cadastro-lgpd-erro" : undefined}
            className="mt-1 h-4 w-4 rounded border-input accent-primary"
          />
          <label htmlFor="cadastro-lgpd" className="text-sm text-muted-foreground">
            Li e concordo com a coleta e o tratamento dos meus dados conforme
            a nota de privacidade (LGPD) da ConcursFoco.
          </label>
        </div>
        <CampoErro id="cadastro-lgpd-erro" texto={erroLgpd} />
      </div>

      {erroGeral && (
        <div
          role="alert"
          className="rounded-md border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive"
        >
          <p>{erroGeral}</p>
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
        {pendente ? "Criando conta…" : "Criar conta"}
      </button>

      <p className="text-center text-sm text-muted-foreground">
        Já tem conta?{" "}
        <Link
          href="/login"
          className="font-medium text-foreground hover:underline"
        >
          entrar
        </Link>
      </p>
    </form>
  );
}
