"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth";
import { atualizar, criar, excluir } from "@/services/aluno/anotacoes";

export async function criarAnotacaoAction(formData: FormData): Promise<void> {
  const user = await requireRole("aluno");
  await criar(user.id, String(formData.get("material_id") ?? ""), String(formData.get("conteudo") ?? ""));
  revalidatePath("/app/anotacoes");
  const caminho = String(formData.get("caminho") ?? "");
  if (caminho) revalidatePath(caminho);
}

export async function atualizarAnotacaoAction(formData: FormData): Promise<void> {
  const user = await requireRole("aluno");
  await atualizar(user.id, String(formData.get("nota_id") ?? ""), String(formData.get("conteudo") ?? ""));
  revalidatePath("/app/anotacoes");
}

export async function excluirAnotacaoAction(formData: FormData): Promise<void> {
  const user = await requireRole("aluno");
  await excluir(user.id, String(formData.get("nota_id") ?? ""));
  revalidatePath("/app/anotacoes");
}
