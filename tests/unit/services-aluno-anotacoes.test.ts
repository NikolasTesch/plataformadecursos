import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/db", () => ({ db: {} }));

import {
  atualizar, buscarPorTexto, criar, excluir, listarPorMaterial,
  type DbAnotacoes, ErroAnotacao, LIMITE_CONTEUDO_NOTA,
} from "@/services/aluno/anotacoes";

function bancoFake(opcoes: { acessivel?: boolean } = {}): DbAnotacoes {
  const notas = new Map<string, { id: string; user_id: string; material_id: string; conteudo: string; criado_em: Date; atualizado_em: Date }>();
  return {
    materials: {
      findUnique: vi.fn(async () => ({ id: "material-1", module_id: "modulo-1", status: "publicado" as const, amostra: opcoes.acessivel ?? true })),
    },
    modules: {
      findUnique: vi.fn(async () => ({ id: "modulo-1", course_id: "curso-1" })),
    },
    courses: {
      findUnique: vi.fn(async () => ({ id: "curso-1", incluido_assinatura: false })),
    },
    entitlements: {
      findMany: vi.fn(async () => []),
    },
    notes: {
      create: vi.fn(async ({ data }) => {
        const nota = { id: "nota-1", ...data, criado_em: new Date(), atualizado_em: new Date() };
        notas.set(nota.id, nota);
        return nota;
      }),
      updateMany: vi.fn(async ({ where, data }) => {
        const nota = notas.get(where.id);
        if (!nota || nota.user_id !== where.user_id) return { count: 0 };
        nota.conteudo = data.conteudo;
        return { count: 1 };
      }),
      deleteMany: vi.fn(async ({ where }) => {
        const nota = notas.get(where.id);
        if (!nota || nota.user_id !== where.user_id) return { count: 0 };
        notas.delete(where.id);
        return { count: 1 };
      }),
      findMany: vi.fn(async ({ where }) => [...notas.values()].filter((nota) => {
        if (where.user_id !== nota.user_id) return false;
        if (where.id && where.id !== nota.id) return false;
        if (where.material_id && where.material_id !== nota.material_id) return false;
        const termo = where.conteudo?.contains as string | undefined;
        return !termo || nota.conteudo.toLowerCase().includes(termo.toLowerCase());
      })),
    },
  };
}

describe("anotações do aluno", () => {
  it("faz CRUD e lista somente por material", async () => {
    const banco = bancoFake();
    const nota = await criar("aluno-1", "material-1", "revisar R1", banco);
    expect((await listarPorMaterial("aluno-1", "material-1", banco))).toHaveLength(1);
    await atualizar("aluno-1", nota.id, "revisar R2", banco);
    expect((await buscarPorTexto("aluno-1", "r2", banco))[0]?.conteudo).toBe("revisar R2");
    await excluir("aluno-1", nota.id, banco);
    expect(await listarPorMaterial("aluno-1", "material-1", banco)).toHaveLength(0);
  });

  it("rejeita conteúdo acima de 10.000 caracteres", async () => {
    await expect(criar("aluno-1", "material-1", "x".repeat(LIMITE_CONTEUDO_NOTA + 1), bancoFake()))
      .rejects.toMatchObject({ code: "limite_excedido" } satisfies Partial<ErroAnotacao>);
  });

  it("isola operações por userId", async () => {
    const banco = bancoFake();
    const nota = await criar("aluno-1", "material-1", "privada", banco);
    expect(await listarPorMaterial("aluno-2", "material-1", banco)).toEqual([]);
    await expect(atualizar("aluno-2", nota.id, "vazada", banco)).rejects.toBeInstanceOf(ErroAnotacao);
    await excluir("aluno-2", nota.id, banco);
    expect((await buscarPorTexto("aluno-1", "privada", banco))).toHaveLength(1);
  });

  it("recusa criar anotação em material inacessível", async () => {
    await expect(criar("aluno-1", "material-1", "não pode", bancoFake({ acessivel: false })))
      .rejects.toMatchObject({ code: "acesso_negado" } satisfies Partial<ErroAnotacao>);
  });

  it("recusa atualizar anotação quando o acesso ao material foi revogado", async () => {
    const banco = bancoFake();
    const nota = await criar("aluno-1", "material-1", "antes", banco);
    (banco.materials.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: "material-1", module_id: "modulo-1", status: "publicado", amostra: false,
    });
    await expect(atualizar("aluno-1", nota.id, "depois", banco))
      .rejects.toMatchObject({ code: "acesso_negado" } satisfies Partial<ErroAnotacao>);
  });

  it("recusa atualizar anotação de usuário indevido antes de consultar o material", async () => {
    const banco = bancoFake();
    const nota = await criar("aluno-1", "material-1", "privada", banco);
    (banco.materials.findUnique as ReturnType<typeof vi.fn>).mockClear();
    await expect(atualizar("aluno-2", nota.id, "vazada", banco))
      .rejects.toMatchObject({ code: "conteudo_invalido" } satisfies Partial<ErroAnotacao>);
    expect((banco.materials.findUnique as ReturnType<typeof vi.fn>)).not.toHaveBeenCalledWith({ where: { id: "material-1" } });
  });
});
