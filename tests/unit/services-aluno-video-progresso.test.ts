import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/db", () => ({ db: {} }));

import {
  ErroProgresso,
  obterDadosPlayer,
  salvarPosicaoVideo,
  type DbProgresso,
} from "@/services/aluno/progresso";

function bancoFake(opcoes: { acessivel?: boolean } = {}): DbProgresso {
  const progresso = new Map<string, { concluido: boolean; posicao_segundos: number }>();
  const material = {
    id: "video-1",
    module_id: "modulo-1",
    tipo: "video" as const,
    video_provider_id: "bunny-guid",
    video_status: "pronto" as const,
    status: "publicado" as const,
    amostra: false,
  };
  const chave = (userId: string, materialId: string) => `${userId}:${materialId}`;
  return {
    materials: {
      findUnique: vi.fn(async () => material),
      findMany: vi.fn(async () => [material]),
    },
    modules: { findUnique: vi.fn(async () => ({ id: "modulo-1", course_id: "curso-1" })) },
    courses: { findUnique: vi.fn(async () => ({ id: "curso-1", incluido_assinatura: false })) },
    entitlements: {
      findMany: vi.fn(async () => opcoes.acessivel === false ? [] : [{
        id: "ent-1",
        origem: "pagamento" as const,
        acesso_ate: new Date("2099-01-01"),
        product_id: "produto-1",
        product: { tipo: "venda_unica" as const, curso_id: "curso-1", status: "ativo" as const },
      }]),
    },
    user_progress: {
      upsert: vi.fn(async ({ where, update, create }) => {
        const id = chave(where.user_id_material_id.user_id, where.user_id_material_id.material_id);
        const atual = progresso.get(id) ?? { concluido: false, posicao_segundos: 0 };
        progresso.set(id, {
          concluido: (update.concluido as boolean | undefined) ?? (create.concluido as boolean | undefined) ?? atual.concluido,
          posicao_segundos: (update.posicao_segundos as number | undefined) ?? (create.posicao_segundos as number | undefined) ?? atual.posicao_segundos,
        });
        return progresso.get(id);
      }),
      updateMany: vi.fn(async () => ({ count: 0 })),
      findUnique: vi.fn(async ({ where }) => progresso.get(chave(
        where.user_id_material_id.user_id,
        where.user_id_material_id.material_id,
      )) ?? null),
      findMany: vi.fn(async () => []),
    },
  };
}

describe("progresso headless de vídeo", () => {
  it("saneia posição e limita ao total informado", async () => {
    const banco = bancoFake();
    const resultado = await salvarPosicaoVideo("aluno-1", "video-1", 150.8, 100, banco);

    expect(resultado.posicaoSegundos).toBe(100);
    expect(banco.user_progress.upsert).toHaveBeenCalled();
    expect(resultado.concluido).toBe(true);
  });

  it("conclui quando restam exatamente 10 segundos", async () => {
    const banco = bancoFake();
    const resultado = await salvarPosicaoVideo("aluno-1", "video-1", 90, 100, banco);

    expect(resultado.concluido).toBe(true);
  });

  it("rejeita posição não finita ou negativa antes de persistir", async () => {
    const banco = bancoFake();

    await expect(salvarPosicaoVideo("aluno-1", "video-1", Number.NaN, 100, banco))
      .rejects.toMatchObject({ code: "posicao_invalida" } satisfies Partial<ErroProgresso>);
    await expect(salvarPosicaoVideo("aluno-1", "video-1", -1, 100, banco))
      .rejects.toMatchObject({ code: "posicao_invalida" } satisfies Partial<ErroProgresso>);
    expect(banco.user_progress.upsert).not.toHaveBeenCalled();
  });

  it("reavalia gating antes de alterar a posição", async () => {
    const banco = bancoFake({ acessivel: false });

    await expect(salvarPosicaoVideo("aluno-1", "video-1", 12, 100, banco))
      .rejects.toMatchObject({ code: "acesso_negado" } satisfies Partial<ErroProgresso>);
    expect(banco.user_progress.upsert).not.toHaveBeenCalled();
  });

  it("retorna retomada somente a partir de 5s e antes de 95%", async () => {
    const banco = bancoFake();
    await salvarPosicaoVideo("aluno-1", "video-1", 12, 100, banco);
    expect((await obterDadosPlayer("aluno-1", "video-1", banco, 100)).posicaoRetomadaSegundos).toBe(12);

    await salvarPosicaoVideo("aluno-1", "video-1", 95, 100, banco);
    expect((await obterDadosPlayer("aluno-1", "video-1", banco, 100)).posicaoRetomadaSegundos).toBe(0);
  });
});
