// Seção de MÓDULOS do curso (client) — US-04.
//
// UX sugar sobre as server actions de cursos/actions.ts: criar módulo (nome,
// ordem default = último + 1 no serviço), renomear, excluir (com aviso de
// cascata de materiais) e reordenar ↑/↓ (a action reordenarModulosAction
// recebe a lista COMPLETA de ids na nova ordem — o serviço valida e aplica a
// transação atômica). Também lista os materiais de cada módulo com link para
// a edição em /admin/materiais/[id].
//
// Regras de negócio (ordens, cascata, validações) vivem em
// src/services/conteudo — este componente apenas coleta e renderiza.
"use client";

import Link from "next/link";
import { useState } from "react";
import { useActionState, useTransition } from "react";
import { cn } from "@/lib/utils";
import type {
  MaterialStatus,
  MaterialTipo,
} from "@/generated/prisma/client";

import {
  criarModuloAction,
  excluirModuloAction,
  renomearModuloAction,
  reordenarModulosAction,
  type EstadoAdmin,
} from "./actions";

const ESTADO_INICIAL: EstadoAdmin = {};

const CLASSE_INPUT =
  "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 " +
  "text-sm shadow-sm transition-colors placeholder:text-muted-foreground " +
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring " +
  "disabled:cursor-not-allowed disabled:opacity-50";

const LABEL_TIPO: Record<MaterialTipo, string> = {
  pdf: "PDF",
  texto: "Texto",
  video: "Vídeo",
  questoes: "Questões",
  resumo: "Resumo",
};

export interface ModuloSerializado {
  id: string;
  nome: string;
  ordem: number;
}

export interface MaterialSerializado {
  id: string;
  titulo: string;
  tipo: MaterialTipo;
  status: MaterialStatus;
  amostra: boolean;
}

interface Props {
  cursoId: string;
  modulos: ModuloSerializado[];
  materiaisPorModulo: Record<string, MaterialSerializado[]>;
}

export function ModulesSection({ cursoId, modulos, materiaisPorModulo }: Props) {
  const [erroGlobal, setErroGlobal] = useState<string | null>(null);
  const [pendenteReorder, iniciarReorder] = useTransition();

  // Criação de módulo (chamada direta da server action — o resultado define
  // erro exibido ou limpeza do input; página re-renderiza após sucesso).
  const [pendenteCriar, setPendenteCriar] = useState(false);
  const [erroCriar, setErroCriar] = useState<string | null>(null);
  const [nomeNovo, setNomeNovo] = useState("");

  async function aoCriarModulo(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPendenteCriar(true);
    setErroCriar(null);
    const resultado = await criarModuloAction(
      ESTADO_INICIAL,
      new FormData(e.currentTarget),
    );
    setPendenteCriar(false);
    if (resultado.ok) setNomeNovo("");
    else if (resultado.erro) setErroCriar(resultado.erro.mensagem);
  }

  async function mover(moduloId: string, direcao: -1 | 1) {
    setErroGlobal(null);
    const indice = modulos.findIndex((m) => m.id === moduloId);
    const alvo = indice + direcao;
    if (indice < 0 || alvo < 0 || alvo >= modulos.length) return;
    const novaOrdem = modulos.map((m) => m.id);
    [novaOrdem[indice], novaOrdem[alvo]] = [novaOrdem[alvo], novaOrdem[indice]];

    // Chamada direta da server action (sem form): constrói o FormData com a
    // lista completa na nova ordem — o serviço reordenarModulos valida e
    // aplica em transação (D-S2-3b/c).
    iniciarReorder(async () => {
      const fd = new FormData();
      fd.set("curso_id", cursoId);
      for (const id of novaOrdem) fd.append("modulo_id", id);
      const resultado = await reordenarModulosAction(ESTADO_INICIAL, fd);
      if (resultado.erro) setErroGlobal(resultado.erro.mensagem);
    });
  }

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold tracking-tight">Módulos</h2>
        <form
          onSubmit={aoCriarModulo}
          className="flex items-center gap-2"
          aria-label="Criar módulo"
        >
          <input type="hidden" name="curso_id" value={cursoId} />
          <input
            id="modulo-nome"
            name="nome"
            type="text"
            placeholder="nome do novo módulo"
            required
            value={nomeNovo}
            onChange={(e) => setNomeNovo(e.target.value)}
            disabled={pendenteCriar}
            className={cn(CLASSE_INPUT, "w-56")}
          />
          <button
            type="submit"
            disabled={pendenteCriar}
            className="inline-flex h-9 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground shadow-sm transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
          >
            {pendenteCriar ? "Criando…" : "Criar módulo"}
          </button>
        </form>
      </div>

      {erroCriar && (
        <div
          role="alert"
          className="rounded-md border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive"
        >
          {erroCriar}
        </div>
      )}
      {erroGlobal && (
        <div
          role="alert"
          className="rounded-md border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive"
        >
          {erroGlobal}
        </div>
      )}

      {modulos.length === 0 ? (
        <p className="rounded-lg border border-dashed bg-card p-6 text-center text-sm text-muted-foreground">
          nenhum módulo ainda — crie o primeiro acima
        </p>
      ) : (
        <ol className="space-y-4">
          {modulos.map((modulo, indice) => (
            <ModuleCard
              key={modulo.id}
              cursoId={cursoId}
              modulo={modulo}
              primeiro={indice === 0}
              ultimo={indice === modulos.length - 1}
              pendenteReorder={pendenteReorder}
              onMover={mover}
              materiais={materiaisPorModulo[modulo.id] ?? []}
            />
          ))}
        </ol>
      )}
    </section>
  );
}

interface ModuleCardProps {
  cursoId: string;
  modulo: ModuloSerializado;
  primeiro: boolean;
  ultimo: boolean;
  pendenteReorder: boolean;
  onMover: (moduloId: string, direcao: -1 | 1) => void;
  materiais: MaterialSerializado[];
}

function ModuleCard({
  cursoId,
  modulo,
  primeiro,
  ultimo,
  pendenteReorder,
  onMover,
  materiais,
}: ModuleCardProps) {
  const [stateRename, formActionRename, pendenteRename] = useActionState(
    renomearModuloAction,
    ESTADO_INICIAL,
  );
  const [nome, setNome] = useState(modulo.nome);
  const [confirmandoExclusao, setConfirmandoExclusao] = useState(false);
  const [erroExcluir, setErroExcluir] = useState<string | null>(null);

  return (
    <li className="rounded-lg border bg-card p-4 shadow-sm">
      <div className="flex flex-wrap items-center gap-3">
        <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-muted text-xs font-semibold text-muted-foreground">
          {modulo.ordem}
        </span>

        <form
          action={formActionRename}
          className="flex items-center gap-2"
          aria-label={`Renomear módulo ${modulo.nome}`}
        >
          <input type="hidden" name="modulo_id" value={modulo.id} />
          <input type="hidden" name="curso_id" value={cursoId} />
          <input
            name="nome"
            type="text"
            required
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            disabled={pendenteRename}
            className={cn(CLASSE_INPUT, "w-64 font-medium")}
            aria-label="Nome do módulo"
          />
          <button
            type="submit"
            disabled={pendenteRename || nome.trim() === modulo.nome}
            className="inline-flex h-9 items-center justify-center rounded-md border border-input bg-transparent px-3 text-sm font-medium transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
          >
            {pendenteRename ? "…" : "Salvar"}
          </button>
        </form>

        <div className="flex items-center gap-1">
          <button
            type="button"
            aria-label={`Mover módulo ${modulo.nome} para cima`}
            disabled={primeiro || pendenteReorder}
            onClick={() => onMover(modulo.id, -1)}
            className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-input text-sm transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-40"
          >
            ↑
          </button>
          <button
            type="button"
            aria-label={`Mover módulo ${modulo.nome} para baixo`}
            disabled={ultimo || pendenteReorder}
            onClick={() => onMover(modulo.id, 1)}
            className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-input text-sm transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-40"
          >
            ↓
          </button>
          <button
            type="button"
            onClick={() => setConfirmandoExclusao((v) => !v)}
            className="inline-flex h-9 items-center justify-center rounded-md border border-destructive/40 px-3 text-sm font-medium text-destructive transition-colors hover:bg-destructive/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            Excluir
          </button>
        </div>
      </div>

      {stateRename.erro && (
        <p role="alert" className="mt-2 text-xs text-destructive">
          {stateRename.erro.mensagem}
        </p>
      )}

      {confirmandoExclusao && (
        <div className="mt-3 rounded-md border border-destructive/40 bg-destructive/5 p-3">
          <p className="text-sm text-destructive">
            Excluir o módulo <strong>{modulo.nome}</strong> também remove os{" "}
            {materiais.length}{" "}
            {materiais.length === 1 ? "material" : "materiais"} dele — ação
            irreversível. Confirmar?
          </p>
          {erroExcluir && (
            <p role="alert" className="mt-1 text-xs text-destructive">
              {erroExcluir}
            </p>
          )}
          <div className="mt-2 flex items-center gap-2">
            <button
              type="button"
              onClick={() => setConfirmandoExclusao(false)}
              className="inline-flex h-8 items-center justify-center rounded-md border border-input bg-transparent px-3 text-sm font-medium transition-colors hover:bg-muted"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={async () => {
                setErroExcluir(null);
                // Chamada direta da server action (padrão do reorder): o
                // serviço exclui e a página re-renderiza com os dados novos.
                const fd = new FormData();
                fd.set("modulo_id", modulo.id);
                fd.set("curso_id", cursoId);
                const resultado = await excluirModuloAction(ESTADO_INICIAL, fd);
                if (resultado.erro) setErroExcluir(resultado.erro.mensagem);
              }}
              className="inline-flex h-8 items-center justify-center rounded-md bg-destructive px-3 text-sm font-medium text-destructive-foreground transition-colors hover:bg-destructive/90"
            >
              Excluir módulo
            </button>
          </div>
        </div>
      )}

      {/* Lista rápida de materiais do módulo (R6: ordenados por ordem). */}
      <div className="mt-3 space-y-1.5">
        {materiais.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            nenhum material —{" "}
            <Link
              href={`/admin/materiais/novo?module_id=${modulo.id}&curso_id=${cursoId}&tipo=texto`}
              className="text-foreground hover:underline"
            >
              crie o primeiro
            </Link>
          </p>
        ) : (
          <ul className="divide-y divide-border rounded-md border">
            {materiais.map((material) => (
              <li key={material.id}>
                <Link
                  href={`/admin/materiais/${material.id}`}
                  className="flex items-center justify-between gap-2 px-3 py-2 text-sm transition-colors hover:bg-muted/60"
                >
                  <span className="min-w-0 truncate font-medium">
                    {material.titulo}
                  </span>
                  <span className="flex shrink-0 items-center gap-1.5">
                    <span className="rounded-full bg-muted px-2 py-0.5 text-xs">
                      {LABEL_TIPO[material.tipo]}
                    </span>
                    {material.amostra && (
                      <span className="rounded-full border border-primary/40 bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                        amostra
                      </span>
                    )}
                    <span
                      className={cn(
                        "rounded-full px-2 py-0.5 text-xs",
                        material.status === "publicado"
                          ? "border border-emerald-600/40 bg-emerald-600/10 text-emerald-700"
                          : "border border-amber-600/40 bg-amber-600/10 text-amber-700",
                      )}
                    >
                      {material.status === "publicado" ? "publicado" : "rascunho"}
                    </span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Criação de material por tipo (estrutura do tipo decide o formulário). */}
      <div className="mt-2 flex flex-wrap items-center gap-1.5 text-xs">
        <span className="text-muted-foreground">novo material:</span>
        {(["texto", "resumo", "pdf", "video", "questoes"] as const).map(
          (tipo) => (
            <Link
              key={tipo}
              href={`/admin/materiais/novo?module_id=${modulo.id}&curso_id=${cursoId}&tipo=${tipo}`}
              className="rounded-md border border-input px-2 py-1 font-medium text-foreground transition-colors hover:bg-muted"
            >
              {LABEL_TIPO[tipo]}
            </Link>
          ),
        )}
      </div>
    </li>
  );
}
