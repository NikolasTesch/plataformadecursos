// /admin/materiais/[id] — edição de material + publicação (US-05/06/09).
//
// ROTA FINA: carrega o material (obterMaterial), resolve o módulo/curso para
// o breadcrumb e renderiza o formulário client (MaterialForm). Publicar/
// despublicar são ações explícitas (publicarMaterial/despublicarMaterial —
// R5 imediato, R11 vídeo erro); C2 (amostra única) aparece como alerta vindo
// do ErroConteudo retornado pela action.
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { obterMaterial } from "@/services/conteudo/materiais";

import { encontrarCursoDoModulo } from "../../cursos/_dados";
import { MaterialForm, type MaterialFormDados } from "../material-form";

export const metadata: Metadata = {
  title: "Editar material | Administração | ConcursFoco",
};

interface Props {
  params: Promise<{ id: string }>;
}

export default async function EditarMaterialPage({ params }: Props) {
  const { id } = await params;
  const material = await obterMaterial(id);
  if (!material) notFound();

  const local = await encontrarCursoDoModulo(material.module_id);
  if (!local) notFound();

  const dados: MaterialFormDados = {
    id: material.id,
    module_id: material.module_id,
    curso_id: local.cursoId,
    curso_nome: local.cursoNome,
    modulo_nome: local.moduloNome,
    tipo: material.tipo,
    titulo: material.titulo,
    ordem: material.ordem,
    status: material.status,
    amostra: material.amostra,
    conteudo_html: material.conteudo_html,
    arquivo_key: material.arquivo_key,
    video_provider_id: material.video_provider_id,
    video_status: material.video_status,
    publicado_em: material.publicado_em?.toISOString(),
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <p className="text-sm text-muted-foreground">
          <Link href={`/admin/cursos/${local.cursoId}`} className="hover:underline">
            {local.cursoNome}
          </Link>
          <span className="mx-1.5">/</span>
          <Link
            href={`/admin/cursos/${local.cursoId}`}
            className="hover:underline"
          >
            {local.moduloNome}
          </Link>
          <span className="mx-1.5">/</span>
          <span className="text-foreground">{material.titulo}</span>
        </p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight">
          Editar material
        </h1>
      </div>

      <div className="rounded-lg border bg-card p-6 shadow-sm">
        <MaterialForm dados={dados} />
      </div>
    </div>
  );
}
