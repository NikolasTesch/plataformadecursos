// /admin/materiais/novo — criação de material (US-05).
//
// ROTA FINA: lê module_id/curso_id/tipo dos query params, resolve o
// breadcrumb via serviços (_dados.ts) e renderiza o formulário client. A
// criação real acontece na server action criarMaterialAction → serviço
// criarMaterial (estrutura por tipo, C2, R11) → redirect para a edição.
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { MaterialTipo } from "@/generated/prisma/client";

import { encontrarCursoDoModulo } from "../../cursos/_dados";
import { MaterialForm, type MaterialFormDados } from "../material-form";

export const metadata: Metadata = {
  title: "Novo material | Administração | ConcursFoco",
};

const TIPOS_VALIDOS: ReadonlySet<string> = new Set([
  "pdf",
  "texto",
  "video",
  "questoes",
  "resumo",
]);

interface Props {
  searchParams: Promise<{ module_id?: string; curso_id?: string; tipo?: string }>;
}

export default async function NovoMaterialPage({ searchParams }: Props) {
  const { module_id, curso_id, tipo } = await searchParams;
  const moduleId = String(module_id ?? "");
  const cursoId = String(curso_id ?? "");
  const tipoInicial: MaterialTipo = TIPOS_VALIDOS.has(String(tipo ?? ""))
    ? (String(tipo) as MaterialTipo)
    : "texto";

  if (moduleId === "" || cursoId === "") {
    return (
      <div className="mx-auto max-w-xl rounded-lg border bg-card p-8 text-center text-sm text-muted-foreground">
        escolha um módulo para criar o material —{" "}
        <Link href="/admin/cursos" className="text-foreground hover:underline">
          voltar para cursos
        </Link>
      </div>
    );
  }

  const local = await encontrarCursoDoModulo(moduleId);
  if (!local || local.cursoId !== cursoId) notFound();

  const dados: MaterialFormDados = {
    module_id: moduleId,
    curso_id: cursoId,
    curso_nome: local.cursoNome,
    modulo_nome: local.moduloNome,
    tipo: tipoInicial,
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <p className="text-sm text-muted-foreground">
          <Link href={`/admin/cursos/${cursoId}`} className="hover:underline">
            {local.cursoNome}
          </Link>
          <span className="mx-1.5">/</span>
          <span className="text-foreground">{local.moduloNome}</span>
        </p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight">
          Novo material
        </h1>
      </div>

      <div className="rounded-lg border bg-card p-6 shadow-sm">
        <MaterialForm dados={dados} />
      </div>
    </div>
  );
}
