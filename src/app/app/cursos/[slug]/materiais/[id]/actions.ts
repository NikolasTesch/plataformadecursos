// Actions finas: autenticação/autorização ficam no servidor; a regra pertence
// ao serviço de progresso, que também revalida o gating antes de gravar.
"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireRole } from "@/lib/auth";
import { concluir, desmarcar } from "@/services/aluno/progresso";

export async function alternarProgressoAction(formData: FormData): Promise<void> {
  const user = await requireRole("aluno");
  const materialId = String(formData.get("material_id") ?? "");
  const slug = String(formData.get("curso_slug") ?? "");
  const concluido = formData.get("concluido") === "true";
  if (!materialId || !slug) redirect("/app/cursos");
  if (concluido) await desmarcar(user.id, materialId);
  else await concluir(user.id, materialId);
  revalidatePath(`/app/cursos/${slug}/materiais/${materialId}`);
  revalidatePath(`/app/cursos/${slug}`);
}
