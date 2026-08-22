// Testes unitários do serviço de trilhas (US-25 / S7.1).
//
// O `db` é injetado via `deps` (fake tipado com `DbTrilhas`); @/lib/db é mockado
// para impedir a construção do PrismaClient real (padrão D29). Cobre: E2E-T1
// (ordenação por peso), E2E-T2 (versionamento — `versao_ativacao` e `plano_snapshot`
// congelados na ativação; plano v1 preservado; novo aluno vê v2), E2E-T3 (múltiplas
// trilhas ativas), ativação exige edital publicado, e progresso por disciplina
// reutilizando o gating AL1 (bloqueados ficam fora do denominador — T5).
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { editals, MaterialTipo, user_trilhas } from "@/generated/prisma/client";
import type { EntitlementGating } from "@/services/gating";

const mocksDb = vi.hoisted(() => ({
  editalsFindUnique: vi.fn(),
  editalsFindMany: vi.fn(),
  disciplinasFindMany: vi.fn(),
  vinculosFindMany: vi.fn(),
  materiaisFindMany: vi.fn(),
  trilhasFindUnique: vi.fn(),
  trilhasFindMany: vi.fn(),
  trilhasUpsert: vi.fn(),
  trilhasUpdate: vi.fn(),
  entitlementsFindMany: vi.fn(),
  progressFindMany: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  db: {
    editals: { findUnique: mocksDb.editalsFindUnique, findMany: mocksDb.editalsFindMany },
    edital_disciplines: { findMany: mocksDb.disciplinasFindMany },
    material_edital: { findMany: mocksDb.vinculosFindMany },
    materials: { findMany: mocksDb.materiaisFindMany },
    user_trilhas: {
      findUnique: mocksDb.trilhasFindUnique,
      findMany: mocksDb.trilhasFindMany,
      upsert: mocksDb.trilhasUpsert,
      update: mocksDb.trilhasUpdate,
    },
    entitlements: { findMany: mocksDb.entitlementsFindMany },
    user_progress: { findMany: mocksDb.progressFindMany },
  },
}));

import {
  ativarTrilha,
  desativarTrilha,
  listarEditaisPublicados,
  listarTrilhasAtivas,
  montarPlano,
  obterPlanoTrilha,
  type DbTrilhas,
  type MaterialPlano,
  type PlanoSnapshot,
} from "@/services/trilhas";
import { ErroTrilha } from "@/services/trilhas/erros";

interface MaterialComCurso {
  id: string;
  titulo: string;
  tipo: MaterialTipo;
  ordem: number;
  status: "rascunho" | "publicado";
  amostra: boolean;
  module_id: string;
  modulo: { id: string; course_id: string; course: { id: string; incluido_assinatura: boolean } };
}

function criarDbFake() {
  const editalsStore = new Map<string, editals>();
  const disciplinasStore = new Map<string, { id: string; edital_id: string; nome: string; peso: number }>();
  const vinculosStore = new Map<string, { material_id: string; edital_id: string; disciplina_id: string | null }>();
  const materiaisStore = new Map<string, MaterialComCurso>();
  const trilhasStore = new Map<string, user_trilhas>();
  const concluidos = new Set<string>();
  let seq = 0;
  const novoId = (p: string) => `${p}-${++seq}`;
  const chaveTrilha = (u: string, e: string) => `${u}|${e}`;

  const db = {
    editals: {
      findUnique: async ({ where }: { where: { id: string } }) => editalsStore.get(where.id) ?? null,
      findMany: async ({ where }: { where: { status: "publicado" } }) =>
        [...editalsStore.values()].filter((e) => e.status === where.status),
    },
    edital_disciplines: {
      findMany: async ({ where, orderBy }: { where: { edital_id: string }; orderBy?: { peso: "desc" } }) => {
        const l = [...disciplinasStore.values()].filter((d) => d.edital_id === where.edital_id);
        if (orderBy?.peso === "desc") l.sort((a, b) => b.peso - a.peso);
        return l;
      },
    },
    material_edital: {
      findMany: async ({ where }: { where: { edital_id: string } }) =>
        [...vinculosStore.values()].filter((v) => v.edital_id === where.edital_id),
    },
    materials: {
      findMany: async ({
        where,
        include,
      }: {
        where: { id: { in: string[] } };
        include?: { modulo: { include: { course: true } } };
      }) => {
        void include;
        return [...materiaisStore.values()].filter((m) => where.id.in.includes(m.id));
      },
    },
    user_trilhas: {
      findUnique: async ({
        where,
      }: {
        where: { user_id_edital_id: { user_id: string; edital_id: string } };
      }) => trilhasStore.get(chaveTrilha(where.user_id_edital_id.user_id, where.user_id_edital_id.edital_id)) ?? null,
      findMany: async ({ where }: { where: { user_id: string; ativo?: boolean } }) =>
        [...trilhasStore.values()].filter(
          (t) => t.user_id === where.user_id && (where.ativo === undefined || t.ativo === where.ativo),
        ),
      upsert: async ({
        where,
        update,
        create,
      }: {
        where: { user_id_edital_id: { user_id: string; edital_id: string } };
        update: { ativo: boolean; versao_ativacao: number; plano_snapshot: unknown };
        create: { user_id: string; edital_id: string; ativo: boolean; versao_ativacao: number; plano_snapshot: unknown };
      }) => {
        const k = chaveTrilha(where.user_id_edital_id.user_id, where.user_id_edital_id.edital_id);
        const existente = trilhasStore.get(k);
        const registro = (existente ?? { id: novoId("trilha") }) as user_trilhas;
        const novo = {
          ...registro,
          user_id: create.user_id,
          edital_id: create.edital_id,
          ativo: update.ativo,
          versao_ativacao: update.versao_ativacao,
          plano_snapshot: update.plano_snapshot,
        } as unknown as user_trilhas;
        trilhasStore.set(k, novo);
        return novo;
      },
      update: async ({
        where,
        data,
      }: {
        where: { id: string };
        data: { ativo?: boolean; versao_ativacao?: number; plano_snapshot?: unknown };
      }) => {
        const atual = [...trilhasStore.values()].find((t) => t.id === where.id);
        if (!atual) throw new Error("trilha não encontrada");
        const novo = { ...atual, ...data } as unknown as user_trilhas;
        trilhasStore.set(chaveTrilha(atual.user_id, atual.edital_id), novo);
        return novo;
      },
    },
    entitlements: {
      findMany: async ({ where, include }: { where: { user_id: string }; include?: { product: boolean } }) => {
        void where;
        void include;
        return [] as Array<EntitlementGating & { product: NonNullable<EntitlementGating["product"]> }>;
      },
    },
    user_progress: {
      findMany: async ({
        where,
      }: {
        where: { user_id: string; material_id: { in: string[] } };
        select: { material_id: boolean; concluido: boolean };
      }) =>
        where.material_id.in
          .filter((id) => concluidos.has(id))
          .map((material_id) => ({ material_id, concluido: true })),
    },
  } as unknown as DbTrilhas;

  return {
    db,
    editalsStore,
    disciplinasStore,
    vinculosStore,
    materiaisStore,
    trilhasStore,
    concluidos,
  };
}

function criarEditalFake(overrides: Partial<editals> = {}): editals {
  return {
    id: "ed-1",
    nome: "TRT-24",
    banca: "FCC",
    data_prova: null,
    status: "publicado",
    versao: 1,
    publicada_em: new Date("2026-01-01"),
    ...overrides,
  } as editals;
}

function criarMaterialFake(
  id: string,
  disciplinaId: string | null,
  opts: Partial<MaterialComCurso> = {},
): MaterialComCurso {
  return {
    id,
    titulo: `Material ${id}`,
    tipo: "texto",
    ordem: 1,
    status: "publicado",
    amostra: false,
    module_id: "mod-1",
    modulo: { id: "mod-1", course_id: "curso-1", course: { id: "curso-1", incluido_assinatura: false } },
    disciplina_id: disciplinaId,
    ...opts,
  } as unknown as MaterialComCurso;
}

describe("trilhas — montarPlano (puro, T2)", () => {
  it("ordena disciplinas por peso desc e materiais por ordem", () => {
    const disciplinas = [
      { id: "d-info", nome: "Informática", peso: 1 },
      { id: "d-port", nome: "Português", peso: 3 },
    ];
    const materiais: MaterialPlano[] = [
      criarMaterialFake("m1", "d-port", { ordem: 2 }) as unknown as MaterialPlano,
      criarMaterialFake("m2", "d-port", { ordem: 1 }) as unknown as MaterialPlano,
      criarMaterialFake("m3", "d-info", { ordem: 1 }) as unknown as MaterialPlano,
    ];
    const plano = montarPlano(disciplinas, materiais);
    expect(plano[0].id).toBe("d-port");
    expect(plano[1].id).toBe("d-info");
    expect(plano[0].materiais.map((m) => m.id)).toEqual(["m2", "m1"]);
  });

  it("agrupa materiais sem disciplina em 'Sem disciplina'", () => {
    const plano = montarPlano([], [criarMaterialFake("m1", null) as unknown as MaterialPlano]);
    expect(plano).toHaveLength(1);
    expect(plano[0].nome).toBe("Sem disciplina");
  });
});

describe("trilhas — ativação e listagem (T3/T4)", () => {
  let ctx: ReturnType<typeof criarDbFake>;
  beforeEach(() => {
    ctx = criarDbFake();
    ctx.editalsStore.set("ed-1", criarEditalFake({ id: "ed-1", versao: 1 }));
    ctx.editalsStore.set("ed-2", criarEditalFake({ id: "ed-2", versao: 1, nome: "INSS" }));
  });

  it("ativa trilha congelando versao_ativacao = versao do edital e criando snapshot", async () => {
    const t = await ativarTrilha("u1", "ed-1", { db: ctx.db });
    expect(t.ativo).toBe(true);
    expect(t.versao_ativacao).toBe(1);
    expect(t.plano_snapshot).toBeDefined();
  });

  it("ativa múltiplas trilhas (T4) — ambas ficam ativas", async () => {
    await ativarTrilha("u1", "ed-1", { db: ctx.db });
    await ativarTrilha("u1", "ed-2", { db: ctx.db });
    const ativas = await listarTrilhasAtivas("u1", { db: ctx.db });
    expect(ativas).toHaveLength(2);
  });

  it("reativar trilha já ativa mantém o registro e congela versao atual", async () => {
    await ativarTrilha("u1", "ed-1", { db: ctx.db });
    ctx.editalsStore.set("ed-1", criarEditalFake({ id: "ed-1", versao: 2 }));
    const t = await ativarTrilha("u1", "ed-1", { db: ctx.db });
    expect(t.versao_ativacao).toBe(2);
    expect(await listarTrilhasAtivas("u1", { db: ctx.db })).toHaveLength(1);
  });

  it("desativar trilha a torna inativa", async () => {
    await ativarTrilha("u1", "ed-1", { db: ctx.db });
    await desativarTrilha("u1", "ed-1", { db: ctx.db });
    expect(await listarTrilhasAtivas("u1", { db: ctx.db })).toHaveLength(0);
  });

  it("não ativa edital não publicado", async () => {
    ctx.editalsStore.set("ed-rasc", criarEditalFake({ id: "ed-rasc", status: "rascunho" }));
    await expect(ativarTrilha("u1", "ed-rasc", { db: ctx.db })).rejects.toBeInstanceOf(ErroTrilha);
  });
});

describe("trilhas — snapshot ordenado por peso/ordem (T2 na ativação)", () => {
  let ctx: ReturnType<typeof criarDbFake>;
  beforeEach(() => {
    ctx = criarDbFake();
    ctx.editalsStore.set("ed-1", criarEditalFake({ id: "ed-1", versao: 1 }));
    // Português (peso 3) e Informática (peso 1)
    ctx.disciplinasStore.set("d-port", { id: "d-port", edital_id: "ed-1", nome: "Português", peso: 3 });
    ctx.disciplinasStore.set("d-info", { id: "d-info", edital_id: "ed-1", nome: "Informática", peso: 1 });
    // Materiais: m-port-2 (ordem 2), m-port-1 (ordem 1) em Português; m-info-1 (ordem 1) em Informática
    ctx.materiaisStore.set("m-port-2", criarMaterialFake("m-port-2", "d-port", { ordem: 2 }));
    ctx.materiaisStore.set("m-port-1", criarMaterialFake("m-port-1", "d-port", { ordem: 1 }));
    ctx.materiaisStore.set("m-info-1", criarMaterialFake("m-info-1", "d-info", { ordem: 1 }));
    ctx.vinculosStore.set("m-port-2", { material_id: "m-port-2", edital_id: "ed-1", disciplina_id: "d-port" });
    ctx.vinculosStore.set("m-port-1", { material_id: "m-port-1", edital_id: "ed-1", disciplina_id: "d-port" });
    ctx.vinculosStore.set("m-info-1", { material_id: "m-info-1", edital_id: "ed-1", disciplina_id: "d-info" });
  });

  it("snapshot congela materiais ordenados por peso desc e ordem asc", async () => {
    const t = await ativarTrilha("u1", "ed-1", { db: ctx.db });
    const snap = t.plano_snapshot as unknown as PlanoSnapshot;
    expect(snap.disciplinas.map((d) => d.id)).toEqual(["d-port", "d-info"]);
    expect(snap.materiais.map((m) => m.id)).toEqual(["m-port-1", "m-port-2", "m-info-1"]);
  });
});

describe("trilhas — versionamento (E2E-T2 / T3): v1 imutável + novo aluno v2", () => {
  let ctx: ReturnType<typeof criarDbFake>;
  beforeEach(() => {
    ctx = criarDbFake();
    // Edital v1: Constitucional com peso 2
    ctx.editalsStore.set("ed-1", criarEditalFake({ id: "ed-1", versao: 1 }));
    ctx.disciplinasStore.set("d1", { id: "d1", edital_id: "ed-1", nome: "Constitucional", peso: 2 });
    ctx.materiaisStore.set("m1", criarMaterialFake("m1", "d1", { ordem: 1 }));
    ctx.vinculosStore.set("m1", { material_id: "m1", edital_id: "ed-1", disciplina_id: "d1" });
  });

  it("aluno A congela v1 (peso 2); após republicar em v2 (peso 3), A mantém v1 e novo aluno B vê v2", async () => {
    // Aluno A ativa na v1
    await ativarTrilha("uA", "ed-1", { db: ctx.db });
    const trilhaA = ctx.trilhasStore.get("uA|ed-1")!;
    expect(trilhaA.versao_ativacao).toBe(1);
    const snapA = trilhaA.plano_snapshot as unknown as PlanoSnapshot;
    expect(snapA.disciplinas[0].peso).toBe(2);

    // Admin republica o edital em v2 (peso de Constitucional sobe para 3)
    ctx.editalsStore.set("ed-1", criarEditalFake({ id: "ed-1", versao: 2 }));
    ctx.disciplinasStore.set("d1", { id: "d1", edital_id: "ed-1", nome: "Constitucional", peso: 3 });

    // Plano do aluno A é lido do snapshot congelado → mantém peso 2 (v1)
    const planoA = await obterPlanoTrilha("uA", "ed-1", { db: ctx.db });
    expect(planoA.versaoAtivacao).toBe(1);
    expect(planoA.disciplinas[0].peso).toBe(2);
    expect(planoA.disciplinas[0].nome).toBe("Constitucional");

    // Novo aluno B ativa APÓS a republicação → snapshot da versão corrente (v2, peso 3)
    await ativarTrilha("uB", "ed-1", { db: ctx.db });
    const trilhaB = ctx.trilhasStore.get("uB|ed-1")!;
    expect(trilhaB.versao_ativacao).toBe(2);
    const snapB = trilhaB.plano_snapshot as unknown as PlanoSnapshot;
    expect(snapB.disciplinas[0].peso).toBe(3);

    const planoB = await obterPlanoTrilha("uB", "ed-1", { db: ctx.db });
    expect(planoB.versaoAtivacao).toBe(2);
    expect(planoB.disciplinas[0].peso).toBe(3);
  });

  it("republicar não altera o snapshot existente do aluno A", async () => {
    await ativarTrilha("uA", "ed-1", { db: ctx.db });
    const antes = (ctx.trilhasStore.get("uA|ed-1")!.plano_snapshot as unknown as PlanoSnapshot).disciplinas[0].peso;
    // Republica (peso sobe para 5)
    ctx.editalsStore.set("ed-1", criarEditalFake({ id: "ed-1", versao: 2 }));
    ctx.disciplinasStore.set("d1", { id: "d1", edital_id: "ed-1", nome: "Constitucional", peso: 5 });
    const depois = (ctx.trilhasStore.get("uA|ed-1")!.plano_snapshot as unknown as PlanoSnapshot).disciplinas[0].peso;
    expect(antes).toBe(2);
    expect(depois).toBe(2); // imutável
  });
});

describe("trilhas — plano e progresso (AL1 / T5)", () => {
  let ctx: ReturnType<typeof criarDbFake>;
  beforeEach(() => {
    ctx = criarDbFake();
    ctx.editalsStore.set("ed-1", criarEditalFake({ id: "ed-1", versao: 1 }));
    ctx.disciplinasStore.set("d1", { id: "d1", edital_id: "ed-1", nome: "Português", peso: 3 });
    // Material acessível (amostra) e bloqueado (publicado, sem amostra, curso fora de assinatura)
    ctx.materiaisStore.set("m-ok", criarMaterialFake("m-ok", "d1", { amostra: true, ordem: 1 }));
    ctx.materiaisStore.set("m-block", criarMaterialFake("m-block", "d1", { amostra: false, ordem: 2 }));
    ctx.vinculosStore.set("m-ok", { material_id: "m-ok", edital_id: "ed-1", disciplina_id: "d1" });
    ctx.vinculosStore.set("m-block", { material_id: "m-block", edital_id: "ed-1", disciplina_id: "d1" });
    // Trilha ativa com snapshot v1 congelado (Português peso 3, m-ok + m-block)
    ctx.trilhasStore.set("u1|ed-1", {
      id: "tr-1",
      user_id: "u1",
      edital_id: "ed-1",
      ativo: true,
      versao_ativacao: 1,
      plano_snapshot: {
        disciplinas: [{ id: "d1", nome: "Português", peso: 3 }],
        materiais: [
          { id: "m-ok", ordem: 1, disciplina_id: "d1" },
          { id: "m-block", ordem: 2, disciplina_id: "d1" },
        ],
      } as unknown as user_trilhas["plano_snapshot"],
      criado_em: new Date(),
    } as user_trilhas);
  });

  it("obterPlanoTrilha retorna disciplina ordenada com progresso", async () => {
    ctx.concluidos.add("m-ok");
    const plano = await obterPlanoTrilha("u1", "ed-1", { db: ctx.db });
    expect(plano.editalNome).toBe("TRT-24");
    expect(plano.versaoAtivacao).toBe(1);
    expect(plano.disciplinas).toHaveLength(1);
    expect(plano.disciplinas[0].materiais.map((m) => m.id)).toEqual(["m-ok", "m-block"]);
    // m-ok acessível e concluído; m-block bloqueado (fora do denominador) → 100%
    expect(plano.disciplinas[0].progresso).toBe(100);
    expect(plano.progressoGeral).toBe(100);
  });

  it("material bloqueado não entra no denominador (AL1 / T5)", async () => {
    // nenhum concluído; m-block está bloqueado, então denominador = 1 (m-ok)
    const plano = await obterPlanoTrilha("u1", "ed-1", { db: ctx.db });
    expect(plano.disciplinas[0].progresso).toBe(0);
  });

  it("obterPlanoTrilha exige trilha ativa", async () => {
    ctx.trilhasStore.delete("u1|ed-1");
    await expect(obterPlanoTrilha("u1", "ed-1", { db: ctx.db })).rejects.toBeInstanceOf(ErroTrilha);
  });
});

describe("trilhas — listagem pública", () => {
  let ctx: ReturnType<typeof criarDbFake>;
  beforeEach(() => {
    ctx = criarDbFake();
    ctx.editalsStore.set("ed-1", criarEditalFake({ id: "ed-1", status: "publicado" }));
    ctx.editalsStore.set("ed-2", criarEditalFake({ id: "ed-2", status: "rascunho" }));
  });

  it("listarEditaisPublicados retorna somente publicados", async () => {
    const lista = await listarEditaisPublicados({ db: ctx.db });
    expect(lista.map((e) => e.id)).toEqual(["ed-1"]);
  });
});
