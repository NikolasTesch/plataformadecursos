import { describe, expect, it, vi } from "vitest";
import {
  confirmarSugestao,
  criarFlashcard,
  descartarSugestao,
  listarFilaDoDia,
  revisarFlashcard,
  type DbFlashcards,
  type Flashcard,
} from "@/services/flashcards";
import type { DbErros } from "@/services/questoes/erros";
import type { EntitlementGating } from "@/services/gating";

vi.mock("@/lib/db", () => ({ db: {} }));

const ASSINATURA_ATIVA: EntitlementGating[] = [{
  id: "e1", origem: "admin", acesso_ate: new Date(2099, 0, 1), product_id: "p1",
  product: { tipo: "assinatura", curso_id: null, status: "ativo" },
}];

function spDate(d: Date): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit" }).format(d);
}

const HOJE = new Date("2026-01-01T12:00:00-03:00"); // meio-dia em SP → civil 2026-01-01

function fakeFlashcards(entitlements: EntitlementGating[] = ASSINATURA_ATIVA) {
  const flashcards: Flashcard[] = [];
  const materials: Record<string, { id: string; module_id: string; status: "rascunho" | "publicado"; amostra: boolean }> = {
    m1: { id: "m1", module_id: "mod1", status: "publicado", amostra: false },
    m3: { id: "m3", module_id: "mod3", status: "publicado", amostra: false },
  };
  const modules: Record<string, { id: string; course_id: string }> = { mod1: { id: "mod1", course_id: "c1" }, mod3: { id: "mod3", course_id: "c1" } };
  const courses = { c1: { id: "c1", incluido_assinatura: true } };

  const db: DbFlashcards = {
    flashcards: {
      create: vi.fn(async ({ data }) => { const f = { id: `f${flashcards.length + 1}`, criado_em: new Date(), atualizado_em: new Date(), ...data } as Flashcard; flashcards.push(f); return f; }),
      findUnique: vi.fn(async ({ where }) => flashcards.find((f) => f.id === where.id) ?? null),
      findMany: vi.fn(async ({ where, orderBy }) => {
        let lista = flashcards.filter((f) => f.user_id === where.user_id);
        if (where.proxima_revisao?.lte) lista = lista.filter((f) => f.proxima_revisao.getTime() <= where.proxima_revisao.lte.getTime());
        if (orderBy?.proxima_revisao !== undefined) lista = [...lista].sort((a, b) => a.proxima_revisao.getTime() - b.proxima_revisao.getTime());
        return lista;
      }),
      update: vi.fn(async ({ where, data }) => { const f = flashcards.find((x) => x.id === where.id)!; Object.assign(f, data); return f; }),
    },
    materials: { findUnique: vi.fn(async ({ where }) => materials[where.id] ?? null) },
    modules: { findUnique: vi.fn(async ({ where }) => modules[where.id] ?? null) },
    courses: { findUnique: vi.fn(async ({ where }) => courses[where.id as keyof typeof courses] ?? null) },
    questions: { findUnique: vi.fn(async ({ where }) => (where.id ? { id: where.id, material_id: where.id === "q9" ? "m3" : "m1" } : null)) },
    entitlements: { findMany: vi.fn(async () => entitlements) },
  };
  return { db, flashcards };
}

type FakeQuestao = { id: string; material_id: string; enunciado: string; comentario_html: string | null; gabarito: string };

function fakeErros(questoes: FakeQuestao[], tentativas: Array<{ user_id: string; question_id: string; acerto: boolean; criado_em: string }>) {
  const dbErros: DbErros = {
    attempts: { findMany: vi.fn(async ({ where }) => tentativas.filter((t) => t.user_id === where.user_id).map((t) => ({ id: `at${Math.random()}`, user_id: t.user_id, question_id: t.question_id, alternativa_escolhida: t.acerto ? "B" : "A", acerto: t.acerto, criado_em: new Date(t.criado_em) }))) },
    questions: { findMany: vi.fn(async ({ where }) => (where.id.in as string[]).map((id) => questoes.find((q) => q.id === id)).filter((q): q is FakeQuestao => q !== undefined)) },
  };
  return dbErros;
}

describe("flashcards S7.1 (F1–F4 + ora-1 B1/B9)", () => {
  it("F1/B9: acerto sobe nível e agenda pelo intervalo do nível ATUAL (0→1d, 1→3d)", async () => {
    const { db } = fakeFlashcards();
    const card = await criarFlashcard("u1", { pergunta: "p", resposta: "r" }, { db, agora: HOJE });
    const r1 = await revisarFlashcard("u1", card.id, true, { db, agora: HOJE }); // nível 0 → 1, +1d
    expect(r1.nivel).toBe(1);
    expect(spDate(r1.proxima_revisao)).toContain("2026-01-02");
    const r2 = await revisarFlashcard("u1", r1.id, true, { db, agora: HOJE }); // nível 1 → 2, +3d
    expect(r2.nivel).toBe(2);
    expect(spDate(r2.proxima_revisao)).toBe("2026-01-04");
  });

  it("F2/B9: erro reinicia ao nível 0 e agenda para o dia seguinte (SP civil)", async () => {
    const { db } = fakeFlashcards();
    const card = await criarFlashcard("u1", { pergunta: "p", resposta: "r" }, { db, agora: HOJE });
    const r = await revisarFlashcard("u1", card.id, false, { db, agora: HOJE });
    expect(r.nivel).toBe(0);
    expect(spDate(r.proxima_revisao)).toBe("2026-01-02");
  });

  it("F4: isolamento por usuário e validação de material/questão", async () => {
    const { db } = fakeFlashcards();
    const card = await criarFlashcard("u1", { pergunta: "p", resposta: "r", material_id: "m1" }, { db, agora: HOJE });
    await expect(revisarFlashcard("u2", card.id, true, { db, agora: HOJE })).rejects.toThrow("flashcard_de_outro_usuario");
    await expect(criarFlashcard("u1", { pergunta: "p", resposta: "r", material_id: "inexistente" }, { db, agora: HOJE })).rejects.toThrow("material_nao_encontrado");
    expect(await listarFilaDoDia("u1", HOJE, { db, agora: HOJE })).toHaveLength(1);
  });

  it("F3/B1: confirmação exige banco de erros + gating; nega por padrão", async () => {
    const { db, flashcards } = fakeFlashcards();
    const dbErrosOk = fakeErros(
      [{ id: "q9", material_id: "m3", enunciado: "Enunciado?", comentario_html: "<p>Coment</p>", gabarito: "B" }],
      [{ user_id: "u1", question_id: "q9", acerto: false, criado_em: "2026-01-01" }],
    );
    // não está no banco → nega
    const dbErrosVazio = fakeErros(
      [{ id: "q9", material_id: "m3", enunciado: "Enunciado?", comentario_html: "<p>Coment</p>", gabarito: "B" }],
      [],
    );
    await expect(confirmarSugestao("u1", "q9", { db, dbErros: dbErrosVazio, agora: HOJE })).rejects.toThrow("questao_nao_no_banco_de_erros");
    // está no banco, mas sem entitlement → acesso_negado
    const { db: dbSemAcesso } = fakeFlashcards([]);
    await expect(confirmarSugestao("u1", "q9", { db: dbSemAcesso, dbErros: dbErrosOk, agora: HOJE })).rejects.toThrow("acesso_negado");
    // está no banco + gating → cria
    const criado = await confirmarSugestao("u1", "q9", { db, dbErros: dbErrosOk, agora: HOJE });
    expect(criado.question_id).toBe("q9");
    expect(criado.pergunta).toBe("Enunciado?");
    expect(flashcards).toHaveLength(1);
    // descarte não cria
    expect(descartarSugestao()).toEqual({ criado: false });
    expect(flashcards).toHaveLength(1);
  });
});
