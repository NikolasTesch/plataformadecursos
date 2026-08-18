import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/db", () => ({ db: {} }));

import { emitir, ErroCertificado, obterParaDownload, verificar, type DbCertificados } from "@/services/aluno/certificados";

function bancoFake(concluidos: string[] = []): DbCertificados {
  const certificado = { codigo: "codigo-seguro-123456", gerado_em: new Date("2026-08-18"), user_id: "aluno", course_id: "curso", user: { nome: "Ana" }, course: { nome: "Direito" } };
  return {
    materials: {
      findUnique: vi.fn(async () => ({ id: "m1", module_id: "modulo", status: "publicado" as const, amostra: true })),
      findMany: vi.fn(async () => [{ id: "m1", module_id: "modulo", status: "publicado" as const, amostra: true }, { id: "m2", module_id: "modulo", status: "publicado" as const, amostra: true }]),
    },
    modules: { findUnique: vi.fn(async () => ({ id: "modulo", course_id: "curso" })) },
    courses: { findUnique: vi.fn(async () => ({ id: "curso", nome: "Direito", incluido_assinatura: false })) },
    entitlements: { findMany: vi.fn(async () => []) },
    user_progress: {
      upsert: vi.fn(async () => ({})),
      updateMany: vi.fn(async () => ({ count: 0 })),
      findUnique: vi.fn(async () => null),
      findMany: vi.fn(async () => concluidos.map((material_id) => ({ material_id, concluido: true }))),
    },
    certificates: {
      findUnique: vi.fn(async () => certificado),
      upsert: vi.fn(async () => certificado),
    },
  };
}

describe("certificados do aluno (S3.4)", () => {
  it("recusa curso incompleto", async () => {
    await expect(emitir("aluno", "curso", bancoFake(["m1"]))).rejects.toMatchObject({ code: "curso_incompleto" });
  });

  it("emite para aluno autorizado e não inclui PII no código", async () => {
    const banco = bancoFake(["m1", "m2"]);
    const certificado = await emitir("aluno", "curso", banco);
    expect(certificado.nome).toBe("Ana");
    expect(certificado.codigo).not.toContain("Ana");
    expect(banco.certificates.upsert).toHaveBeenCalledWith(expect.objectContaining({
      include: { user: { select: { nome: true } }, course: { select: { nome: true } } },
    }));
    await verificar(certificado.codigo, banco);
    expect(banco.certificates.findUnique).toHaveBeenCalledWith(expect.objectContaining({
      select: { codigo: true, gerado_em: true, user: { select: { nome: true } }, course: { select: { nome: true } } },
    }));
  });

  it("mantém idempotência no upsert", async () => {
    const banco = bancoFake(["m1", "m2"]);
    expect((await emitir("aluno", "curso", banco)).codigo).toBe((await emitir("aluno", "curso", banco)).codigo);
    expect(banco.certificates.upsert).toHaveBeenCalledTimes(2);
  });

  it("não retorna código inválido", async () => {
    const banco = bancoFake();
    expect(await verificar("invalido", banco)).toBeNull();
    expect(banco.certificates.findUnique).not.toHaveBeenCalled();
  });

  it("exige usuário autenticado no serviço", async () => {
    await expect(emitir("", "curso", bancoFake(["m1", "m2"]))).rejects.toBeInstanceOf(ErroCertificado);
  });

  it("libera download apenas ao titular elegível", async () => {
    const banco = bancoFake(["m1", "m2"]);
    expect(await obterParaDownload("outro-aluno", "codigo-seguro-123456", banco)).toBeNull();
    expect((await obterParaDownload("aluno", "codigo-seguro-123456", banco))?.curso).toBe("Direito");
  });

  it("isola a elegibilidade pelo usuário autenticado", async () => {
    const banco = bancoFake(["m1", "m2"]);
    await emitir("aluno-1", "curso", banco);
    expect(banco.user_progress.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ user_id: "aluno-1" }) }));
    expect(banco.certificates.upsert).toHaveBeenCalledWith(expect.objectContaining({ where: { user_id_course_id: { user_id: "aluno-1", course_id: "curso" } } }));
  });
});
