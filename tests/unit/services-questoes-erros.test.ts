import { describe, expect, it, vi } from "vitest";
import { listarErros, sugerirFlashcard, type DbErros } from "@/services/questoes/erros";
import type { Attempt } from "@/services/questoes/resposta";

vi.mock("@/lib/db", () => ({ db: {} }));

function fake(tentativas: Attempt[]): DbErros {
  return {
    attempts: { findMany: vi.fn(async ({ where }) => tentativas.filter(({ user_id }) => user_id === where.user_id)) },
    questions: { findMany: vi.fn(async ({ where }) => where.id.in.map((id: string) => ({ id, material_id: "m1" }))) },
  };
}

function tentativa(id: string, user_id: string, acerto: boolean, criado_em: string): Attempt {
  return { id, user_id, question_id: "q1", alternativa_escolhida: acerto ? "B" : "A", acerto, criado_em: new Date(criado_em) };
}

describe("banco de erros S4.3", () => {
  it("entra após erro, permanece após um acerto e sai após dois acertos", async () => {
    const historico = [tentativa("e", "u1", false, "2026-01-01"), tentativa("a1", "u1", true, "2026-01-02")];
    expect(await listarErros("u1", { db: fake(historico) })).toHaveLength(1);

    historico.push(tentativa("a2", "u1", true, "2026-01-03"));
    expect(await listarErros("u1", { db: fake(historico) })).toHaveLength(0);
  });

  it("volta ao banco quando um novo erro reinicia a sequência e isola usuários", async () => {
    const historico = [
      tentativa("a1", "u1", true, "2026-01-02"),
      tentativa("a2", "u1", true, "2026-01-03"),
      tentativa("e2", "u1", false, "2026-01-04"),
      { ...tentativa("outro", "u2", false, "2026-01-05"), question_id: "q2" },
    ];
    const banco = fake(historico);
    expect((await listarErros("u1", { db: banco })).map(({ question_id }) => question_id)).toEqual(["q1"]);
    expect((await listarErros("u2", { db: banco })).map(({ question_id }) => question_id)).toEqual(["q2"]);
  });

  it("emite intenção de flashcard sem criar cartão", () => {
    const emitirEvento = vi.fn();
    const resultado = sugerirFlashcard("u1", "q1", { emitirEvento });
    expect(resultado.criado).toBe(false);
    expect(emitirEvento).toHaveBeenCalledWith({ tipo: "sugestao_flashcard", userId: "u1", questionId: "q1" });
  });
});
