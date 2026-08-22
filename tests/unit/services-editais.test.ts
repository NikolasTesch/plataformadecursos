// Testes unitários do serviço de editais — administração manual (US-25 / S7.1).
//
// O `db` é injetado via `deps` (fake tipado com `DbEditais`); @/lib/db é mockado
// para impedir a construção do PrismaClient real (padrão D29). Cobre: validações
// de input, publicar/despublicar idempotentes, versionamento implícito (D-T1:
// alteração de plano em edital publicado incrementa `versao`) e vínculo de
// material a 0..1 disciplina (T1).
import { beforeEach, describe, expect, it, vi } from "vitest";
import type {
  editals,
  edital_disciplines,
  material_edital,
  materials,
  EditalStatus,
} from "@/generated/prisma/client";

const mocksDb = vi.hoisted(() => ({
  editalsFindUnique: vi.fn(),
  editalsFindMany: vi.fn(),
  editalsCreate: vi.fn(),
  editalsUpdate: vi.fn(),
  disciplinasFindUnique: vi.fn(),
  disciplinasFindMany: vi.fn(),
  disciplinasCreate: vi.fn(),
  disciplinasUpdate: vi.fn(),
  disciplinasDelete: vi.fn(),
  disciplinasCount: vi.fn(),
  vinculosFindUnique: vi.fn(),
  vinculosFindMany: vi.fn(),
  vinculosCreate: vi.fn(),
  vinculosDelete: vi.fn(),
  materiaisFindUnique: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  db: {
    editals: {
      findUnique: mocksDb.editalsFindUnique,
      findMany: mocksDb.editalsFindMany,
      create: mocksDb.editalsCreate,
      update: mocksDb.editalsUpdate,
    },
    edital_disciplines: {
      findUnique: mocksDb.disciplinasFindUnique,
      findMany: mocksDb.disciplinasFindMany,
      create: mocksDb.disciplinasCreate,
      update: mocksDb.disciplinasUpdate,
      delete: mocksDb.disciplinasDelete,
      count: mocksDb.disciplinasCount,
    },
    material_edital: {
      findUnique: mocksDb.vinculosFindUnique,
      findMany: mocksDb.vinculosFindMany,
      create: mocksDb.vinculosCreate,
      delete: mocksDb.vinculosDelete,
    },
    materials: { findUnique: mocksDb.materiaisFindUnique },
  },
}));

import {
  adicionarDisciplina,
  atualizarDisciplina,
  atualizarEdital,
  criarEdital,
  despublicarEdital,
  desvincularMaterial,
  listarEditaisPublicados,
  publicarEdital,
  removerDisciplina,
  vincularMaterial,
  type DbEditais,
} from "@/services/editais";
import { ErroEdital } from "@/services/editais/erros";

function criarDbFake() {
  const editalsStore = new Map<string, editals>();
  const disciplinasStore = new Map<string, edital_disciplines>();
  const vinculosStore = new Map<string, material_edital>();
  const materiaisStore = new Map<string, materials>();
  let seq = 0;
  const novoId = (p: string) => `${p}-${++seq}`;
  const chaveVinculo = (m: string, e: string) => `${m}|${e}`;

  const db = {
    editals: {
      findUnique: async ({ where }: { where: { id: string } }) => editalsStore.get(where.id) ?? null,
      findMany: async ({
        where,
        orderBy,
      }: {
        where?: { status?: EditalStatus };
        orderBy?: { publicada_em?: "desc" | "asc" };
      }) => {
        let lista = [...editalsStore.values()];
        if (where?.status) lista = lista.filter((e) => e.status === where.status);
        if (orderBy?.publicada_em === "desc") {
          lista.sort((a, b) => (b.publicada_em?.getTime() ?? 0) - (a.publicada_em?.getTime() ?? 0));
        }
        return lista;
      },
      create: async ({ data }: { data: Record<string, unknown> }) => {
        const e = { id: novoId("ed"), ...data } as unknown as editals;
        editalsStore.set(e.id, e);
        return e;
      },
      update: async ({ where, data }: { where: { id: string }; data: Record<string, unknown> }) => {
        const e = editalsStore.get(where.id);
        if (!e) throw new Error("edital não encontrado");
        const proximo = { ...e };
        for (const [k, v] of Object.entries(data)) {
          if (v !== null && typeof v === "object" && "increment" in (v as Record<string, unknown>)) {
            proximo[k as keyof editals] = ((e[k as keyof editals] as unknown as number) +
              (v as { increment: number }).increment) as never;
          } else {
            (proximo as Record<string, unknown>)[k] = v;
          }
        }
        editalsStore.set(where.id, proximo as editals);
        return proximo as editals;
      },
    },
    edital_disciplines: {
      findUnique: async ({ where }: { where: { id: string } }) => disciplinasStore.get(where.id) ?? null,
      findMany: async ({
        where,
        orderBy,
      }: {
        where: { edital_id: string };
        orderBy?: { peso: "desc" };
      }) => {
        const l = [...disciplinasStore.values()].filter((d) => d.edital_id === where.edital_id);
        if (orderBy?.peso === "desc") l.sort((a, b) => b.peso - a.peso);
        return l;
      },
      create: async ({ data }: { data: Record<string, unknown> }) => {
        const d = { id: novoId("disc"), ...data } as unknown as edital_disciplines;
        disciplinasStore.set(d.id, d);
        return d;
      },
      update: async ({ where, data }: { where: { id: string }; data: Record<string, unknown> }) => {
        const d = disciplinasStore.get(where.id);
        if (!d) throw new Error("disciplina não encontrada");
        const a = { ...d, ...data } as unknown as edital_disciplines;
        disciplinasStore.set(where.id, a);
        return a;
      },
      delete: async ({ where }: { where: { id: string } }) => {
        const d = disciplinasStore.get(where.id);
        if (!d) throw new Error("disciplina não encontrada");
        disciplinasStore.delete(where.id);
        return d;
      },
      count: async ({ where }: { where: { edital_id: string; nome: string } }) =>
        [...disciplinasStore.values()].filter((d) => d.edital_id === where.edital_id && d.nome === where.nome).length,
    },
    material_edital: {
      findUnique: async ({
        where,
      }: {
        where: { material_id_edital_id: { material_id: string; edital_id: string } };
      }) => vinculosStore.get(chaveVinculo(where.material_id_edital_id.material_id, where.material_id_edital_id.edital_id)) ?? null,
      findMany: async ({ where }: { where: { edital_id: string } }) =>
        [...vinculosStore.values()].filter((v) => v.edital_id === where.edital_id),
      create: async ({ data }: { data: Record<string, unknown> }) => {
        const v = data as unknown as material_edital;
        vinculosStore.set(chaveVinculo(v.material_id, v.edital_id), v);
        return v;
      },
      delete: async ({
        where,
      }: {
        where: { material_id_edital_id: { material_id: string; edital_id: string } };
      }) => {
        const k = chaveVinculo(where.material_id_edital_id.material_id, where.material_id_edital_id.edital_id);
        const v = vinculosStore.get(k);
        if (!v) throw new Error("vínculo não encontrado");
        vinculosStore.delete(k);
        return v;
      },
    },
    materials: {
      findUnique: async ({ where }: { where: { id: string } }) => materiaisStore.get(where.id) ?? null,
    },
  } as unknown as DbEditais;

  return { db, editalsStore, disciplinasStore, vinculosStore, materiaisStore };
}

function criarEditalFake(overrides: Partial<editals> = {}): editals {
  return {
    id: "ed-1",
    nome: "TRT-24 Técnico",
    banca: "FCC",
    data_prova: null,
    status: "rascunho",
    versao: 1,
    publicada_em: null,
    ...overrides,
  } as editals;
}

describe("editais — validação de criação", () => {
  let ctx: ReturnType<typeof criarDbFake>;
  beforeEach(() => {
    ctx = criarDbFake();
  });

  it("cria edital com versao=1 e status rascunho por padrão", async () => {
    const edital = await criarEdital({ nome: "TRT-24", banca: "FCC" }, { db: ctx.db });
    expect(edital.versao).toBe(1);
    expect(edital.status).toBe("rascunho");
    expect(edital.publicada_em).toBeNull();
  });

  it("rejeita nome vazio", async () => {
    await expect(criarEdital({ nome: "  ", banca: "FCC" }, { db: ctx.db })).rejects.toMatchObject({
      code: "validacao",
      campo: "nome",
    });
  });

  it("rejeita banca vazia", async () => {
    await expect(criarEdital({ nome: "TRT", banca: "" }, { db: ctx.db })).rejects.toMatchObject({
      code: "validacao",
      campo: "banca",
    });
  });

  it("rejeita nome acima de 200 caracteres", async () => {
    await expect(criarEdital({ nome: "x".repeat(201), banca: "FCC" }, { db: ctx.db })).rejects.toMatchObject({
      code: "validacao",
      campo: "nome",
    });
  });
});

describe("editais — publicação", () => {
  let ctx: ReturnType<typeof criarDbFake>;
  beforeEach(() => {
    ctx = criarDbFake();
    ctx.editalsStore.set("ed-1", criarEditalFake({ id: "ed-1" }));
  });

  it("publica rascunho definindo publicada_em", async () => {
    const pub = await publicarEdital("ed-1", { db: ctx.db });
    expect(pub.status).toBe("publicado");
    expect(pub.publicada_em).not.toBeNull();
  });

  it("publicar edital já publicado é no-op idempotente", async () => {
    ctx.editalsStore.set("ed-1", criarEditalFake({ id: "ed-1", status: "publicado", publicada_em: new Date("2026-01-01") }));
    const pub = await publicarEdital("ed-1", { db: ctx.db });
    expect(pub.publicada_em).toEqual(new Date("2026-01-01"));
  });

  it("despublica voltando a rascunho e mantendo publicada_em", async () => {
    ctx.editalsStore.set("ed-1", criarEditalFake({ id: "ed-1", status: "publicado", publicada_em: new Date("2026-01-01") }));
    const rasc = await despublicarEdital("ed-1", { db: ctx.db });
    expect(rasc.status).toBe("rascunho");
    expect(rasc.publicada_em).toEqual(new Date("2026-01-01"));
  });

  it("despublicar rascunho é no-op", async () => {
    const rasc = await despublicarEdital("ed-1", { db: ctx.db });
    expect(rasc.status).toBe("rascunho");
  });

  it("atualizar edital inexistente lança nao_encontrado", async () => {
    await expect(atualizarEdital("inex", { nome: "X" }, { db: ctx.db })).rejects.toBeInstanceOf(ErroEdital);
  });
});

describe("editais — versionamento implícito (D-T1)", () => {
  let ctx: ReturnType<typeof criarDbFake>;
  beforeEach(() => {
    ctx = criarDbFake();
    ctx.editalsStore.set("ed-1", criarEditalFake({ id: "ed-1", status: "publicado", publicada_em: new Date() }));
  });

  it("adicionar disciplina em edital publicado incrementa versao", async () => {
    const d = await adicionarDisciplina("ed-1", { nome: "Português", peso: 3 }, { db: ctx.db });
    expect(d.peso).toBe(3);
    expect(ctx.editalsStore.get("ed-1")!.versao).toBe(2);
  });

  it("atualizar peso de disciplina em edital publicado incrementa versao", async () => {
    const d = await adicionarDisciplina("ed-1", { nome: "Português", peso: 2 }, { db: ctx.db });
    await atualizarDisciplina(d.id, { peso: 3 }, { db: ctx.db });
    expect(ctx.editalsStore.get("ed-1")!.versao).toBe(3);
  });

  it("remover disciplina em edital publicado incrementa versao", async () => {
    const d = await adicionarDisciplina("ed-1", { nome: "Português", peso: 2 }, { db: ctx.db }); // v1 -> v2
    await removerDisciplina(d.id, { db: ctx.db }); // v2 -> v3
    expect(ctx.editalsStore.get("ed-1")!.versao).toBe(3);
  });

  it("adicionar disciplina em rascunho NÃO incrementa versao", async () => {
    ctx.editalsStore.set("ed-2", criarEditalFake({ id: "ed-2", status: "rascunho" }));
    await adicionarDisciplina("ed-2", { nome: "Português", peso: 2 }, { db: ctx.db });
    expect(ctx.editalsStore.get("ed-2")!.versao).toBe(1);
  });
});

describe("editais — disciplinas e vínculo de material (T1)", () => {
  let ctx: ReturnType<typeof criarDbFake>;
  beforeEach(() => {
    ctx = criarDbFake();
    ctx.editalsStore.set("ed-1", criarEditalFake({ id: "ed-1" }));
  });

  it("rejeita peso < 1", async () => {
    await expect(adicionarDisciplina("ed-1", { nome: "Português", peso: 0 }, { db: ctx.db })).rejects.toMatchObject({
      code: "validacao",
      campo: "peso",
    });
  });

  it("rejeita nome de disciplina duplicado no edital", async () => {
    await adicionarDisciplina("ed-1", { nome: "Português", peso: 2 }, { db: ctx.db });
    await expect(adicionarDisciplina("ed-1", { nome: "Português", peso: 3 }, { db: ctx.db })).rejects.toMatchObject({
      code: "regra_negocio",
      campo: "nome",
    });
  });

  it("vincula material a disciplina do edital", async () => {
    const d = await adicionarDisciplina("ed-1", { nome: "Português", peso: 2 }, { db: ctx.db });
    ctx.materiaisStore.set("mat-1", { id: "mat-1" } as materials);
    const v = await vincularMaterial("ed-1", "mat-1", d.id, { db: ctx.db });
    expect(v.material_id).toBe("mat-1");
    expect(v.disciplina_id).toBe(d.id);
  });

  it("vincula material sem disciplina (0..1 — T1)", async () => {
    ctx.materiaisStore.set("mat-1", { id: "mat-1" } as materials);
    const v = await vincularMaterial("ed-1", "mat-1", null, { db: ctx.db });
    expect(v.disciplina_id).toBeNull();
  });

  it("rejeita vincular material inexistente", async () => {
    await expect(vincularMaterial("ed-1", "mat-x", null, { db: ctx.db })).rejects.toMatchObject({
      code: "nao_encontrado",
      campo: "material_id",
    });
  });

  it("rejeita vincular a disciplina de outro edital", async () => {
    const d = await adicionarDisciplina("ed-1", { nome: "Português", peso: 2 }, { db: ctx.db });
    ctx.materiaisStore.set("mat-1", { id: "mat-1" } as materials);
    await expect(vincularMaterial("ed-1", "mat-1", "disc-outro", { db: ctx.db })).rejects.toMatchObject({
      code: "regra_negocio",
      campo: "disciplina_id",
    });
  });

  it("desvincular remove o vínculo", async () => {
    const d = await adicionarDisciplina("ed-1", { nome: "Português", peso: 2 }, { db: ctx.db });
    ctx.materiaisStore.set("mat-1", { id: "mat-1" } as materials);
    await vincularMaterial("ed-1", "mat-1", d.id, { db: ctx.db });
    await desvincularMaterial("ed-1", "mat-1", { db: ctx.db });
    expect(ctx.vinculosStore.size).toBe(0);
  });
});

describe("editais — listagem pública", () => {
  let ctx: ReturnType<typeof criarDbFake>;
  beforeEach(() => {
    ctx = criarDbFake();
    ctx.editalsStore.set("ed-1", criarEditalFake({ id: "ed-1", status: "publicado", publicada_em: new Date("2026-02-01") }));
    ctx.editalsStore.set("of-1", criarEditalFake({ id: "of-1", status: "rascunho" }));
  });

  it("listarEditaisPublicados retorna somente publicados", async () => {
    const lista = await listarEditaisPublicados({ db: ctx.db });
    expect(lista).toHaveLength(1);
    expect(lista[0].id).toBe("ed-1");
  });
});
