// Formulário de CURSO (client) — UX sugar sobre as server actions.
//
// Usado na criação (/admin/cursos/novo) e na edição (/admin/cursos/[id]).
// Validação AUTORITATIVA no servidor (services/conteudo: nome 2-120, slug
// regex + unicidade + C1); este componente só coleta campos e renderiza o
// estado (pendente/erro) retornado pela action.
//
// Slug: auto-gerado do nome enquanto o usuário não editar manualmente. O
// `slugificar` aqui é um ESPELHO de UX do `gerarSlug` do serviço (mesma
// lógica) — o servidor é autoritativo (regex/unicidade/imutabilidade C1 são
// validadas lá). Em edição com C1 ativo (1º material publicado), o slug fica
// bloqueado no form e a action nunca o envia.
//
// Seletores estáveis para E2E: #curso-nome, #curso-slug, #curso-descricao,
// #curso-assinatura; erros com role="alert".
"use client";

import Link from "next/link";
import { useState } from "react";
import { useActionState } from "react";
import { cn } from "@/lib/utils";

import {
  atualizarCursoAction,
  criarCursoAction,
  type EstadoAdmin,
} from "../actions";

const ESTADO_INICIAL: EstadoAdmin = {};

const CLASSE_INPUT =
  "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 " +
  "text-sm shadow-sm transition-colors placeholder:text-muted-foreground " +
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring " +
  "disabled:cursor-not-allowed disabled:opacity-50";

const CLASSE_TEXTAREA =
  "flex min-h-24 w-full rounded-md border border-input bg-transparent px-3 py-2 " +
  "text-sm shadow-sm transition-colors placeholder:text-muted-foreground " +
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring " +
  "disabled:cursor-not-allowed disabled:opacity-50";

/** Espelho de UX do `gerarSlug` do serviço (cursos.ts) — servidor é autoritativo. */
function slugificar(nome: string): string {
  return nome
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export interface CursoFormDados {
  id: string;
  nome: string;
  descricao: string | null;
  slug: string;
  incluido_assinatura: boolean;
}

interface Props {
  modo: "novo" | "editar";
  /** Presente apenas em edição. */
  curso?: CursoFormDados;
  /** C1: true quando o curso já tem material publicado → slug imutável. */
  slugBloqueado?: boolean;
}

export function CursoForm({ modo, curso, slugBloqueado = false }: Props) {
  const action = modo === "novo" ? criarCursoAction : atualizarCursoAction;
  const [state, formAction, pendente] = useActionState(action, ESTADO_INICIAL);

  const [nome, setNome] = useState(curso?.nome ?? "");
  const [slug, setSlug] = useState(curso?.slug ?? "");
  const [slugEditado, setSlugEditado] = useState(modo === "editar");

  const erroNome = state.erro?.campo === "nome" ? state.erro.mensagem : undefined;
  const erroSlug = state.erro?.campo === "slug" ? state.erro.mensagem : undefined;

  function aoMudarNome(valor: string) {
    setNome(valor);
    // Auto-slug apenas enquanto o usuário não editou o campo manualmente.
    if (!slugEditado && modo === "novo") {
      setSlug(slugificar(valor));
    }
  }

  return (
    <form action={formAction} className="space-y-5">
      {modo === "editar" && curso && (
        <input type="hidden" name="id" value={curso.id} />
      )}

      <div className="space-y-1.5">
        <label htmlFor="curso-nome" className="text-sm font-medium">
          Nome <span className="text-destructive">*</span>
        </label>
        <input
          id="curso-nome"
          name="nome"
          type="text"
          required
          value={nome}
          onChange={(e) => aoMudarNome(e.target.value)}
          disabled={pendente}
          aria-invalid={erroNome !== undefined}
          aria-describedby={erroNome ? "curso-nome-erro" : undefined}
          className={cn(CLASSE_INPUT, erroNome && "border-destructive")}
        />
        {erroNome && (
          <p id="curso-nome-erro" className="text-xs text-destructive">
            {erroNome}
          </p>
        )}
      </div>

      <div className="space-y-1.5">
        <label htmlFor="curso-descricao" className="text-sm font-medium">
          Descrição
        </label>
        <textarea
          id="curso-descricao"
          name="descricao"
          defaultValue={curso?.descricao ?? ""}
          placeholder="opcional — aparece na página pública do curso"
          disabled={pendente}
          className={CLASSE_TEXTAREA}
        />
      </div>

      <div className="space-y-1.5">
        <label htmlFor="curso-slug" className="text-sm font-medium">
          Slug
        </label>
        <input
          id="curso-slug"
          name="slug"
          type="text"
          autoComplete="off"
          value={slug}
          onChange={(e) => {
            setSlugEditado(true);
            setSlug(e.target.value);
          }}
          disabled={pendente || slugBloqueado}
          aria-invalid={erroSlug !== undefined}
          aria-describedby={
            erroSlug
              ? "curso-slug-erro"
              : slugBloqueado
                ? "curso-slug-c1"
                : undefined
          }
          className={cn(CLASSE_INPUT, erroSlug && "border-destructive")}
        />
        {erroSlug ? (
          <p id="curso-slug-erro" className="text-xs text-destructive">
            {erroSlug}
          </p>
        ) : slugBloqueado ? (
          <p id="curso-slug-c1" className="text-xs text-muted-foreground">
            o slug não pode ser alterado após o primeiro material publicado (C1)
          </p>
        ) : (
          <p className="text-xs text-muted-foreground">
            deixe vazio para gerar automaticamente do nome
          </p>
        )}
      </div>

      <label className="flex items-start gap-2 text-sm">
        <input
          id="curso-assinatura"
          name="incluido_assinatura"
          type="checkbox"
          defaultChecked={curso?.incluido_assinatura ?? false}
          disabled={pendente}
          className="mt-0.5 h-4 w-4 rounded border-input accent-primary"
        />
        <span>
          <span className="font-medium">Incluído na assinatura</span>
          <span className="block text-xs text-muted-foreground">
            alunos com assinatura ativa acessam este curso sem compra avulsa
          </span>
        </span>
      </label>

      {state.erro && state.erro.campo === undefined && (
        <div
          role="alert"
          className="rounded-md border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive"
        >
          {state.erro.mensagem}
        </div>
      )}

      <div className="flex items-center gap-2">
        <button
          type="submit"
          disabled={pendente}
          className={cn(
            "inline-flex h-9 items-center justify-center rounded-md",
            "bg-primary px-4 text-sm font-medium text-primary-foreground",
            "shadow-sm transition-colors hover:bg-primary/90",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            "disabled:cursor-not-allowed disabled:opacity-50",
          )}
        >
          {pendente
            ? "Salvando…"
            : modo === "novo"
              ? "Criar curso"
              : "Salvar alterações"}
        </button>
        <Link
          href="/admin/cursos"
          className="inline-flex h-9 items-center justify-center rounded-md border border-input bg-transparent px-4 text-sm font-medium transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          Cancelar
        </Link>
      </div>
    </form>
  );
}
