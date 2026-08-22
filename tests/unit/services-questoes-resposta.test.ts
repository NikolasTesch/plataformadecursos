import { describe, expect, it, vi } from "vitest";
import type { questions } from "@/generated/prisma/client";
import { obterQuestao, responder, type DbResposta, type Attempt, ErroResposta } from "@/services/questoes/resposta";

vi.mock("@/lib/db", () => ({ db: {} }));

function fake(overrides: { acesso?: boolean; userId?: string } = {}) {
  const tentativas: Attempt[] = [];
  const question = { id: "q1", material_id: "m1", enunciado: "2+2?", alternativas: [{ letra: "A", texto: "3" }, { letra: "B", texto: "4" }, { letra: "C", texto: "5" }, { letra: "D", texto: "6" }], gabarito: "B", comentario_html: "<p>Correto</p><script>bad()</script>", ordem: 1 } as unknown as questions;
  const db: DbResposta = {
    questions: { findUnique: vi.fn(async () => question), findMany: vi.fn(async () => [question]) },
    materials: { findUnique: vi.fn(async () => ({ id: "m1", module_id: "mod1", status: "publicado" as const, amostra: overrides.acesso ?? true })) },
    modules: { findUnique: vi.fn(async () => ({ id: "mod1", course_id: "c1" })) },
    courses: { findUnique: vi.fn(async () => ({ id: "c1", incluido_assinatura: false })) },
    entitlements: { findMany: vi.fn(async () => []) },
    attempts: {
      create: vi.fn(async ({ data }) => ({ id: `a${tentativas.length + 1}`, ...data, criado_em: new Date() })),
      findMany: vi.fn(async ({ where }) => tentativas.filter((item) => item.user_id === where.user_id && where.question_id.in.includes(item.question_id))),
    },
  };
  (db.attempts.create as ReturnType<typeof vi.fn>).mockImplementation(async ({ data }) => {
    const attempt = { id: `a${tentativas.length + 1}`, ...data, criado_em: new Date() };
    tentativas.push(attempt);
    return attempt;
  });
  return { db, tentativas };
}

describe("resposta de questões S4.2", () => {
  it("oculta o gabarito antes da resposta e entrega feedback sanitizado", async () => {
    const { db } = fake();
    const antes = await obterQuestao("u1", "q1", { db });
    expect(antes).not.toHaveProperty("gabarito");
    const feedback = await responder("u1", "q1", "B", { db });
    expect(feedback).toMatchObject({ correta: true, gabarito: "B", comentario_html: "<p>Correto</p>" });
    expect(feedback.comentario_html).not.toContain("script");
  });

  it("mantém tentativas cumulativas e isola usuários", async () => {
    const { db } = fake();
    await responder("u1", "q1", "A", { db });
    await responder("u1", "q1", "B", { db });
    await responder("u2", "q1", "A", { db });
    expect((await responder("u1", "q1", "B", { db })).taxa).toMatchObject({ acertos: 2, total: 3 });
    expect((await responder("u2", "q1", "A", { db })).taxa).toMatchObject({ acertos: 0, total: 2 });
  });

  it("não cria tentativa quando o material está bloqueado", async () => {
    const { db } = fake({ acesso: false });
    await expect(responder("u1", "q1", "B", { db })).rejects.toBeInstanceOf(ErroResposta);
    expect(db.attempts.create).not.toHaveBeenCalled();
  });
});
