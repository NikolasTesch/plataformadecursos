// Diálogo de EXCLUSÃO de curso (client) — C6: confirmação digitando o nome.
//
// UX sugar: abre um diálogo, exige que o usuário digite o NOME EXATO do curso
// para habilitar o botão. A validação AUTORITATIVA é no servidor (a action
// chama `excluirCurso`, que compara o nome digitado e lança
// `confirmacao_necessaria` quando não confere) — a checagem client-side
// (botão desabilitado) é apenas conveniência.
"use client";

import { useState } from "react";
import { useActionState } from "react";
import { cn } from "@/lib/utils";

import { excluirCursoAction, type EstadoAdmin } from "./actions";

const ESTADO_INICIAL: EstadoAdmin = {};

const CLASSE_INPUT =
  "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 " +
  "text-sm shadow-sm transition-colors placeholder:text-muted-foreground " +
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring " +
  "disabled:cursor-not-allowed disabled:opacity-50";

interface Props {
  cursoId: string;
  cursoNome: string;
}

export function ExcluirCursoDialog({ cursoId, cursoNome }: Props) {
  const [aberto, setAberto] = useState(false);
  const [digitado, setDigitado] = useState("");
  const [state, formAction, pendente] = useActionState(
    excluirCursoAction,
    ESTADO_INICIAL,
  );

  const confere = digitado.trim() === cursoNome;

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setDigitado("");
          setAberto(true);
        }}
        className="inline-flex h-9 items-center justify-center rounded-md border border-destructive/40 bg-transparent px-3 text-sm font-medium text-destructive transition-colors hover:bg-destructive/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        Excluir
      </button>

      {aberto && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`Excluir curso ${cursoNome}`}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => setAberto(false)}
        >
          <div
            className="w-full max-w-md rounded-lg border bg-card p-6 shadow-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-semibold tracking-tight">
              Excluir curso
            </h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Esta ação é <strong>irreversível</strong>: módulos e materiais do
              curso também serão excluídos. Digite o nome do curso para
              confirmar.
            </p>

            <form action={formAction} className="mt-4 space-y-4">
              <input type="hidden" name="id" value={cursoId} />
              <div className="space-y-1.5">
                <label htmlFor="excluir-curso-nome" className="text-sm font-medium">
                  Nome do curso
                </label>
                <input
                  id="excluir-curso-nome"
                  name="confirmacao_nome"
                  type="text"
                  autoComplete="off"
                  value={digitado}
                  onChange={(e) => setDigitado(e.target.value)}
                  placeholder={cursoNome}
                  disabled={pendente}
                  className={CLASSE_INPUT}
                />
              </div>

              {state.erro && (
                <div
                  role="alert"
                  className="rounded-md border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive"
                >
                  {state.erro.mensagem}
                </div>
              )}

              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setAberto(false)}
                  disabled={pendente}
                  className="inline-flex h-9 items-center justify-center rounded-md border border-input bg-transparent px-4 text-sm font-medium transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={!confere || pendente}
                  className={cn(
                    "inline-flex h-9 items-center justify-center rounded-md px-4 text-sm font-medium",
                    "bg-destructive text-destructive-foreground shadow-sm transition-colors hover:bg-destructive/90",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    "disabled:cursor-not-allowed disabled:opacity-50",
                  )}
                >
                  {pendente ? "Excluindo…" : "Excluir curso"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
