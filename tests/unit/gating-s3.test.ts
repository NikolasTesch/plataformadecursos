import { describe, expect, it } from "vitest";
import {
  avaliarAcesso,
  invalidarPorCurso,
  limparCacheGating,
  podeAcessarMaterial,
  type ParamsPodeAcessarMaterial,
} from "@/services/gating";

const agora = new Date("2026-08-18T12:00:00Z");
const base: ParamsPodeAcessarMaterial = {
  userId: "u1",
  material: { id: "m1", status: "publicado", amostra: false },
  curso: { id: "c1", incluido_assinatura: true },
  entitlements: [{ id: "e1", origem: "pagamento", acesso_ate: new Date("2026-09-01"), product_id: "p1", product: { tipo: "assinatura", curso_id: null, status: "ativo" } }],
};

describe("gating S3.1", () => {
  it.each([
    ["rascunho", { ...base, material: { ...base.material, status: "rascunho" as const } }, false],
    ["amostra", { ...base, entitlements: [], material: { ...base.material, amostra: true } }, true],
    ["produto inativo", { ...base, entitlements: [{ ...base.entitlements[0], product: { ...base.entitlements[0].product!, status: "inativo" as const } }] }, false],
    ["conta bloqueada", { ...base, usuario: { id: "u1", bloqueado: true } }, false],
  ] as const)("%s", (_nome, input, permitido) => {
    expect(avaliarAcesso(input, agora).permitido).toBe(permitido);
  });

  it("expira assinatura no relógio informado", () => {
    expect(avaliarAcesso({ ...base, entitlements: [{ ...base.entitlements[0], acesso_ate: new Date("2026-08-18T11:59:59Z") }] }, agora).permitido).toBe(false);
  });

  it("considera assinatura ativa exatamente até acesso_ate", () => {
    expect(avaliarAcesso({ ...base, assinatura: { ativa: true, acesso_ate: agora }, entitlements: [] }, agora).permitido).toBe(true);
    expect(avaliarAcesso({ ...base, assinatura: { ativa: true, acesso_ate: null }, entitlements: [] }, agora).permitido).toBe(false);
  });

  it("cacheia e invalida por curso", () => {
    limparCacheGating();
    expect(podeAcessarMaterial(base, { agora })).toEqual({ permitido: true, motivo: "assinatura" });
    expect(podeAcessarMaterial(base, { agora })).toEqual({ permitido: true, motivo: "assinatura" });
    const bloqueado = { ...base, entitlements: [] };
    invalidarPorCurso("c1");
    expect(podeAcessarMaterial(bloqueado, { agora })).toEqual({ permitido: false, motivo: "bloqueado" });
  });

  it("não reutiliza acesso quando a conta está bloqueada", () => {
    limparCacheGating();
    expect(podeAcessarMaterial(base, { agora })).toEqual({ permitido: true, motivo: "assinatura" });
    expect(podeAcessarMaterial({ ...base, usuario: { id: "u1", bloqueado: true } }, { agora })).toEqual({ permitido: false, motivo: "bloqueado" });
  });

  it("expira o cache em no máximo cinco minutos", () => {
    limparCacheGating();
    expect(podeAcessarMaterial(base, { agora })).toEqual({ permitido: true, motivo: "assinatura" });
    const depoisDoTtl = new Date(agora.getTime() + 5 * 60 * 1000);
    const semAcesso = { ...base, entitlements: [] };
    expect(podeAcessarMaterial(semAcesso, { agora: depoisDoTtl })).toEqual({ permitido: false, motivo: "bloqueado" });
  });
});
