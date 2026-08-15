// /admin/cursos/novo — criação de curso (US-03).
//
// ROTA FINA: apenas renderiza o formulário client (CursoForm, modo novo).
// A criação real acontece na server action criarCursoAction → serviço
// criarCurso (slug único, validações) → redirect para a listagem.
import type { Metadata } from "next";

import { CursoForm } from "./curso-form";

export const metadata: Metadata = {
  title: "Novo curso | Administração | ConcursFoco",
};

export default function NovoCursoPage() {
  return (
    <div className="mx-auto max-w-xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Novo curso</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          crie o curso e depois adicione módulos e materiais
        </p>
      </div>
      <CursoForm modo="novo" />
    </div>
  );
}
