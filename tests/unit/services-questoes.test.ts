import { describe, expect, it, vi } from "vitest";
import type { questions } from "@/generated/prisma/client";
import { criarQuestao, type DbQuestoes } from "@/services/questoes/questoes";

vi.mock("@/lib/db", () => ({ db: {} }));
const base: questions = { id: "q1", material_id: "m1", enunciado: "Enunciado", alternativas: [], gabarito: "A", comentario_html: null, ordem: 1 };
const alternativas = (n = 4) => ["A", "B", "C", "D", "E"].slice(0, n).map((letra) => ({ letra: letra as "A" | "B" | "C" | "D" | "E", texto: `Texto ${letra}` }));
function fake(): { db: DbQuestoes; create: ReturnType<typeof vi.fn> } {
  const create = vi.fn(async () => base);
  return {
    create,
    db: {
      materials: { findUnique: vi.fn(async () => ({ tipo: "questoes" })) },
      questions: { findUnique: vi.fn(async () => base), findMany: vi.fn(async () => []), create, update: vi.fn(), delete: vi.fn(), aggregate: vi.fn(async () => ({ _max: { ordem: 0 } })) },
    },
  };
}

describe("CRUD de questões S4.1", () => {
  it("preserva a ordem e sanitiza comentário", async () => {
    const { db, create } = fake();
    await criarQuestao({ material_id: "m1", enunciado: "  Pergunta  ", alternativas: alternativas(), gabarito: "B", comentario_html: "<p>ok</p><script>alert(1)</script>" }, { db });
    expect(create.mock.calls[0][0].data.alternativas).toEqual(alternativas());
    expect(create.mock.calls[0][0].data.comentario_html).toBe("<p>ok</p>");
  });
  it("rejeita quantidade inválida e gabarito inexistente", async () => {
    const { db, create } = fake();
    await expect(criarQuestao({ material_id: "m1", enunciado: "X", alternativas: alternativas(3), gabarito: "A" }, { db })).rejects.toMatchObject({ campo: "alternativas" });
    await expect(criarQuestao({ material_id: "m1", enunciado: "X", alternativas: alternativas(), gabarito: "E" }, { db })).rejects.toMatchObject({ campo: "gabarito" });
    expect(create).not.toHaveBeenCalled();
  });
  it("rejeita material que não é do tipo questoes", async () => {
    const { db, create } = fake(); db.materials.findUnique = vi.fn(async () => ({ tipo: "texto" }));
    await expect(criarQuestao({ material_id: "m1", enunciado: "X", alternativas: alternativas(), gabarito: "A" }, { db })).rejects.toMatchObject({ campo: "material_id" });
    expect(create).not.toHaveBeenCalled();
  });
});
