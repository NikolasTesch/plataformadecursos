import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/db", () => ({ db: {} }));

import { concluir, desmarcar, progressoCurso, ErroProgresso, type DbProgresso } from "@/services/aluno/progresso";

function bancoFake(materiais: Array<{ id: string; video_status?: "erro" | null }>): DbProgresso {
  const progresso = new Map<string, boolean>();
  const materialRows = materiais.map((material) => ({ ...material, module_id: "modulo-1", status: "publicado" as const, amostra: false }));
  return {
    materials: {
      findUnique: vi.fn(async ({ where }) => materialRows.find(({ id }) => id === where.id) ?? null),
      findMany: vi.fn(async () => materialRows),
    },
    modules: { findUnique: vi.fn(async () => ({ id: "modulo-1", course_id: "curso-1" })) },
    courses: { findUnique: vi.fn(async () => ({ id: "curso-1", incluido_assinatura: true })) },
    entitlements: { findMany: vi.fn(async () => [{ id: "ent-1", origem: "pagamento" as const, acesso_ate: new Date("2099-01-01"), product_id: "prod-1", product: { tipo: "assinatura" as const, curso_id: null, status: "ativo" as const } }]) },
    user_progress: {
      upsert: vi.fn(async ({ where, update }) => { progresso.set(`${where.user_id_material_id.user_id}:${where.user_id_material_id.material_id}`, update.concluido as boolean); return {}; }),
      updateMany: vi.fn(async ({ where, data }) => { const key = `${where.user_id}:${where.material_id}`; if (!progresso.has(key)) return { count: 0 }; progresso.set(key, data.concluido as boolean); return { count: 1 }; }),
      findUnique: vi.fn(async ({ where }) => { const key = `${where.user_id_material_id.user_id}:${where.user_id_material_id.material_id}`; return progresso.has(key) ? { concluido: progresso.get(key) ?? false } : null; }),
      findMany: vi.fn(async ({ where }) => materiais.filter(({ id }) => where.material_id.in.includes(id)).map(({ id }) => ({ material_id: id, concluido: progresso.get(`${where.user_id}:${id}`) ?? false }))),
    },
  };
}

describe("progresso do aluno (AL1)", () => {
  beforeEach(() => vi.clearAllMocks());

  it("calcula 33% com bloqueados fora do denominador", async () => {
    const banco = bancoFake([{ id: "1" }, { id: "2" }, { id: "3" }, { id: "4", video_status: "erro" }, { id: "5", video_status: "erro" }]);
    await concluir("aluno", "1", banco);
    expect(await progressoCurso("aluno", "curso-1", banco)).toBe(33);
  });

  it("concluir é idempotente e desmarcar recalcula", async () => {
    const banco = bancoFake([{ id: "1" }]);
    await concluir("aluno", "1", banco);
    await concluir("aluno", "1", banco);
    expect(await progressoCurso("aluno", "curso-1", banco)).toBe(100);
    await desmarcar("aluno", "1", banco);
    expect(await progressoCurso("aluno", "curso-1", banco)).toBe(0);
  });

  it("isola o progresso por userId", async () => {
    const banco = bancoFake([{ id: "1" }]);
    await concluir("aluno-1", "1", banco);
    expect(await progressoCurso("aluno-1", "curso-1", banco)).toBe(100);
    expect(await progressoCurso("aluno-2", "curso-1", banco)).toBe(0);
  });

  it("não grava conclusão para material bloqueado", async () => {
    const banco = bancoFake([{ id: "bloqueado", video_status: "erro" }]);
    await expect(concluir("aluno", "bloqueado", banco)).rejects.toBeInstanceOf(ErroProgresso);
    expect(banco.user_progress.upsert).not.toHaveBeenCalled();
  });
});
