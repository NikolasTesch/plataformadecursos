// Flashcards SM-2 S7.1 (US-26 / F1–F4), endurecido conforme revisão ora-1.
// - F3 (B1): sugestão só a partir de questão realmente errada pelo usuário (banco de
//   erros) e com gating de material/curso; nega por padrão.
// - F1/F2 (B9): SM-2 com intervalos por nível ANTES do incremento (0→1,1→3,2→7,3→16,
//   4→35,5→90); erro volta ao nível 0 e amanhã. Data-civil determinística em
//   America/Sao_Paulo, sem depender do timezone do host.
// - F4: isolamento por usuário e validação de material/questão referenciados.
import { db as dbPadrao } from "@/lib/db";
import { obterSugestaoFlashcard, estaNoBancoDeErros, type DbErros } from "@/services/questoes/erros";
import { podeAcessarMaterial, type EntitlementGating } from "@/services/gating";

export type Flashcard = { id: string; user_id: string; material_id: string | null; question_id: string | null; pergunta: string; resposta: string; nivel: number; proxima_revisao: Date; revisoes: number; criado_em: Date; atualizado_em: Date };
type Material = { id: string; module_id: string; status: "rascunho" | "publicado"; amostra: boolean; tipo?: string; video_status?: "processando" | "pronto" | "erro" | null };
type Module = { id: string; course_id: string };
type Course = { id: string; incluido_assinatura: boolean };

export interface DbFlashcards {
  flashcards: {
    create(args: { data: { user_id: string; material_id: string | null; question_id: string | null; pergunta: string; resposta: string; nivel: number; proxima_revisao: Date; revisoes: number } }): Promise<Flashcard>;
    findUnique(args: { where: { id: string } }): Promise<Flashcard | null>;
    findMany(args: { where: { user_id: string; proxima_revisao?: { lte: Date } }; orderBy?: { proxima_revisao: "asc" } }): Promise<Flashcard[]>;
    update(args: { where: { id: string }; data: { nivel: number; proxima_revisao: Date; revisoes: number } }): Promise<Flashcard>;
  };
  materials: { findUnique(args: { where: { id: string } }): Promise<Material | null> };
  modules: { findUnique(args: { where: { id: string } }): Promise<Module | null> };
  courses: { findUnique(args: { where: { id: string } }): Promise<Course | null> };
  questions: { findUnique(args: { where: { id: string } }): Promise<{ id: string; material_id: string } | null> };
  entitlements: { findMany(args: { where: { user_id: string }; include: { product: boolean } }): Promise<EntitlementGating[]> };
}
export interface DepsFlashcards { db?: DbFlashcards; agora?: Date; dbErros?: DbErros }

export class ErroFlashcard extends Error {
  constructor(public readonly code: "pergunta_obrigatoria" | "resposta_obrigatoria" | "material_nao_encontrado" | "questao_nao_encontrada" | "questao_nao_no_banco_de_erros" | "acesso_negado" | "flashcard_nao_encontrado" | "flashcard_de_outro_usuario") {
    super(code);
    this.name = "ErroFlashcard";
  }
}

// F1 (B9): intervalos (dias) indexados pelo NÍVEL ATUAL (antes do incremento).
const INTERVALOS = [1, 3, 7, 16, 35, 90] as const;

/** Data-civil determinística em America/Sao_Paulo, independente do timezone do host.
 *  Constrói em meio-dia UTC para evitar o deslocamento de 1 dia ao reinterpretar
 *  o instante em qualquer fuso (meio-dia SP e meio-dia UTC caem no mesmo dia civil). */
function somarDiasCivil(data: Date, dias: number): Date {
  const partes = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(data);
  const ano = Number(partes.find((p) => p.type === "year")?.value);
  const mes = Number(partes.find((p) => p.type === "month")?.value);
  const dia = Number(partes.find((p) => p.type === "day")?.value);
  const base = new Date(Date.UTC(ano, mes - 1, dia, 12, 0, 0));
  base.setUTCDate(base.getUTCDate() + dias);
  return base;
}

// --- CRUD individual (F4: isolamento por user) ---

export async function criarFlashcard(userId: string, dados: { pergunta: string; resposta: string; material_id?: string | null; question_id?: string | null }, deps: DepsFlashcards = {}): Promise<Flashcard> {
  const banco = deps.db ?? dbPadrao;
  const pergunta = dados.pergunta?.trim() ?? "";
  const resposta = dados.resposta?.trim() ?? "";
  if (!pergunta) throw new ErroFlashcard("pergunta_obrigatoria");
  if (!resposta) throw new ErroFlashcard("resposta_obrigatoria");
  if (dados.material_id) {
    const material = await banco.materials.findUnique({ where: { id: dados.material_id } });
    if (!material) throw new ErroFlashcard("material_nao_encontrado");
  }
  if (dados.question_id) {
    const questao = await banco.questions.findUnique({ where: { id: dados.question_id } });
    if (!questao) throw new ErroFlashcard("questao_nao_encontrada");
  }
  return banco.flashcards.create({
    data: {
      user_id: userId,
      material_id: dados.material_id ?? null,
      question_id: dados.question_id ?? null,
      pergunta,
      resposta,
      nivel: 0,
      proxima_revisao: somarDiasCivil(deps.agora ?? new Date(), 0),
      revisoes: 0,
    },
  });
}

export async function listarFilaDoDia(userId: string, hoje: Date, deps: DepsFlashcards = {}): Promise<Flashcard[]> {
  return (deps.db ?? dbPadrao).flashcards.findMany({ where: { user_id: userId, proxima_revisao: { lte: hoje } }, orderBy: { proxima_revisao: "asc" } });
}

// --- Revisão SM-2 (F1/F2, B9) ---

export async function revisarFlashcard(userId: string, flashcardId: string, acertou: boolean, deps: DepsFlashcards = {}): Promise<Flashcard> {
  const banco = deps.db ?? dbPadrao;
  const flashcard = await banco.flashcards.findUnique({ where: { id: flashcardId } });
  if (!flashcard) throw new ErroFlashcard("flashcard_nao_encontrado");
  if (flashcard.user_id !== userId) throw new ErroFlashcard("flashcard_de_outro_usuario");
  // Intervalo pelo nível ATUAL; erro reinicia ao nível 0 (amanhã).
  const novoNivel = acertou ? Math.min(flashcard.nivel + 1, 5) : 0;
  const dias = acertou ? INTERVALOS[flashcard.nivel] : INTERVALOS[0];
  return banco.flashcards.update({
    where: { id: flashcardId },
    data: { nivel: novoNivel, proxima_revisao: somarDiasCivil(deps.agora ?? new Date(), dias), revisoes: flashcard.revisoes + 1 },
  });
}

// --- Sugestão do banco de erros (F3, B1): confirmação cria, descarte não cria ---

export async function confirmarSugestao(userId: string, questionId: string, deps: DepsFlashcards = {}): Promise<Flashcard> {
  const banco = deps.db ?? dbPadrao;
  const dbErros = deps.dbErros ?? (dbPadrao as unknown as DbErros);
  // 1. Deve estar realmente no banco de erros do usuário (nega por padrão).
  const noBanco = await estaNoBancoDeErros(userId, questionId, { db: dbErros });
  if (!noBanco) throw new ErroFlashcard("questao_nao_no_banco_de_erros");
  // 2. Gating de material/curso.
  const questao = await banco.questions.findUnique({ where: { id: questionId } });
  if (!questao) throw new ErroFlashcard("questao_nao_encontrada");
  const material = await banco.materials.findUnique({ where: { id: questao.material_id } });
  if (!material) throw new ErroFlashcard("material_nao_encontrado");
  const modulo = await banco.modules.findUnique({ where: { id: material.module_id } });
  if (!modulo) throw new ErroFlashcard("material_nao_encontrado");
  const curso = await banco.courses.findUnique({ where: { id: modulo.course_id } });
  if (!curso) throw new ErroFlashcard("material_nao_encontrado");
  const entitlements = await banco.entitlements.findMany({ where: { user_id: userId }, include: { product: true } });
  if (!podeAcessarMaterial({ userId, material, curso, entitlements }).permitido) throw new ErroFlashcard("acesso_negado");
  // 3. Cria o cartão a partir dos dados da sugestão.
  const sugestao = await obterSugestaoFlashcard(userId, questionId, { db: dbErros });
  return banco.flashcards.create({
    data: {
      user_id: userId,
      material_id: null,
      question_id: questionId,
      pergunta: sugestao.pergunta,
      resposta: sugestao.resposta,
      nivel: 0,
      proxima_revisao: somarDiasCivil(deps.agora ?? new Date(), 0),
      revisoes: 0,
    },
  });
}

export function descartarSugestao(): { criado: false } {
  return { criado: false };
}
