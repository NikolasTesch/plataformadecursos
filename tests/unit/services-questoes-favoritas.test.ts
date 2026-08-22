import { describe, expect, it, vi } from "vitest";
import { desmarcarFavorita, ErroFavorita, listarFavoritas, marcarFavorita, type DbFavoritas, type Favorite } from "@/services/questoes/favoritas";

vi.mock("@/lib/db", () => ({ db: {} }));

function fake() {
  const favoritas: Favorite[] = [];
  const attempts = [{ user_id: "u1", question_id: "q1", acerto: false }];
  const erros = ["q1"];
  const question = { id: "q1", material_id: "m1" };
  const db: DbFavoritas = {
    questions: { findUnique: vi.fn(async ({ where }) => where.id === "q1" ? question : null) },
    materials: { findUnique: vi.fn(async () => ({ id: "m1", module_id: "mod1", status: "publicado" as const, amostra: true })) },
    modules: { findUnique: vi.fn(async () => ({ id: "mod1", course_id: "c1" })) },
    courses: { findUnique: vi.fn(async () => ({ id: "c1", incluido_assinatura: false })) },
    entitlements: { findMany: vi.fn(async () => []) },
    favorites: {
      upsert: vi.fn(async ({ create }) => favoritas.find((item) => item.user_id === create.user_id && item.question_id === create.question_id) ?? (() => { const item = { ...create, criado_em: new Date() }; favoritas.push(item); return item; })()),
      deleteMany: vi.fn(async ({ where }) => { const antes = favoritas.length; favoritas.splice(0, favoritas.length, ...favoritas.filter((item) => item.user_id !== where.user_id || item.question_id !== where.question_id)); return { count: antes - favoritas.length }; }),
      findMany: vi.fn(async ({ where }) => favoritas.filter((item) => item.user_id === where.user_id)),
    },
  };
  return { db, favoritas, attempts, erros };
}

describe("favoritas S4.4", () => {
  it("marca de forma idempotente e isola por usuário", async () => {
    const { db } = fake();
    await marcarFavorita("u1", "q1", { db });
    await marcarFavorita("u1", "q1", { db });
    await marcarFavorita("u2", "q1", { db });
    expect(await listarFavoritas("u1", { db })).toHaveLength(1);
    expect(await listarFavoritas("u2", { db })).toHaveLength(1);
    expect(db.favorites.upsert).toHaveBeenCalledTimes(3);
  });

  it("desmarca e tolera favorita ausente", async () => {
    const { db } = fake();
    expect(await desmarcarFavorita("u1", "q1", { db })).toEqual({ count: 0 });
    await marcarFavorita("u1", "q1", { db });
    expect(await desmarcarFavorita("u1", "q1", { db })).toEqual({ count: 1 });
    expect(await desmarcarFavorita("u1", "q1", { db })).toEqual({ count: 0 });
  });

  it("valida existência e não toca tentativas ou banco de erros", async () => {
    const { db, attempts, erros } = fake();
    await expect(marcarFavorita("u1", "inexistente", { db })).rejects.toMatchObject({ code: "questao_nao_encontrada" });
    await marcarFavorita("u1", "q1", { db });
    expect(attempts).toEqual([{ user_id: "u1", question_id: "q1", acerto: false }]);
    expect(erros).toEqual(["q1"]);
  });

  it("falha fechado quando o material não é acessível", async () => {
    const { db } = fake();
    (db.materials.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({ id: "m1", module_id: "mod1", status: "rascunho", amostra: false });
    await expect(marcarFavorita("u1", "q1", { db })).rejects.toBeInstanceOf(ErroFavorita);
  });
});
