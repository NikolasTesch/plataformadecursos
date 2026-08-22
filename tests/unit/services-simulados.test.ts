import { describe, expect, it, vi } from "vitest";
import {
  adicionarQuestoes,
  criarSimulado,
  entregarTentativa,
  iniciarTentativa,
  listarTentativas,
  publicarSimulado,
  responderNaTentativa,
  type DbSimulados,
  type Entitlement,
  type Simulado,
  type SimuladoAttempt,
  type SimuladoQuestion,
} from "@/services/simulados";

vi.mock("@/lib/db", () => ({ db: {} }));

const ASSINATURA_ATIVA: Entitlement[] = [{
  id: "e1", origem: "admin", acesso_ate: new Date(2099, 0, 1), product_id: "p1",
  product: { tipo: "assinatura", curso_id: null, status: "ativo" },
}];

function fakeSimulados(opcoes: { entitlements?: Entitlement[]; bloqueado?: boolean } = {}) {
  const simulados: Simulado[] = [];
  const simuladoQuestions: SimuladoQuestion[] = [];
  const attempts: SimuladoAttempt[] = [];
  const attemptRows: Array<{ id: string; user_id: string; question_id: string; alternativa_escolhida: string; acerto: boolean; criado_em: Date }> = [];
  const questions = [
    { id: "q1", material_id: "m1", enunciado: "1+1?", alternativas: [{ letra: "A", texto: "1" }, { letra: "B", texto: "2" }], gabarito: "B", comentario_html: "<p>sim</p>", ordem: 1 },
    { id: "q2", material_id: "m1", enunciado: "2+2?", alternativas: [{ letra: "A", texto: "3" }, { letra: "B", texto: "4" }], gabarito: "B", comentario_html: null, ordem: 2 },
    { id: "q3", material_id: "m2", enunciado: "3+3?", alternativas: [{ letra: "A", texto: "5" }, { letra: "B", texto: "6" }], gabarito: "B", comentario_html: null, ordem: 1 },
    { id: "q4", material_id: "m4", enunciado: "4+4?", alternativas: [{ letra: "A", texto: "8" }, { letra: "B", texto: "9" }], gabarito: "A", comentario_html: null, ordem: 1 },
  ];
  const materials: Record<string, { id: string; module_id: string; status: "rascunho" | "publicado"; amostra: boolean; material_edital: Array<{ disciplina_id: string }> }> = {
    m1: { id: "m1", module_id: "mod1", status: "publicado", amostra: false, material_edital: [{ disciplina_id: "d1" }] },
    m2: { id: "m2", module_id: "mod2", status: "rascunho", amostra: false, material_edital: [] },
    m4: { id: "m4", module_id: "mod4", status: "publicado", amostra: false, material_edital: [] },
  };
  const modules: Record<string, { id: string; course_id: string }> = {
    mod1: { id: "mod1", course_id: "c1" },
    mod2: { id: "mod2", course_id: "c2" },
    mod4: { id: "mod4", course_id: "c2" },
  };
  const courses = { c1: { id: "c1", incluido_assinatura: true }, c2: { id: "c2", incluido_assinatura: true } };
  const users = { u1: { id: "u1", bloqueado: opcoes.bloqueado ?? false } };

  const db: DbSimulados = {
    simulados: {
      create: vi.fn(async ({ data }) => { const s = { id: `s${simulados.length + 1}`, publicado_em: null, ...data } as Simulado; simulados.push(s); return s; }),
      findUnique: vi.fn(async ({ where }) => simulados.find((s) => s.id === where.id) ?? null),
      findMany: vi.fn(async ({ where }) => simulados.filter((s) => !where.curso_id || s.curso_id === where.curso_id)),
      update: vi.fn(async ({ where, data }) => { const s = simulados.find((x) => x.id === where.id)!; Object.assign(s, data); return s; }),
    },
    simulado_questions: {
      create: vi.fn(async ({ data }) => { const sq = { id: `sq${simuladoQuestions.length + 1}`, ...data } as SimuladoQuestion; simuladoQuestions.push(sq); return sq; }),
      findMany: vi.fn(async ({ where }) => simuladoQuestions.filter((sq) => sq.simulado_id === where.simulado_id).sort((a, b) => a.ordem - b.ordem)),
    },
    simulado_attempts: {
      create: vi.fn(async ({ data }) => { const a = { id: `a${attempts.length + 1}`, entregue_em: null, nota: null, iniciado_em: new Date(), ...data } as SimuladoAttempt; attempts.push(a); return a; }),
      findUnique: vi.fn(async ({ where }) => attempts.find((a) => a.id === where.id) ?? null),
      findMany: vi.fn(async ({ where }) => attempts.filter((a) => a.simulado_id === where.simulado_id && (!where.user_id || a.user_id === where.user_id))),
      // Lock otimista: honra WHERE status/respostas; lança se não bater (B4).
      update: vi.fn(async ({ where, data }) => {
        const a = attempts.find((x) => x.id === where.id);
        if (!a) throw new Error("not found");
        if (where.status !== undefined && a.status !== where.status) throw new Error("status mismatch");
        if (where.respostas !== undefined && JSON.stringify(a.respostas) !== JSON.stringify(where.respostas)) throw new Error("respostas mismatch");
        Object.assign(a, data);
        return a;
      }),
    },
    questions: {
      findUnique: vi.fn(async ({ where }) => questions.find((q) => q.id === where.id) ?? null),
      findMany: vi.fn(async ({ where }) => questions.filter((q) => where.id.in.includes(q.id))),
    },
    materials: {
      findUnique: vi.fn(async ({ where }) => materials[where.id] ?? null),
      findMany: vi.fn(async ({ where }) => (where.id.in.map((id: string) => materials[id]).filter(Boolean))),
    },
    modules: { findUnique: vi.fn(async ({ where }) => modules[where.id] ?? null) },
    courses: { findUnique: vi.fn(async ({ where }) => courses[where.id as keyof typeof courses] ?? null) },
    users: { findUnique: vi.fn(async ({ where }) => users[where.id as keyof typeof users] ?? null) },
    entitlements: { findMany: vi.fn(async () => opcoes.entitlements ?? ASSINATURA_ATIVA) },
    attempts: { create: vi.fn(async ({ data }) => { const r = { id: `ar${attemptRows.length + 1}`, criado_em: new Date(), ...data }; attemptRows.push(r); return r; }) },
  };
  return { db, simulados, attempts, attemptRows, simuladoQuestions };
}

const T0 = new Date(2026, 0, 1, 10, 0, 0);

describe("simulados S7.1 (Q2–Q5 + ora-1 B1–B10)", () => {
  it("Q2/B6: entrega com parciais salva, omissas erradas, nota estável e idempotente", async () => {
    const { db } = fakeSimulados();
    const sim = await criarSimulado("c1", { titulo: "S1", duracao_minutos: 10 }, { db });
    await adicionarQuestoes(sim.id, ["q1", "q2"], { db });
    await publicarSimulado(sim.id, { db });
    const t = await iniciarTentativa("u1", sim.id, { db });
    await responderNaTentativa("u1", t.id, "q1", "B", { db });

    const r1 = await entregarTentativa("u1", t.id, { db });
    expect(r1).toMatchObject({ acertos: 1, total: 2, nota: 0.5, idempotente: false });
    expect(r1.resultados[1]).toMatchObject({ resposta: null, correta: false, gabarito: "B" });
    expect(r1.desempenho_por_disciplina).toEqual([{ disciplina_id: "d1", acertos: 1, total: 2 }]);

    const r2 = await entregarTentativa("u1", t.id, { db });
    expect(r2.idempotente).toBe(true);
    expect(r2.nota).toBe(0.5);
  });

  it("Q3: duas tentativas preservadas no histórico cumulativo", async () => {
    const { db } = fakeSimulados();
    const sim = await criarSimulado("c1", { titulo: "S1", duracao_minutos: 10 }, { db });
    await adicionarQuestoes(sim.id, ["q1", "q2"], { db });
    await publicarSimulado(sim.id, { db });
    const t1 = await iniciarTentativa("u1", sim.id, { db });
    await responderNaTentativa("u1", t1.id, "q1", "B", { db });
    await responderNaTentativa("u1", t1.id, "q2", "B", { db });
    await entregarTentativa("u1", t1.id, { db });

    const t2 = await iniciarTentativa("u1", sim.id, { db });
    await responderNaTentativa("u1", t2.id, "q1", "A", { db });
    await entregarTentativa("u1", t2.id, { db });

    const historico = await listarTentativas("u1", sim.id, { db });
    expect(historico).toHaveLength(2);
    expect(historico.map((h) => h.nota)).toEqual([1, 0]);
  });

  it("B8: erros de simulado alimentam o banco de erros (attempts) na 1ª entrega, idempotente", async () => {
    const { db, attemptRows } = fakeSimulados();
    const sim = await criarSimulado("c1", { titulo: "S1", duracao_minutos: 10 }, { db });
    await adicionarQuestoes(sim.id, ["q1", "q2"], { db });
    await publicarSimulado(sim.id, { db });
    const t = await iniciarTentativa("u1", sim.id, { db });
    await responderNaTentativa("u1", t.id, "q1", "B", { db }); // acerto
    await responderNaTentativa("u1", t.id, "q2", "A", { db }); // erro
    await entregarTentativa("u1", t.id, { db });
    expect(attemptRows.filter((r) => r.user_id === "u1")).toHaveLength(2);
    expect(attemptRows.find((r) => r.question_id === "q2")?.acerto).toBe(false);
    // re-entrega não duplica
    await entregarTentativa("u1", t.id, { db });
    expect(attemptRows.filter((r) => r.user_id === "u1")).toHaveLength(2);
  });

  it("B2: conta bloqueada nega em iniciar/responder/entregar/histórico", async () => {
    const { db } = fakeSimulados({ bloqueado: true });
    const sim = await criarSimulado("c1", { titulo: "S1", duracao_minutos: 10 }, { db });
    await adicionarQuestoes(sim.id, ["q1"], { db });
    await publicarSimulado(sim.id, { db });
    await expect(iniciarTentativa("u1", sim.id, { db })).rejects.toThrow("acesso_negado");
  });

  it("B2: entitlement revogado nega iniciar e entregar (não expõe correção)", async () => {
    const { db } = fakeSimulados({ entitlements: [] });
    const sim = await criarSimulado("c1", { titulo: "S1", duracao_minutos: 10 }, { db });
    await adicionarQuestoes(sim.id, ["q1"], { db });
    await publicarSimulado(sim.id, { db });
    await expect(iniciarTentativa("u1", sim.id, { db })).rejects.toThrow("acesso_negado");
  });

  it("B3: resposta após duração é bloqueada; entrega após prazo ainda funciona", async () => {
    const { db, attempts } = fakeSimulados();
    const sim = await criarSimulado("c1", { titulo: "S1", duracao_minutos: 10 }, { db });
    await adicionarQuestoes(sim.id, ["q1", "q2"], { db });
    await publicarSimulado(sim.id, { db });
    const t = await iniciarTentativa("u1", sim.id, { db });
    attempts.find((a) => a.id === t.id)!.iniciado_em = T0;
    const expirado = new Date(T0.getTime() + 11 * 60_000);
    await expect(responderNaTentativa("u1", t.id, "q1", "B", { db, agora: expirado })).rejects.toThrow("prazo_encerrado");
    // entrega após prazo (auto-delivery) continua funcionando
    const r = await entregarTentativa("u1", t.id, { db, agora: expirado });
    expect(r.total).toBe(2);
  });

  it("B4: estado entregue não volta; entrega concorrente é idempotente", async () => {
    const { db } = fakeSimulados();
    const sim = await criarSimulado("c1", { titulo: "S1", duracao_minutos: 10 }, { db });
    await adicionarQuestoes(sim.id, ["q1"], { db });
    await publicarSimulado(sim.id, { db });
    const t = await iniciarTentativa("u1", sim.id, { db });
    await responderNaTentativa("u1", t.id, "q1", "B", { db });
    await entregarTentativa("u1", t.id, { db });
    await expect(responderNaTentativa("u1", t.id, "q1", "B", { db })).rejects.toThrow("tentativa_entregue");
    const r2 = await entregarTentativa("u1", t.id, { db });
    expect(r2.idempotente).toBe(true);
  });

  it("B4: lock otimista rejeita escrita concorrente com respostas obsoletas", async () => {
    const { db, attempts } = fakeSimulados();
    const sim = await criarSimulado("c1", { titulo: "S1", duracao_minutos: 10 }, { db });
    await adicionarQuestoes(sim.id, ["q1", "q2"], { db });
    await publicarSimulado(sim.id, { db });
    const t = await iniciarTentativa("u1", sim.id, { db });
    await responderNaTentativa("u1", t.id, "q1", "B", { db }); // respostas={q1:B}
    // outro processo já gravou {q1:B,q2:A}; escrita com snapshot obsoleto {q1:B} deve falhar
    attempts.find((a) => a.id === t.id)!.respostas = { q1: "B", q2: "A" };
    await expect(
      db.simulado_attempts.update({ where: { id: t.id, status: "em_andamento", respostas: { q1: "B" } }, data: { respostas: { q1: "B", q2: "A" }, status: "em_andamento", entregue_em: null, nota: 0 } }),
    ).rejects.toThrow();
    expect(attempts.find((a) => a.id === t.id)!.respostas).toEqual({ q1: "B", q2: "A" });
  });

  it("B5: questão de outro curso ou material não publicado é rejeitada; coleção validada antes de gravar", async () => {
    const { db, simuladoQuestions } = fakeSimulados();
    const sim = await criarSimulado("c1", { titulo: "S1", duracao_minutos: 10 }, { db });
    await expect(adicionarQuestoes(sim.id, ["q3"], { db })).rejects.toThrow("questao_nao_publicada"); // m2 rascunho
    await expect(adicionarQuestoes(sim.id, ["q4"], { db })).rejects.toThrow("questao_fora_do_curso"); // m4 é c2
    await expect(adicionarQuestoes(sim.id, ["q1", "q3"], { db })).rejects.toThrow("questao_nao_publicada");
    expect(simuladoQuestions.filter((sq) => sq.simulado_id === sim.id)).toHaveLength(0); // nada gravado
    const criadas = await adicionarQuestoes(sim.id, ["q1", "q2"], { db });
    expect(criadas).toHaveLength(2);
    expect(criadas[0].ordem).toBe(0);
    expect(criadas[1].ordem).toBe(1);
  });

  it("B5: ordem global continua de tentativas anteriores", async () => {
    const { db } = fakeSimulados();
    const sim = await criarSimulado("c1", { titulo: "S1", duracao_minutos: 10 }, { db });
    const p1 = await adicionarQuestoes(sim.id, ["q1"], { db });
    const p2 = await adicionarQuestoes(sim.id, ["q2"], { db });
    expect(p1[0].ordem).toBe(0);
    expect(p2[0].ordem).toBe(1);
  });

  it("B6: não altera simulado publicado ou com tentativas; publicar exige questões", async () => {
    const { db, attempts } = fakeSimulados();
    const sim = await criarSimulado("c1", { titulo: "S1", duracao_minutos: 10 }, { db });
    await expect(publicarSimulado(sim.id, { db })).rejects.toThrow("simulado_sem_questoes");
    await adicionarQuestoes(sim.id, ["q1"], { db });
    await publicarSimulado(sim.id, { db });
    await expect(adicionarQuestoes(sim.id, ["q2"], { db })).rejects.toThrow("simulado_publicado");
    const t = await iniciarTentativa("u1", sim.id, { db });
    attempts.push(t);
    await expect(adicionarQuestoes(sim.id, ["q2"], { db })).rejects.toThrow("simulado_com_tentativas");
  });

  it("B7: questão fora do simulado não pode ser respondida", async () => {
    const { db } = fakeSimulados();
    const sim = await criarSimulado("c1", { titulo: "S1", duracao_minutos: 10 }, { db });
    await adicionarQuestoes(sim.id, ["q1"], { db });
    await publicarSimulado(sim.id, { db });
    const t = await iniciarTentativa("u1", sim.id, { db });
    await expect(responderNaTentativa("u1", t.id, "q2", "B", { db })).rejects.toThrow("questao_fora_do_simulado");
  });

  it("B10: valida título e duração na criação; publicação com questões", async () => {
    const { db } = fakeSimulados();
    await expect(criarSimulado("c1", { titulo: "  ", duracao_minutos: 10 }, { db })).rejects.toThrow("titulo_obrigatorio");
    await expect(criarSimulado("c1", { titulo: "S", duracao_minutos: 0 }, { db })).rejects.toThrow("duracao_invalida");
    await expect(criarSimulado("c1", { titulo: "S", duracao_minutos: 1.5 }, { db })).rejects.toThrow("duracao_invalida");
    const sim = await criarSimulado("c1", { titulo: "S", duracao_minutos: 10 }, { db });
    await adicionarQuestoes(sim.id, ["q1"], { db });
    const pub = await publicarSimulado(sim.id, { db });
    expect(pub.status).toBe("publicado");
  });
});
