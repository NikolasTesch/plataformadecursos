// Banco de erros S4.3 (US-37/Q6): somente tentativas do próprio usuário.
import { db as dbPadrao } from "@/lib/db";
import { responder, type Attempt, type DbResposta } from "@/services/questoes/resposta";

type Questao = {
  id: string;
  material_id: string;
  enunciado?: string;
  comentario_html?: string | null;
  gabarito?: string;
  material?: { modulo?: { course_id: string }; material_edital?: Array<{ disciplina_id: string }> };
};

export type SugestaoFlashcard = {
  tipo: "sugestao_flashcard";
  userId: string;
  questionId: string;
};

export interface DbErros {
  attempts: {
    findMany(args: { where: { user_id: string }; orderBy: { criado_em: "desc" } }): Promise<Attempt[]>;
  };
  questions: {
    findMany(args: { where: { id: { in: string[] } }; include?: unknown }): Promise<Questao[]>;
  };
}

export interface DepsErros {
  db?: DbErros;
  agora?: Date;
  emitirEvento?: (evento: SugestaoFlashcard) => void;
}

const db = dbPadrao as unknown as DbErros;

export type ItemBancoErros = {
  question_id: string;
  questao: Questao;
  ultima_tentativa: Attempt;
  acertos_consecutivos: number;
  total_erros: number;
  taxa_acerto: number;
  curso_id: string | null;
  disciplina_id: string | null;
};

function porQuestao(tentativas: Attempt[]): Map<string, Attempt[]> {
  const resultado = new Map<string, Attempt[]>();
  for (const tentativa of tentativas) {
    const lista = resultado.get(tentativa.question_id) ?? [];
    lista.push(tentativa);
    resultado.set(tentativa.question_id, lista);
  }
  return resultado;
}

function acertosSeguidos(tentativas: Attempt[]): number {
  let total = 0;
  for (const tentativa of tentativas) {
    if (!tentativa.acerto) break;
    total += 1;
  }
  return total;
}

/** Lista questões ainda pendentes: um segundo acerto consecutivo encerra a sequência. */
export async function listarErros(userId: string, deps: DepsErros = {}): Promise<ItemBancoErros[]> {
  const banco = deps.db ?? db;
  const tentativas = (await banco.attempts.findMany({ where: { user_id: userId }, orderBy: { criado_em: "desc" } }))
    .slice()
    .sort((a, b) => b.criado_em.getTime() - a.criado_em.getTime());
  const agrupadas = porQuestao(tentativas);
  const pendentes = [...agrupadas.entries()].filter(([, lista]) => acertosSeguidos(lista) < 2);
  if (pendentes.length === 0) return [];

  const questoes = await banco.questions.findMany({
    where: { id: { in: pendentes.map(([questionId]) => questionId) } },
    include: { material: { include: { modulo: true, material_edital: { select: { disciplina_id: true } } } } },
  });
  const porId = new Map(questoes.map((questao) => [questao.id, questao]));

  return pendentes.flatMap(([questionId, lista]) => {
    const questao = porId.get(questionId);
    if (!questao) return [];
    const acertos = acertosSeguidos(lista);
    const totalErros = lista.filter(({ acerto }) => !acerto).length;
    return [{
      question_id: questionId,
      questao,
      ultima_tentativa: lista[0],
      acertos_consecutivos: acertos,
      total_erros: totalErros,
      taxa_acerto: lista.length === 0 ? 0 : lista.filter(({ acerto }) => acerto).length / lista.length,
      curso_id: questao.material?.modulo?.course_id ?? null,
      disciplina_id: questao.material?.material_edital?.[0]?.disciplina_id ?? null,
    }];
  });
}

/** Reutiliza S4.2; este serviço não cria nem altera tentativas diretamente. */
export async function reResponder(userId: string, questionId: string, alternativa: string, deps: DepsErros = {}) {
  return responder(userId, questionId, alternativa, { db: (deps.db ?? db) as unknown as DbResposta, agora: deps.agora });
}

/** Sinaliza intenção para S7, sem persistir flashcards. */
export function sugerirFlashcard(userId: string, questionId: string, deps: Pick<DepsErros, "emitirEvento"> = {}) {
  const evento: SugestaoFlashcard = { tipo: "sugestao_flashcard", userId, questionId };
  deps.emitirEvento?.(evento);
  return { evento, criado: false } as const;
}

export interface DadosSugestaoFlashcard {
  questionId: string;
  pergunta: string;
  resposta: string;
}

/** Conexão F3: dados do cartão sugerido a partir de uma questão do banco de erros. */
export async function obterSugestaoFlashcard(userId: string, questionId: string, deps: DepsErros = {}): Promise<DadosSugestaoFlashcard> {
  const banco = deps.db ?? db;
  const questoes = await banco.questions.findMany({ where: { id: { in: [questionId] } }, include: { material: { include: { modulo: true } } } });
  const questao = questoes[0];
  if (!questao) throw new Error("questao_nao_encontrada");
  return { questionId, pergunta: questao.enunciado ?? "", resposta: questao.comentario_html ?? questao.gabarito ?? "" };
}

/**
 * F3 (ora-1, B1): a sugestão só é válida se a questão está realmente no banco de
 * erros do próprio usuário (última tentativa errada e ainda não com 2 acertos
 * consecutivos). Nega por padrão quando não há erro registrado.
 */
export async function estaNoBancoDeErros(userId: string, questionId: string, deps: DepsErros = {}): Promise<boolean> {
  const banco = deps.db ?? (db as unknown as DbErros);
  const tentativas = (await banco.attempts.findMany({ where: { user_id: userId }, orderBy: { criado_em: "desc" } }))
    .filter((t) => t.question_id === questionId)
    .slice()
    .sort((a, b) => b.criado_em.getTime() - a.criado_em.getTime());
  if (tentativas.length === 0) return false;
  if (!tentativas.some((t) => !t.acerto)) return false; // sem erro real → não está no banco
  let seguidos = 0;
  for (const t of tentativas) {
    if (!t.acerto) break;
    seguidos += 1;
  }
  return seguidos < 2;
}
