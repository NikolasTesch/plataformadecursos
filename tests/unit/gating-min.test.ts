// Testes unitários do gating MÍNIMO de leitura — subset R1-R4 (todo 7 do plano
// s2-conteudo).
//
// TDD: testes escritos ANTES da implementação (fase RED). A função
// `podeAcessarMaterial` é PURA — recebe entitlements como DADO, sem acesso a
// banco → nenhum vi.mock necessário.
//
// Cobertura do subset (SPEC-aluno.md:38-45; SPEC.md:387-392):
//   R4  amostra → liberado (sem entitlement)
//   R2  curso incluido_assinatura + assinatura ativa (acesso_ate >= now) → liberado
//   R3  venda_unica do curso (permanente, sem expiração) → liberado
//   R12 caso contrário → bloqueado
// Guarda adicional (documentada): o gating assume materiais PUBLICADOS apenas
// (R5 — rascunho nunca é entregue a alunos); material.status !== 'publicado' →
// bloqueado, avaliado ANTES das demais regras.
//
// NOTA: o subset não usa `userId` para nada (checagens por usuário R5+ chegam
// no S3 com o motor completo R1-R12); o campo existe no contrato por
// estabilidade de API.
import { describe, expect, it } from "vitest";
import {
  podeAcessarMaterial,
  type CursoGating,
  type EntitlementGating,
  type MaterialGating,
} from "@/services/gating";

// Relógio fixo injetado via deps.agora → testes determinísticos (mesmo padrão
// de clock injetável do rate-limit no S1).
const AGORA = new Date("2026-08-15T12:00:00.000Z");
const FUTURO = new Date("2026-09-01T00:00:00.000Z");
const PASSADO = new Date("2026-08-01T00:00:00.000Z");

function material(overrides: Partial<MaterialGating> = {}): MaterialGating {
  return { id: "mat-1", status: "publicado", amostra: false, ...overrides };
}

function curso(overrides: Partial<CursoGating> = {}): CursoGating {
  return { id: "curso-1", incluido_assinatura: false, ...overrides };
}

function entitlement(overrides: Partial<EntitlementGating> = {}): EntitlementGating {
  return {
    id: "ent-1",
    origem: "pagamento",
    acesso_ate: null,
    product_id: "prod-1",
    product: undefined,
    ...overrides,
  };
}

describe("podeAcessarMaterial — subset R1-R4", () => {
  describe("guarda de publicação (rascunho nunca é entregue — R5, assumido)", () => {
    it("material rascunho com amostra=true → bloqueado (guarda ANTES de R4)", () => {
      const resultado = podeAcessarMaterial(
        {
          userId: "user-1",
          material: material({ amostra: true, status: "rascunho" }),
          curso: curso(),
          entitlements: [],
        },
        { agora: AGORA },
      );
      expect(resultado).toEqual({ permitido: false, motivo: "bloqueado" });
    });

    it("material rascunho com assinatura ativa válida → bloqueado", () => {
      const resultado = podeAcessarMaterial(
        {
          userId: "user-1",
          material: material({ status: "rascunho" }),
          curso: curso({ incluido_assinatura: true }),
          entitlements: [
            entitlement({
              origem: "pagamento",
              acesso_ate: FUTURO,
              product: { tipo: "assinatura", curso_id: null },
            }),
          ],
        },
        { agora: AGORA },
      );
      expect(resultado).toEqual({ permitido: false, motivo: "bloqueado" });
    });
  });

  describe("R4 — amostra libera sem entitlement", () => {
    it("amostra publicada + sem entitlements → permitido (motivo amostra)", () => {
      const resultado = podeAcessarMaterial(
        {
          userId: "user-1",
          material: material({ amostra: true }),
          curso: curso(),
          entitlements: [],
        },
        { agora: AGORA },
      );
      expect(resultado).toEqual({ permitido: true, motivo: "amostra" });
    });

    it("amostra publicada ignora entitlements inválidos → ainda amostra", () => {
      const resultado = podeAcessarMaterial(
        {
          userId: "user-1",
          material: material({ amostra: true }),
          curso: curso(),
          entitlements: [
            entitlement({
              origem: "pagamento",
              acesso_ate: PASSADO,
              product: { tipo: "assinatura", curso_id: null },
            }),
          ],
        },
        { agora: AGORA },
      );
      expect(resultado).toEqual({ permitido: true, motivo: "amostra" });
    });
  });

  describe("R2 — assinatura ativa em curso incluído", () => {
    it("curso incluido_assinatura + assinatura com acesso_ate futuro → permitido (motivo assinatura)", () => {
      const resultado = podeAcessarMaterial(
        {
          userId: "user-1",
          material: material(),
          curso: curso({ incluido_assinatura: true }),
          entitlements: [
            entitlement({
              origem: "pagamento",
              acesso_ate: FUTURO,
              product: { tipo: "assinatura", curso_id: null },
            }),
          ],
        },
        { agora: AGORA },
      );
      expect(resultado).toEqual({ permitido: true, motivo: "assinatura" });
    });

    it("origem trial conta como assinatura ativa (entitlement trial com acesso_ate futuro)", () => {
      const resultado = podeAcessarMaterial(
        {
          userId: "user-1",
          material: material(),
          curso: curso({ incluido_assinatura: true }),
          entitlements: [
            entitlement({
              origem: "trial",
              acesso_ate: FUTURO,
              product: { tipo: "assinatura", curso_id: null },
            }),
          ],
        },
        { agora: AGORA },
      );
      expect(resultado).toEqual({ permitido: true, motivo: "assinatura" });
    });

    it("origem admin concede assinatura (grant administrativo, mesmo shape)", () => {
      const resultado = podeAcessarMaterial(
        {
          userId: "user-1",
          material: material(),
          curso: curso({ incluido_assinatura: true }),
          entitlements: [
            entitlement({
              origem: "admin",
              acesso_ate: FUTURO,
              product: { tipo: "assinatura", curso_id: null },
            }),
          ],
        },
        { agora: AGORA },
      );
      expect(resultado).toEqual({ permitido: true, motivo: "assinatura" });
    });

    it("assinatura expirada (acesso_ate passado) → bloqueado", () => {
      const resultado = podeAcessarMaterial(
        {
          userId: "user-1",
          material: material(),
          curso: curso({ incluido_assinatura: true }),
          entitlements: [
            entitlement({
              origem: "pagamento",
              acesso_ate: PASSADO,
              product: { tipo: "assinatura", curso_id: null },
            }),
          ],
        },
        { agora: AGORA },
      );
      expect(resultado).toEqual({ permitido: false, motivo: "bloqueado" });
    });

    it("assinatura com acesso_ate null → bloqueado (assinatura sempre tem prazo; null não é permanente — só R3)", () => {
      const resultado = podeAcessarMaterial(
        {
          userId: "user-1",
          material: material(),
          curso: curso({ incluido_assinatura: true }),
          entitlements: [
            entitlement({
              origem: "pagamento",
              acesso_ate: null,
              product: { tipo: "assinatura", curso_id: null },
            }),
          ],
        },
        { agora: AGORA },
      );
      expect(resultado).toEqual({ permitido: false, motivo: "bloqueado" });
    });

    it("assinatura ativa mas curso NÃO incluido_assinatura → bloqueado", () => {
      const resultado = podeAcessarMaterial(
        {
          userId: "user-1",
          material: material(),
          curso: curso({ incluido_assinatura: false }),
          entitlements: [
            entitlement({
              origem: "pagamento",
              acesso_ate: FUTURO,
              product: { tipo: "assinatura", curso_id: null },
            }),
          ],
        },
        { agora: AGORA },
      );
      expect(resultado).toEqual({ permitido: false, motivo: "bloqueado" });
    });
  });

  describe("R3 — venda_unica do curso é permanente", () => {
    it("entitlement venda_unica do produto do curso → permitido (motivo venda_unica)", () => {
      const resultado = podeAcessarMaterial(
        {
          userId: "user-1",
          material: material(),
          curso: curso(),
          entitlements: [
            entitlement({
              origem: "pagamento",
              acesso_ate: null,
              product: { tipo: "venda_unica", curso_id: "curso-1" },
            }),
          ],
        },
        { agora: AGORA },
      );
      expect(resultado).toEqual({ permitido: true, motivo: "venda_unica" });
    });

    it("venda_unica com acesso_ate no PASSADO → ainda permitido (permanente, R3)", () => {
      const resultado = podeAcessarMaterial(
        {
          userId: "user-1",
          material: material(),
          curso: curso(),
          entitlements: [
            entitlement({
              origem: "pagamento",
              acesso_ate: PASSADO,
              product: { tipo: "venda_unica", curso_id: "curso-1" },
            }),
          ],
        },
        { agora: AGORA },
      );
      expect(resultado).toEqual({ permitido: true, motivo: "venda_unica" });
    });

    it("venda_unica de OUTRO curso → bloqueado", () => {
      const resultado = podeAcessarMaterial(
        {
          userId: "user-1",
          material: material(),
          curso: curso(),
          entitlements: [
            entitlement({
              origem: "pagamento",
              acesso_ate: null,
              product: { tipo: "venda_unica", curso_id: "curso-outro" },
            }),
          ],
        },
        { agora: AGORA },
      );
      expect(resultado).toEqual({ permitido: false, motivo: "bloqueado" });
    });

    it("venda_unica com product.curso_id null (produto sem curso) → não concede acesso", () => {
      const resultado = podeAcessarMaterial(
        {
          userId: "user-1",
          material: material(),
          curso: curso(),
          entitlements: [
            entitlement({
              origem: "pagamento",
              acesso_ate: null,
              product: { tipo: "venda_unica", curso_id: null },
            }),
          ],
        },
        { agora: AGORA },
      );
      expect(resultado).toEqual({ permitido: false, motivo: "bloqueado" });
    });
  });

  describe("sem entitlement / shape mínimo", () => {
    it("sem entitlements → bloqueado (R12)", () => {
      const resultado = podeAcessarMaterial(
        {
          userId: "user-1",
          material: material(),
          curso: curso(),
          entitlements: [],
        },
        { agora: AGORA },
      );
      expect(resultado).toEqual({ permitido: false, motivo: "bloqueado" });
    });

    it("entitlement sem product (shape mínimo não preenchido) → ignorado → bloqueado", () => {
      const resultado = podeAcessarMaterial(
        {
          userId: "user-1",
          material: material(),
          curso: curso(),
          entitlements: [entitlement()],
        },
        { agora: AGORA },
      );
      expect(resultado).toEqual({ permitido: false, motivo: "bloqueado" });
    });
  });

  describe("userId irrelevante no subset (R5+ no S3)", () => {
    it("mesmo estado com userIds diferentes produz o mesmo resultado", () => {
      const params = {
        material: material(),
        curso: curso({ incluido_assinatura: true }),
        entitlements: [
          entitlement({
            origem: "pagamento",
            acesso_ate: FUTURO,
            product: { tipo: "assinatura", curso_id: null },
          }),
        ],
      };
      const deps = { agora: AGORA };
      const resultadoA = podeAcessarMaterial({ ...params, userId: "user-a" }, deps);
      const resultadoB = podeAcessarMaterial({ ...params, userId: "user-b" }, deps);
      expect(resultadoA).toEqual(resultadoB);
      expect(resultadoA).toEqual({ permitido: true, motivo: "assinatura" });
    });
  });
});
