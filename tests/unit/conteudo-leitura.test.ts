// Testes unitários da leitura de material — todo 9 do plano s2-conteudo.
//
// Estratégia (D-L1): a decisão de acesso é 100% dado + injeção (gating recebe
// entitlements como DADO; a URL assinada é injetada via deps.criarUrlAssinada)
// — nenhum mock de banco ou de rota. Os testes provam o contrato C5 (URL
// assinada SOMENTE quando permitido — e só para tipo pdf com arquivo_key) e o
// R12 (bloqueado nunca chega ao conteúdo).
import { describe, expect, it, vi } from "vitest";

import {
  montarEntitlementsGating,
  resolverAcessoMaterial,
  resolverGatingMaterial,
  resolverLeituraMaterial,
  type ContextoLeituraMaterial,
  type MaterialLeitura,
  type ResultadoLeituraMaterial,
} from "@/services/conteudo/leitura";
import type { CursoGating, EntitlementGating } from "@/services/gating";

const AGORA = new Date("2026-08-15T12:00:00.000Z");
const FUTURO = new Date("2026-09-01T00:00:00.000Z");

function material(overrides: Partial<MaterialLeitura> = {}): MaterialLeitura {
  return {
    id: "mat-1",
    titulo: "Material de Teste",
    tipo: "texto",
    status: "publicado",
    amostra: false,
    conteudo_html: "<p>Conteúdo</p>",
    arquivo_key: null,
    ...overrides,
  };
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

function contexto(
  overrides: Partial<ContextoLeituraMaterial> = {},
): ContextoLeituraMaterial {
  return {
    userId: "user-1",
    sessaoValida: true,
    material: material(),
    curso: curso(),
    entitlements: [],
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// resolverAcessoMaterial — decisão pura (D-L2)
// ---------------------------------------------------------------------------

describe("resolverAcessoMaterial (decisão pura)", () => {
  it("sessão inválida → nao_encontrado MESMO com gating aprovado (defesa em profundidade)", () => {
    const resultado = resolverAcessoMaterial({
      sessaoValida: false,
      material: material(),
      resultadoGating: { permitido: true, motivo: "amostra" },
    });
    expect(resultado).toBe("nao_encontrado");
  });

  it("material ausente → nao_encontrado", () => {
    const resultado = resolverAcessoMaterial({
      sessaoValida: true,
      material: null,
      resultadoGating: null,
    });
    expect(resultado).toBe("nao_encontrado");
  });

  it("sem resultado de gating (curso ausente) → nao_encontrado", () => {
    const resultado = resolverAcessoMaterial({
      sessaoValida: true,
      material: material(),
      resultadoGating: null,
    });
    expect(resultado).toBe("nao_encontrado");
  });

  it("gating permitido → conteudo", () => {
    const resultado = resolverAcessoMaterial({
      sessaoValida: true,
      material: material(),
      resultadoGating: { permitido: true, motivo: "assinatura" },
    });
    expect(resultado).toBe("conteudo");
  });

  it("gating negado → bloqueado (R12)", () => {
    const resultado = resolverAcessoMaterial({
      sessaoValida: true,
      material: material(),
      resultadoGating: { permitido: false, motivo: "bloqueado" },
    });
    expect(resultado).toBe("bloqueado");
  });
});

// ---------------------------------------------------------------------------
// resolverGatingMaterial
// ---------------------------------------------------------------------------

describe("resolverGatingMaterial", () => {
  it("material ausente → null (sem decisão)", () => {
    expect(resolverGatingMaterial({ userId: "u", material: null, curso: curso(), entitlements: [] })).toBeNull();
  });

  it("curso ausente → null (sem decisão)", () => {
    expect(resolverGatingMaterial({ userId: "u", material: material(), curso: null, entitlements: [] })).toBeNull();
  });

  it("sem entitlement → bloqueado", () => {
    const resultado = resolverGatingMaterial(
      { userId: "u", material: material(), curso: curso(), entitlements: [] },
      { agora: AGORA },
    );
    expect(resultado).toEqual({ permitido: false, motivo: "bloqueado" });
  });

  it("assinatura ativa em curso incluído → permitido (motivo assinatura)", () => {
    const resultado = resolverGatingMaterial(
      {
        userId: "u",
        material: material(),
        curso: curso({ incluido_assinatura: true }),
        entitlements: [
          entitlement({
            acesso_ate: FUTURO,
            product: { tipo: "assinatura", curso_id: null },
          }),
        ],
      },
      { agora: AGORA },
    );
    expect(resultado).toEqual({ permitido: true, motivo: "assinatura" });
  });
});

// ---------------------------------------------------------------------------
// montarEntitlementsGating (D-G3: product ativo apenas)
// ---------------------------------------------------------------------------

describe("montarEntitlementsGating", () => {
  it("descartada entitlement sem product (shape não avaliável)", () => {
    const linhas = [{ id: "e1", origem: "admin" as const, acesso_ate: null, product_id: "p1", product: null }];
    expect(montarEntitlementsGating(linhas)).toEqual([]);
  });

  it("descartada entitlement de product inativo", () => {
    const linhas = [
      {
        id: "e1",
        origem: "admin" as const,
        acesso_ate: null,
        product_id: "p1",
        product: { tipo: "venda_unica" as const, curso_id: "curso-1", status: "inativo" as const },
      },
    ];
    expect(montarEntitlementsGating(linhas)).toEqual([]);
  });

  it("product ativo → shape mapeado sem status", () => {
    const linhas = [
      {
        id: "e1",
        origem: "admin" as const,
        acesso_ate: null,
        product_id: "p1",
        product: { tipo: "venda_unica" as const, curso_id: "curso-1", status: "ativo" as const },
      },
    ];
    expect(montarEntitlementsGating(linhas)).toEqual([
      { id: "e1", origem: "admin", acesso_ate: null, product_id: "p1", product: { tipo: "venda_unica", curso_id: "curso-1" } },
    ]);
  });
});

// ---------------------------------------------------------------------------
// resolverLeituraMaterial — fluxo completo (C5: URL só no ramo permitido)
// ---------------------------------------------------------------------------

describe("resolverLeituraMaterial (C5 — URL assinada só quando permitido)", () => {
  function rodar(ctx: ContextoLeituraMaterial) {
    const criarUrlAssinada = vi.fn(async (chave: string) => `assinada://${chave}`);
    const promessa = resolverLeituraMaterial(ctx, { agora: AGORA, criarUrlAssinada });
    return { promessa, criarUrlAssinada };
  }

  it("material ausente → nao_encontrado; URL NUNCA emitida", async () => {
    const { promessa, criarUrlAssinada } = rodar(contexto({ material: null, curso: null }));
    expect(await promessa).toEqual({ estado: "nao_encontrado" });
    expect(criarUrlAssinada).not.toHaveBeenCalled();
  });

  it("sessão inválida → nao_encontrado; URL NUNCA emitida (mesmo com amostra)", async () => {
    const { promessa, criarUrlAssinada } = rodar(
      contexto({ sessaoValida: false, material: material({ amostra: true }) }),
    );
    expect(await promessa).toEqual({ estado: "nao_encontrado" });
    expect(criarUrlAssinada).not.toHaveBeenCalled();
  });

  it("sem entitlement → bloqueado (R12); URL NUNCA emitida; motivo bloqueado", async () => {
    const { promessa, criarUrlAssinada } = rodar(
      contexto({ material: material({ tipo: "pdf", arquivo_key: "materials/c/m.pdf" }) }),
    );
    const resultado = (await promessa) as Extract<ResultadoLeituraMaterial, { estado: "bloqueado" }>;
    expect(resultado.estado).toBe("bloqueado");
    expect(resultado.motivo).toBe("bloqueado");
    expect(criarUrlAssinada).not.toHaveBeenCalled();
  });

  it("rascunho → bloqueado (guarda R5); URL NUNCA emitida", async () => {
    const { promessa, criarUrlAssinada } = rodar(
      contexto({ material: material({ status: "rascunho", amostra: true }) }),
    );
    const resultado = (await promessa) as Extract<ResultadoLeituraMaterial, { estado: "bloqueado" }>;
    expect(resultado.estado).toBe("bloqueado");
    expect(criarUrlAssinada).not.toHaveBeenCalled();
  });

  it("amostra → conteudo; texto não emite URL (C5)", async () => {
    const { promessa, criarUrlAssinada } = rodar(contexto({ material: material({ amostra: true }) }));
    const resultado = (await promessa) as Extract<ResultadoLeituraMaterial, { estado: "conteudo" }>;
    expect(resultado.estado).toBe("conteudo");
    expect(resultado.motivo).toBe("amostra");
    expect(resultado.urlPdf).toBeNull();
    expect(criarUrlAssinada).not.toHaveBeenCalled();
  });

  it("assinatura ativa → conteudo; resumo não emite URL (C5)", async () => {
    const { promessa, criarUrlAssinada } = rodar(
      contexto({
        curso: curso({ incluido_assinatura: true }),
        entitlements: [entitlement({ acesso_ate: FUTURO, product: { tipo: "assinatura", curso_id: null } })],
        material: material({ tipo: "resumo", conteudo_html: "<p>resumo</p>" }),
      }),
    );
    const resultado = (await promessa) as Extract<ResultadoLeituraMaterial, { estado: "conteudo" }>;
    expect(resultado.estado).toBe("conteudo");
    expect(resultado.motivo).toBe("assinatura");
    expect(resultado.urlPdf).toBeNull();
    expect(criarUrlAssinada).not.toHaveBeenCalled();
  });

  it("C5: pdf PERMITIDO com arquivo_key → URL emitida exatamente uma vez com a chave", async () => {
    const { promessa, criarUrlAssinada } = rodar(
      contexto({
        material: material({ tipo: "pdf", arquivo_key: "materials/curso-1/mat-1.pdf" }),
        entitlements: [
          entitlement({ product: { tipo: "venda_unica", curso_id: "curso-1" } }),
        ],
      }),
    );
    const resultado = (await promessa) as Extract<ResultadoLeituraMaterial, { estado: "conteudo" }>;
    expect(resultado.estado).toBe("conteudo");
    expect(resultado.motivo).toBe("venda_unica");
    expect(resultado.urlPdf).toBe("assinada://materials/curso-1/mat-1.pdf");
    expect(criarUrlAssinada).toHaveBeenCalledTimes(1);
    expect(criarUrlAssinada).toHaveBeenCalledWith("materials/curso-1/mat-1.pdf");
  });

  it("pdf permitido SEM arquivo_key → urlPdf null; URL não emitida", async () => {
    const { promessa, criarUrlAssinada } = rodar(
      contexto({
        material: material({ tipo: "pdf", arquivo_key: null }),
        entitlements: [entitlement({ product: { tipo: "venda_unica", curso_id: "curso-1" } })],
      }),
    );
    const resultado = (await promessa) as Extract<ResultadoLeituraMaterial, { estado: "conteudo" }>;
    expect(resultado.estado).toBe("conteudo");
    expect(resultado.urlPdf).toBeNull();
    expect(criarUrlAssinada).not.toHaveBeenCalled();
  });

  it("venda_unica de outro curso → bloqueado; URL não emitida (C5/R3)", async () => {
    const { promessa, criarUrlAssinada } = rodar(
      contexto({
        material: material({ tipo: "pdf", arquivo_key: "materials/curso-1/mat-1.pdf" }),
        entitlements: [entitlement({ product: { tipo: "venda_unica", curso_id: "curso-outro" } })],
      }),
    );
    const resultado = (await promessa) as Extract<ResultadoLeituraMaterial, { estado: "bloqueado" }>;
    expect(resultado.estado).toBe("bloqueado");
    expect(criarUrlAssinada).not.toHaveBeenCalled();
  });
});
