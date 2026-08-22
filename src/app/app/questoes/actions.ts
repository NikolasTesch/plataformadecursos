"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth";
import { responder } from "@/services/questoes/resposta";
import { sugerirFlashcard } from "@/services/questoes/erros";
import { marcarFavorita, desmarcarFavorita } from "@/services/questoes/favoritas";
import { iniciarSessaoProva, responderEmProva, entregarSessaoProva } from "@/services/questoes/modo";

type Estado = { ok: boolean; mensagem?: string; dados?: unknown };
const valor = (form: FormData, nome: string) => String(form.get(nome) ?? "");

export async function responderAction(_estado: Estado, form: FormData): Promise<Estado> {
  const user = await requireRole("aluno");
  try { return { ok: true, dados: await responder(user.id, valor(form, "question_id"), valor(form, "alternativa")) }; } catch { return { ok: false, mensagem: "Não foi possível registrar a resposta." }; }
}
export async function favoritaAction(form: FormData): Promise<void> {
  const user = await requireRole("aluno"); const questionId = valor(form, "question_id");
  if (form.get("favorita") === "true") await desmarcarFavorita(user.id, questionId); else await marcarFavorita(user.id, questionId);
  revalidatePath("/app/questoes"); revalidatePath(`/app/questoes/${valor(form, "bloco_id")}`);
}
export async function flashcardAction(_estado: Estado, form: FormData): Promise<Estado> { const user = await requireRole("aluno"); sugerirFlashcard(user.id, valor(form, "question_id")); return { ok: true, mensagem: "Sugestão registrada para seus flashcards." }; }
export async function iniciarProvaAction(_estado: Estado, form: FormData): Promise<Estado> { const user = await requireRole("aluno"); try { return { ok: true, dados: await iniciarSessaoProva(valor(form, "bloco_id"), user.id) }; } catch { return { ok: false, mensagem: "Não foi possível iniciar a prova." }; } }
export async function responderProvaAction(_estado: Estado, form: FormData): Promise<Estado> { const user = await requireRole("aluno"); try { return { ok: true, dados: responderEmProva(valor(form, "sessao_id"), user.id, valor(form, "question_id"), valor(form, "alternativa")) }; } catch { return { ok: false, mensagem: "Resposta inválida." }; } }
export async function entregarProvaAction(_estado: Estado, form: FormData): Promise<Estado> { const user = await requireRole("aluno"); try { return { ok: true, dados: await entregarSessaoProva(valor(form, "sessao_id"), user.id) }; } catch { return { ok: false, mensagem: "Não foi possível entregar a prova." }; } }
