import { describe, expect, it, vi } from "vitest";
import { entregarSessaoProva, iniciarSessaoProva, marcarParaRevisao, responderEmProva, responderModoEstudo, type DbModo } from "@/services/questoes/modo";
import type { Attempt } from "@/services/questoes/resposta";

vi.mock("@/lib/db", () => ({ db: {} }));

function fake() {
  const tentativas: Attempt[] = [];
  const questions = [
    { id: "q1", material_id: "m1", enunciado: "1+1?", alternativas: [{ letra: "A", texto: "1" }, { letra: "B", texto: "2" }, { letra: "C", texto: "3" }, { letra: "D", texto: "4" }], gabarito: "B", comentario_html: "<p>sim</p>", ordem: 1 },
    { id: "q2", material_id: "m1", enunciado: "2+2?", alternativas: [{ letra: "A", texto: "3" }, { letra: "B", texto: "4" }, { letra: "C", texto: "5" }, { letra: "D", texto: "6" }], gabarito: "B", comentario_html: null, ordem: 2 },
  ];
  const db: DbModo = {
    questions: { findMany: vi.fn(async () => questions), findUnique: vi.fn(async ({ where }) => questions.find((q) => q.id === where.id) ?? null) },
    materials: { findUnique: vi.fn(async () => ({ id: "m1", module_id: "mod1", status: "publicado" as const, amostra: true, tipo: "questoes" })) },
    modules: { findUnique: vi.fn(async () => ({ id: "mod1", course_id: "c1" })) },
    courses: { findUnique: vi.fn(async () => ({ id: "c1", incluido_assinatura: false })) },
    entitlements: { findMany: vi.fn(async () => []) },
    attempts: {
      create: vi.fn(async ({ data }) => { const attempt = { id: `a${tentativas.length}`, ...data, criado_em: new Date() }; tentativas.push(attempt); return attempt; }),
      findMany: vi.fn(async ({ where }) => tentativas.filter((attempt) => attempt.user_id === where.user_id && where.question_id.in.includes(attempt.question_id))),
    },
  };
  return { db, tentativas };
}

describe("modo de questões S4.5", () => {
  it("não revela gabarito, aceita revisão e corrige não respondida apenas na entrega", async () => {
    const { db, tentativas } = fake();
    const sessao = await iniciarSessaoProva("m1", "u1", { db });
    expect(sessao).not.toHaveProperty("gabaritos");
    expect(sessao.questoes[0]).not.toHaveProperty("gabarito");
    responderEmProva(sessao.id, "u1", "q1", "B");
    const revisada = marcarParaRevisao(sessao.id, "u1", "q2");
    expect(revisada.revisar).toEqual(["q2"]);
    expect(tentativas).toHaveLength(0);
    const resultado = await entregarSessaoProva(sessao.id, "u1", { db });
    expect(resultado).toMatchObject({ acertos: 1, total: 2 });
    expect(resultado.resultados[1]).toMatchObject({ resposta: null, correta: false, gabarito: "B" });
    expect(tentativas).toHaveLength(2);
  });

  it("mantém estudo com feedback imediato reutilizando S4.2", async () => {
    const { db } = fake();
    const feedback = await responderModoEstudo("u1", "q1", "B", { db });
    expect(feedback).toMatchObject({ correta: true, gabarito: "B" });
  });
});
