"use client";

import { useTransition } from "react";
import { alternarProgressoAction } from "@/app/app/cursos/[slug]/materiais/[id]/actions";

export function ProgressoToggle(props: { materialId: string; cursoSlug: string; concluido: boolean }) {
  const [pendente, iniciar] = useTransition();
  return (
    <form action={(formData) => iniciar(() => void alternarProgressoAction(formData))} className="mt-6">
      <input type="hidden" name="material_id" value={props.materialId} />
      <input type="hidden" name="curso_slug" value={props.cursoSlug} />
      <input type="hidden" name="concluido" value={String(props.concluido)} />
      <button type="submit" disabled={pendente} className="rounded-lg border px-4 py-2 text-sm font-medium hover:bg-muted disabled:opacity-50">
        {pendente ? "Salvando..." : props.concluido ? "Desmarcar conclusão" : "Marcar como concluído"}
      </button>
    </form>
  );
}
