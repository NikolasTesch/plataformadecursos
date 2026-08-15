// /admin/cursos/[id] — edição de curso + gestão de módulos (US-03/04).
//
// ROTA FINA: monta a estrutura do curso via _dados.ts (serviços) e renderiza
// o formulário de edição (CursoForm) + a seção de módulos (ModulesSection,
// client). C1: quando há material publicado, o slug é bloqueado no form.
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { carregarCursoComEstrutura } from "../_dados";
import { CursoForm } from "../novo/curso-form";
import {
  ModulesSection,
  type MaterialSerializado,
  type ModuloSerializado,
} from "../modules-section";

export const metadata: Metadata = {
  title: "Editar curso | Administração | ConcursFoco",
};

interface Props {
  params: Promise<{ id: string }>;
}

export default async function EditarCursoPage({ params }: Props) {
  const { id } = await params;
  const estrutura = await carregarCursoComEstrutura(id);
  if (!estrutura) notFound();

  const { curso, modulos, publicados } = estrutura;
  const slugBloqueado = publicados > 0; // C1

  const modulosSerializados: ModuloSerializado[] = modulos.map(({ modulo }) => ({
    id: modulo.id,
    nome: modulo.nome,
    ordem: modulo.ordem,
  }));

  const materiaisPorModulo: Record<string, MaterialSerializado[]> = {};
  for (const { modulo, materiais } of modulos) {
    materiaisPorModulo[modulo.id] = materiais.map((m) => ({
      id: m.id,
      titulo: m.titulo,
      tipo: m.tipo,
      status: m.status,
      amostra: m.amostra,
    }));
  }

  return (
    <div className="space-y-8">
      <div>
        <p className="text-sm text-muted-foreground">
          <Link href="/admin/cursos" className="hover:underline">
            Cursos
          </Link>
          <span className="mx-1.5">/</span>
          <span className="text-foreground">{curso.nome}</span>
        </p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight">
          Editar curso
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          <code className="text-xs">{curso.slug}</code>
          <span className="mx-2">·</span>
          {publicados}{" "}
          {publicados === 1 ? "material publicado" : "materiais publicados"}
        </p>
      </div>

      <section className="mx-auto max-w-xl rounded-lg border bg-card p-6 shadow-sm">
        <CursoForm
          modo="editar"
          slugBloqueado={slugBloqueado}
          curso={{
            id: curso.id,
            nome: curso.nome,
            descricao: curso.descricao,
            slug: curso.slug,
            incluido_assinatura: curso.incluido_assinatura,
          }}
        />
      </section>

      <ModulesSection
        cursoId={curso.id}
        modulos={modulosSerializados}
        materiaisPorModulo={materiaisPorModulo}
      />
    </div>
  );
}
