"use server";
import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth";
import { criarFlashcard, revisarFlashcard, confirmarSugestao, descartarSugestao, ErroFlashcard } from "@/services/flashcards";
const v = (f: FormData, k: string) => String(f.get(k) ?? "").trim();
export type EstadoFlashcard = { ok: boolean; mensagem?: string };
function mensagem(e: unknown) { if (!(e instanceof ErroFlashcard)) return "Não foi possível concluir a ação."; return ({ questao_nao_no_banco_de_erros: "Esta sugestão não está mais disponível.", acesso_negado: "Você não tem acesso a este conteúdo.", questao_nao_encontrada: "A questão não está mais disponível." } as Record<string, string>)[e.code] ?? "Não foi possível criar o flashcard."; }
export async function criarFlashcardAction(f: FormData): Promise<void> { const u = await requireRole("aluno"); await criarFlashcard(u.id, { pergunta: v(f, "pergunta"), resposta: v(f, "resposta") }); revalidatePath("/app/flashcards"); }
export async function revisarFlashcardAction(f: FormData): Promise<void> { const u = await requireRole("aluno"); await revisarFlashcard(u.id, v(f, "flashcard_id"), v(f, "acertou") === "true"); revalidatePath("/app/flashcards"); }
export async function confirmarSugestaoAction(_: EstadoFlashcard, f: FormData): Promise<EstadoFlashcard> { const u = await requireRole("aluno"); try { await confirmarSugestao(u.id, v(f, "question_id")); revalidatePath("/app/flashcards"); return { ok: true, mensagem: "Flashcard criado para sua fila de revisão." }; } catch (e) { return { ok: false, mensagem: mensagem(e) }; } }
export async function descartarSugestaoAction(estado: EstadoFlashcard, f: FormData): Promise<EstadoFlashcard> { void estado; void f; await requireRole("aluno"); const resultado = descartarSugestao(); revalidatePath("/app/flashcards"); return resultado.criado ? { ok: false } : { ok: true, mensagem: "Sugestão descartada." }; }
