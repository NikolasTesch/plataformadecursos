// Simulados cronometrados S7.1 (US-27 / Q2–Q5), endurecido conforme revisão ora-1.
// - Gating por curso + usuário bloqueado reavaliado em iniciar/responder/entregar/histórico (B2).
// - Prazo autoritativo no servidor: resposta após duração é bloqueada; entrega é segura (B3).
// - Atualizações atômicas com lock otimista (WHERE status/respostas) — sem read-modify-write perdido (B4).
// - Montagem: questão deve ser do mesmo curso e material publicado; valida coleção inteira antes de gravar; ordem global (B5).
// - Simulado publicado/com tentativas é imutável; nota de tentativa entregue é estável (B6).
// - Questão respondida deve pertencer ao simulado (B7).
// - Erros de simulado alimentam o banco de erros (tabela `attempts`) na 1ª entrega, idempotente (B8).
import { db as dbPadrao } from "@/lib/db";
import { podeAcessarCurso, type EntitlementGating } from "@/services/gating";
import { sanitizarHtml } from "@/lib/sanitize";
import type { Prisma } from "@/generated/prisma/client";

export type Simulado = { id: string; curso_id: string; titulo: string; instrucoes: string | null; duracao_minutos: number; status: "rascunho" | "publicado"; publicado_em: Date | null };
export type SimuladoQuestion = { id: string; simulado_id: string; question_id: string; ordem: number };
export type SimuladoAttempt = { id: string; user_id: string; simulado_id: string; iniciado_em: Date; entregue_em: Date | null; respostas: Prisma.JsonValue; nota: number | null; status: "em_andamento" | "entregue" };
type Question = { id: string; material_id: string; enunciado: string; alternativas: Prisma.JsonValue; gabarito: string; comentario_html: string | null; ordem: number };
type Material = { id: string; module_id: string; status: "rascunho" | "publicado"; amostra: boolean; tipo?: string; video_status?: "processando" | "pronto" | "erro" | null };
type MaterialComDisciplina = Material & { material_edital: Array<{ disciplina_id: string }> };
type Module = { id: string; course_id: string };
type Course = { id: string; incluido_assinatura: boolean };
type User = { id: string; bloqueado: boolean };
export type Entitlement = EntitlementGating & { product: NonNullable<EntitlementGating["product"]> };
type AttemptRow = { id: string; user_id: string; question_id: string; alternativa_escolhida: string; acerto: boolean; criado_em: Date };

export interface DbSimulados {
  simulados: {
    create(args: { data: { curso_id: string; titulo: string; instrucoes: string | null; duracao_minutos: number; status: "rascunho" } }): Promise<Simulado>;
    findUnique(args: { where: { id: string } }): Promise<Simulado | null>;
    findMany(args: { where: { curso_id?: string } }): Promise<Simulado[]>;
    update(args: { where: { id: string }; data: { status: "publicado"; publicado_em: Date } }): Promise<Simulado>;
  };
  simulado_questions: {
    create(args: { data: { simulado_id: string; question_id: string; ordem: number } }): Promise<SimuladoQuestion>;
    findMany(args: { where: { simulado_id: string }; orderBy?: { ordem: "asc" } }): Promise<SimuladoQuestion[]>;
  };
  simulado_attempts: {
    create(args: { data: { user_id: string; simulado_id: string; respostas: Prisma.JsonValue; status: "em_andamento" } }): Promise<SimuladoAttempt>;
    findUnique(args: { where: { id: string } }): Promise<SimuladoAttempt | null>;
    findMany(args: { where: { simulado_id: string; user_id?: string } }): Promise<SimuladoAttempt[]>;
    // Atualização atômica: `where` pode incluir `status` e/ou `respostas` para lock otimista.
    update(args: { where: { id: string; status?: "em_andamento"; respostas?: Prisma.JsonValue }; data: { respostas: Prisma.JsonValue; status: "em_andamento" | "entregue"; entregue_em: Date | null; nota: number } }): Promise<SimuladoAttempt>;
  };
  questions: {
    findUnique(args: { where: { id: string } }): Promise<Question | null>;
    findMany(args: { where: { id: { in: string[] } } }): Promise<Question[]>;
  };
  materials: {
    findUnique(args: { where: { id: string } }): Promise<Material | null>;
    findMany(args: { where: { id: { in: string[] } }; include?: { material_edital: true } }): Promise<MaterialComDisciplina[]>;
  };
  modules: { findUnique(args: { where: { id: string } }): Promise<Module | null> };
  courses: { findUnique(args: { where: { id: string } }): Promise<Course | null> };
  users: { findUnique(args: { where: { id: string } }): Promise<User | null> };
  entitlements: { findMany(args: { where: { user_id: string }; include: { product: boolean } }): Promise<Entitlement[]> };
  attempts: { create(args: { data: { user_id: string; question_id: string; alternativa_escolhida: string; acerto: boolean } }): Promise<AttemptRow> };
}
export interface DepsSimulados { db?: DbSimulados; agora?: Date }

export type ResultadoQuestao = { questao_id: string; resposta: string | null; correta: boolean; gabarito: string; comentario_html: string | null };
export type DesempenhoDisciplina = { disciplina_id: string | null; acertos: number; total: number };
export type ResultadoEntrega = { acertos: number; total: number; nota: number; resultados: ResultadoQuestao[]; desempenho_por_disciplina: DesempenhoDisciplina[] };

export class ErroSimulado extends Error {
  constructor(public readonly code:
    | "simulado_nao_encontrado" | "nao_publicado" | "acesso_negado" | "titulo_obrigatorio" | "duracao_invalida"
    | "simulado_publicado" | "simulado_com_tentativas" | "simulado_sem_questoes"
    | "questao_nao_encontrada" | "questao_nao_publicada" | "questao_fora_do_curso"
    | "questao_fora_do_simulado" | "tentativa_nao_encontrada" | "tentativa_de_outro_usuario"
    | "tentativa_entregue" | "prazo_encerrado" | "alternativa_invalida" | "conflito_concorrencia") {
    super(code);
    this.name = "ErroSimulado";
  }
}

const db = dbPadrao as unknown as DbSimulados;
const LETRAS = ["A", "B", "C", "D", "E"] as const;

function respostasComoMap(respostas: Prisma.JsonValue): Record<string, string | null> {
  return (typeof respostas === "object" && respostas !== null && !Array.isArray(respostas) ? respostas : {}) as Record<string, string | null>;
}

function alternativasDaQuestao(question: Question): Array<{ letra: string }> {
  return Array.isArray(question.alternativas) ? (question.alternativas as Array<{ letra: string }>) : [];
}

function notaComoNumero(nota: number | null): number {
  return nota == null ? 0 : Number(nota);
}

// --- Admin: montagem e publicação (B5/B6/B10) ---

export async function criarSimulado(cursoId: string, dados: { titulo: string; instrucoes?: string | null; duracao_minutos: number }, deps: DepsSimulados = {}): Promise<Simulado> {
  const banco = deps.db ?? db;
  const titulo = typeof dados.titulo === "string" ? dados.titulo.trim() : "";
  if (!titulo) throw new ErroSimulado("titulo_obrigatorio");
  const duracao = Number(dados.duracao_minutos);
  if (!Number.isInteger(duracao) || duracao <= 0) throw new ErroSimulado("duracao_invalida");
  return banco.simulados.create({ data: { curso_id: cursoId, titulo, instrucoes: dados.instrucoes ?? null, duracao_minutos: duracao, status: "rascunho" } });
}

export async function adicionarQuestoes(simuladoId: string, questionIds: string[], deps: DepsSimulados = {}): Promise<SimuladoQuestion[]> {
  const banco = deps.db ?? db;
  const simulado = await banco.simulados.findUnique({ where: { id: simuladoId } });
  if (!simulado) throw new ErroSimulado("simulado_nao_encontrado");
  const tentativas = await banco.simulado_attempts.findMany({ where: { simulado_id: simuladoId } });
  if (tentativas.length > 0) throw new ErroSimulado("simulado_com_tentativas");
  if (simulado.status === "publicado") throw new ErroSimulado("simulado_publicado");

  const questoes = await banco.questions.findMany({ where: { id: { in: questionIds } } });
  const porId = new Map(questoes.map((q) => [q.id, q]));
  const materiais = questoes.length === 0 ? [] : await banco.materials.findMany({ where: { id: { in: questoes.map((q) => q.material_id) } } });
  const materialPorId = new Map(materiais.map((m) => [m.id, m]));

  // Valida a coleção inteira ANTES de gravar qualquer linha (B5).
  for (const questionId of questionIds) {
    const questao = porId.get(questionId);
    if (!questao) throw new ErroSimulado("questao_nao_encontrada");
    const material = materialPorId.get(questao.material_id);
    if (!material) throw new ErroSimulado("questao_nao_publicada");
    if (material.status !== "publicado") throw new ErroSimulado("questao_nao_publicada");
    const modulo = await banco.modules.findUnique({ where: { id: material.module_id } });
    if (!modulo || modulo.course_id !== simulado.curso_id) throw new ErroSimulado("questao_fora_do_curso");
  }

  // Ordem global: continua a partir do maior `ordem` já existente (B5).
  const existentes = await banco.simulado_questions.findMany({ where: { simulado_id: simuladoId } });
  let ordem = existentes.length === 0 ? 0 : Math.max(...existentes.map((e) => e.ordem)) + 1;
  const criadas: SimuladoQuestion[] = [];
  for (const questionId of questionIds) {
    criadas.push(await banco.simulado_questions.create({ data: { simulado_id: simuladoId, question_id: questionId, ordem: ordem++ } }));
  }
  return criadas;
}

export async function publicarSimulado(simuladoId: string, deps: DepsSimulados = {}): Promise<Simulado> {
  const banco = deps.db ?? db;
  const simulado = await banco.simulados.findUnique({ where: { id: simuladoId } });
  if (!simulado) throw new ErroSimulado("simulado_nao_encontrado");
  const vinculos = await banco.simulado_questions.findMany({ where: { simulado_id: simuladoId } });
  if (vinculos.length === 0) throw new ErroSimulado("simulado_sem_questoes");
  return banco.simulados.update({ where: { id: simuladoId }, data: { status: "publicado", publicado_em: deps.agora ?? new Date() } });
}

export async function listarSimulados(cursoId: string | undefined, deps: DepsSimulados = {}): Promise<Simulado[]> {
  return (deps.db ?? db).simulados.findMany({ where: cursoId ? { curso_id: cursoId } : {} });
}

// --- Acesso (B2): gating por curso + usuário bloqueado ---

async function verificarAcessoSimulado(userId: string, simulado: Simulado, banco: DbSimulados, agora?: Date): Promise<void> {
  if (simulado.status !== "publicado") throw new ErroSimulado("nao_publicado");
  const curso = await banco.courses.findUnique({ where: { id: simulado.curso_id } });
  if (!curso) throw new ErroSimulado("simulado_nao_encontrado");
  const usuario = await banco.users.findUnique({ where: { id: userId } });
  if (!usuario) throw new ErroSimulado("acesso_negado");
  const entitlements = await banco.entitlements.findMany({ where: { user_id: userId }, include: { product: true } });
  if (!podeAcessarCurso({ userId, curso, entitlements, usuario: { id: usuario.id, bloqueado: usuario.bloqueado } }, { agora }).permitido) {
    throw new ErroSimulado("acesso_negado");
  }
}

// --- Aluno: tentativa persistente, respostas e entrega (Q2/Q3/B2-B4/B7/B8) ---

export async function iniciarTentativa(userId: string, simuladoId: string, deps: DepsSimulados = {}): Promise<SimuladoAttempt> {
  const banco = deps.db ?? db;
  const simulado = await banco.simulados.findUnique({ where: { id: simuladoId } });
  if (!simulado) throw new ErroSimulado("simulado_nao_encontrado");
  await verificarAcessoSimulado(userId, simulado, banco, deps.agora);
  return banco.simulado_attempts.create({ data: { user_id: userId, simulado_id: simuladoId, respostas: {}, status: "em_andamento" } });
}

export async function responderNaTentativa(userId: string, attemptId: string, questionId: string, alternativa: string, deps: DepsSimulados = {}): Promise<SimuladoAttempt> {
  const banco = deps.db ?? db;
  const attempt = await banco.simulado_attempts.findUnique({ where: { id: attemptId } });
  if (!attempt) throw new ErroSimulado("tentativa_nao_encontrada");
  if (attempt.user_id !== userId) throw new ErroSimulado("tentativa_de_outro_usuario");
  if (attempt.status === "entregue") throw new ErroSimulado("tentativa_entregue");

  const simulado = await banco.simulados.findUnique({ where: { id: attempt.simulado_id } });
  if (!simulado) throw new ErroSimulado("simulado_nao_encontrado");
  await verificarAcessoSimulado(userId, simulado, banco, deps.agora); // B2

  // Prazo autoritativo no servidor (B3): após duração, resposta é bloqueada.
  const agora = deps.agora ?? new Date();
  const prazo = new Date(attempt.iniciado_em.getTime() + simulado.duracao_minutos * 60_000);
  if (agora.getTime() > prazo.getTime()) throw new ErroSimulado("prazo_encerrado");

  // Questão deve pertencer ao simulado (B7).
  const vinculos = await banco.simulado_questions.findMany({ where: { simulado_id: attempt.simulado_id } });
  if (!vinculos.some((v) => v.question_id === questionId)) throw new ErroSimulado("questao_fora_do_simulado");

  const questao = await banco.questions.findUnique({ where: { id: questionId } });
  if (!questao) throw new ErroSimulado("questao_nao_encontrada");
  const escolhida = typeof alternativa === "string" ? alternativa.trim().toUpperCase() : "";
  const opcoes = alternativasDaQuestao(questao).map(({ letra }) => letra);
  if (!LETRAS.includes(escolhida as typeof LETRAS[number]) || !opcoes.includes(escolhida)) throw new ErroSimulado("alternativa_invalida");

  const respostas = { ...respostasComoMap(attempt.respostas), [questionId]: escolhida };
  // Atualização atômica com lock otimista: WHERE inclui status e respostas anteriores (B4).
  try {
    return await banco.simulado_attempts.update({
      where: { id: attemptId, status: "em_andamento", respostas: attempt.respostas },
      data: { respostas, status: "em_andamento", entregue_em: null, nota: 0 },
    });
  } catch {
    const atual = await banco.simulado_attempts.findUnique({ where: { id: attemptId } });
    if (atual?.status === "entregue") throw new ErroSimulado("tentativa_entregue");
    throw new ErroSimulado("conflito_concorrencia");
  }
}

async function calcularResultado(attempt: SimuladoAttempt, banco: DbSimulados): Promise<ResultadoEntrega> {
  const vinculos = await banco.simulado_questions.findMany({ where: { simulado_id: attempt.simulado_id } });
  const respostas = respostasComoMap(attempt.respostas);
  const questoes = vinculos.length === 0 ? [] : await banco.questions.findMany({ where: { id: { in: vinculos.map((v) => v.question_id) } } });
  const porId = new Map(questoes.map((q) => [q.id, q]));
  const materiais = questoes.length === 0 ? [] : await banco.materials.findMany({ where: { id: { in: questoes.map((q) => q.material_id) } }, include: { material_edital: true } });
  const materialPorId = new Map(materiais.map((m) => [m.id, m]));
  const resultados: ResultadoQuestao[] = [];
  const desempenho = new Map<string | null, { acertos: number; total: number }>();
  let acertos = 0;
  for (const vinculo of vinculos) {
    const questao = porId.get(vinculo.question_id);
    if (!questao) continue;
    const resposta = respostas[vinculo.question_id] ?? null;
    const correta = resposta !== null && resposta === questao.gabarito;
    if (correta) acertos += 1;
    resultados.push({ questao_id: vinculo.question_id, resposta, correta, gabarito: questao.gabarito, comentario_html: questao.comentario_html ? sanitizarHtml(questao.comentario_html) : null });
    const disciplina = materialPorId.get(questao.material_id)?.material_edital?.[0]?.disciplina_id ?? null;
    const agg = desempenho.get(disciplina) ?? { acertos: 0, total: 0 };
    agg.total += 1;
    if (correta) agg.acertos += 1;
    desempenho.set(disciplina, agg);
  }
  const total = resultados.length;
  const nota = total === 0 ? 0 : acertos / total;
  return { acertos, total, nota, resultados, desempenho_por_disciplina: [...desempenho].map(([disciplina_id, v]) => ({ disciplina_id, ...v })) };
}

// B8: alimenta o banco de erros (tabela `attempts`) com as respostas da tentativa.
async function alimentarBancoDeErros(userId: string, attempt: SimuladoAttempt, banco: DbSimulados): Promise<void> {
  const vinculos = await banco.simulado_questions.findMany({ where: { simulado_id: attempt.simulado_id } });
  const respostas = respostasComoMap(attempt.respostas);
  const questoes = vinculos.length === 0 ? [] : await banco.questions.findMany({ where: { id: { in: vinculos.map((v) => v.question_id) } } });
  const porId = new Map(questoes.map((q) => [q.id, q]));
  for (const vinculo of vinculos) {
    const questao = porId.get(vinculo.question_id);
    if (!questao) continue;
    const resposta = respostas[vinculo.question_id] ?? null;
    const acerto = resposta !== null && resposta === questao.gabarito;
    await banco.attempts.create({ data: { user_id: userId, question_id: vinculo.question_id, alternativa_escolhida: resposta ?? "", acerto } });
  }
}

export async function entregarTentativa(userId: string, attemptId: string, deps: DepsSimulados = {}): Promise<ResultadoEntrega & { idempotente: boolean }> {
  const banco = deps.db ?? db;
  const attempt = await banco.simulado_attempts.findUnique({ where: { id: attemptId } });
  if (!attempt) throw new ErroSimulado("tentativa_nao_encontrada");
  if (attempt.user_id !== userId) throw new ErroSimulado("tentativa_de_outro_usuario");

  const simulado = await banco.simulados.findUnique({ where: { id: attempt.simulado_id } });
  if (!simulado) throw new ErroSimulado("simulado_nao_encontrado");
  await verificarAcessoSimulado(userId, simulado, banco, deps.agora); // B2: não expõe correção sem acesso

  // Idempotente: já entregue → retorna nota estável (B6); resultados de respostas congeladas.
  if (attempt.status === "entregue") {
    const resultado = await calcularResultado(attempt, banco);
    return { ...resultado, nota: notaComoNumero(attempt.nota), idempotente: true };
  }

  const resultado = await calcularResultado(attempt, banco);
  const agora = deps.agora ?? new Date();
  // Entrega atômica: só a 1ª entrega vira `entregue` (WHERE status=em_andamento). Concorrente → idempotente (B4).
  try {
    await banco.simulado_attempts.update({
      where: { id: attemptId, status: "em_andamento" },
      data: { respostas: attempt.respostas, status: "entregue", entregue_em: agora, nota: resultado.nota },
    });
  } catch {
    const entregue = await banco.simulado_attempts.findUnique({ where: { id: attemptId } });
    if (entregue?.status === "entregue") {
      const resultado2 = await calcularResultado(entregue, banco);
      return { ...resultado2, nota: notaComoNumero(entregue.nota), idempotente: true };
    }
    throw new ErroSimulado("tentativa_nao_encontrada");
  }
  // B8: alimenta o banco de erros apenas na 1ª entrega (idempotente).
  await alimentarBancoDeErros(userId, attempt, banco);
  return { ...resultado, idempotente: false };
}

export async function listarTentativas(userId: string, simuladoId: string, deps: DepsSimulados = {}): Promise<SimuladoAttempt[]> {
  const banco = deps.db ?? db;
  const simulado = await banco.simulados.findUnique({ where: { id: simuladoId } });
  if (!simulado) throw new ErroSimulado("simulado_nao_encontrado");
  await verificarAcessoSimulado(userId, simulado, banco, deps.agora); // B2
  return banco.simulado_attempts.findMany({ where: { user_id: userId, simulado_id: simuladoId } });
}

// --- Leitura segura para a UI (contrato mínimo, ora-1) ---

export type QuestaoSegura = { id: string; enunciado: string; alternativas: Array<{ letra: string; texto: string }>; ordem: number };
export type TentativaResponder = {
  estado: "em_andamento";
  id: string;
  simulado_id: string;
  duracao_minutos: number;
  iniciado_em: Date;
  deadline: Date;
  questoes: QuestaoSegura[];
};
export type TentativaEntregue = {
  estado: "entregue";
  id: string;
  simulado_id: string;
  nota: number;
  respostas: Record<string, string | null>;
  entregue_em: Date | null;
  questoes: QuestaoSegura[];
};
export type TentativaLeitura = TentativaResponder | TentativaEntregue;

function alternativasSeguras(question: Question): Array<{ letra: string; texto: string }> {
  return Array.isArray(question.alternativas) ? (question.alternativas as Array<{ letra: string; texto: string }>) : [];
}

// Monta o DTO seguro a partir do estado persistido. NÃO recomputa gabarito/comentário
// (limitação de snapshot por questão): expõe apenas respostas e dados imutáveis/permitidos.
async function montarLeitura(attempt: SimuladoAttempt, banco: DbSimulados, simulado: Simulado): Promise<TentativaLeitura> {
  const vinculos = await banco.simulado_questions.findMany({ where: { simulado_id: attempt.simulado_id } });
  const questoes = vinculos.length === 0 ? [] : await banco.questions.findMany({ where: { id: { in: vinculos.map((v) => v.question_id) } } });
  const porId = new Map(questoes.map((q) => [q.id, q]));
  const questoesSeguras: QuestaoSegura[] = vinculos
    .sort((a, b) => a.ordem - b.ordem)
    .map((v) => {
      const q = porId.get(v.question_id);
      if (!q) return null;
      return { id: q.id, enunciado: q.enunciado, alternativas: alternativasSeguras(q), ordem: q.ordem };
    })
    .filter((q): q is QuestaoSegura => q !== null);

  if (attempt.status === "entregue") {
    return {
      estado: "entregue",
      id: attempt.id,
      simulado_id: attempt.simulado_id,
      nota: notaComoNumero(attempt.nota),
      respostas: respostasComoMap(attempt.respostas),
      entregue_em: attempt.entregue_em,
      questoes: questoesSeguras,
    };
  }
  const deadline = new Date(attempt.iniciado_em.getTime() + simulado.duracao_minutos * 60_000);
  return {
    estado: "em_andamento",
    id: attempt.id,
    simulado_id: attempt.simulado_id,
    duracao_minutos: simulado.duracao_minutos,
    iniciado_em: attempt.iniciado_em,
    deadline,
    questoes: questoesSeguras,
  };
}

/**
 * Leitura segura para a UI executar o simulado. Reavaliar usuário não bloqueado + gating
 * de curso, confere ownership, aplica o prazo autoritativo (se expirou, entrega de forma
 * segura/idempotente) e nunca vaza gabarito/comentário antes da entrega. Questões retornadas
 * são apenas as vinculadas ao simulado.
 */
export async function obterTentativaParaResponder(userId: string, attemptId: string, deps: DepsSimulados = {}): Promise<TentativaLeitura> {
  const banco = deps.db ?? db;
  const attempt = await banco.simulado_attempts.findUnique({ where: { id: attemptId } });
  if (!attempt) throw new ErroSimulado("tentativa_nao_encontrada");
  if (attempt.user_id !== userId) throw new ErroSimulado("tentativa_de_outro_usuario");
  const simulado = await banco.simulados.findUnique({ where: { id: attempt.simulado_id } });
  if (!simulado) throw new ErroSimulado("simulado_nao_encontrado");
  await verificarAcessoSimulado(userId, simulado, banco, deps.agora); // B2: bloqueado + gating

  if (attempt.status === "em_andamento") {
    const prazo = new Date(attempt.iniciado_em.getTime() + simulado.duracao_minutos * 60_000);
    if ((deps.agora ?? new Date()).getTime() > prazo.getTime()) {
      // Prazo expirou: entrega automática segura/idempotente, depois retorna estado entregue.
      await entregarTentativa(userId, attemptId, deps);
      const entregue = await banco.simulado_attempts.findUnique({ where: { id: attemptId } });
      return montarLeitura(entregue ?? attempt, banco, simulado);
    }
  }
  return montarLeitura(attempt, banco, simulado);
}
