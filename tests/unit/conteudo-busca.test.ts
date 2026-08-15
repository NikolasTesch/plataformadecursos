// Testes unitários do serviço de busca — US-21 (SPEC-conteudo §3.7, linhas 77-81).
//
// TDD (todo 10 do plano s2-conteudo): testes escritos ANTES da implementação. O
// `db` é injetado via `deps` (fake tipado com `DbBusca`) para isolar a regra de
// negócio; o módulo `@/lib/db` é mockado para impedir a construção do
// PrismaClient real (mesmo padrão dos demais serviços de conteúdo, D29).
//
// IMPORTANTE — gating REAL (não mockado): a integração dos dois serviços é o
// ponto deste todo. O service de busca consulta materiais candidatos
// (publicados, R5) e aplica `podeAcessarMaterial` (subset R1-R4) POR LINHA para
// montar o resultado — nenhum material bloqueado ou rascunho aparece.
//
// Cobertura (SPEC-conteudo §3.7):
//   - match por título (ILIKE) e por conteúdo (conteudo_busca — texto/resumo e
//     texto extraído de PDF, S2-1/todo 11).
//   - case-insensitive ("bem" acha "Bem-vindo" — mesmo cenário do seed).
//   - filtros opcionais: tipo (MaterialTipo) e cursoId (via módulo).
//   - R5: rascunho NUNCA nos resultados (consulta filtra publicados + backstop
//     do gating, que bloqueia status != 'publicado').
//   - R1-R4: material bloqueado (sem entitlement, não-amostra) EXCLUÍDO;
//     amostra INCLUÍDA para usuário sem entitlement; venda_unica/assinatura
//     concedem acesso com o motivo correto.
//   - Relevância: match no título antes de match só no conteúdo.
//   - q vazio → erro de validação ("informe um termo de busca").
import { beforeEach, describe, expect, it, vi } from "vitest";
import type {
  courses,
  entitlements,
  materials,
  MaterialStatus,
  MaterialTipo,
  modules,
  products,
  ProductStatus,
  ProductTipo,
} from "@/generated/prisma/client";

const mocksDb = vi.hoisted(() => ({
  materialsFindMany: vi.fn(),
  entitlementsFindMany: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  db: {
    materials: { findMany: mocksDb.materialsFindMany },
    entitlements: { findMany: mocksDb.entitlementsFindMany },
  },
}));

import { buscar, type DbBusca } from "@/services/conteudo/busca";
import { ErroConteudo } from "@/services/conteudo/erros";

// Relógio fixo p/ entitlements determinísticos (mesmo padrão do gating-min).
const AGORA = new Date("2026-08-15T12:00:00.000Z");
const FUTURO = new Date("2026-09-01T00:00:00.000Z");

/** Material fake com o curso incluído (shape retornado pelo findMany da busca). */
function criarMaterialBuscaFake(
  overrides: Partial<materials> & {
    curso?: Partial<courses>;
    moduloNome?: string;
  } = {},
): materials & { modulo: modules & { course: courses } } {
  const {
    curso = { id: "curso-1", slug: "curso-demo", incluido_assinatura: false },
    moduloNome = "Introdução",
    ...material
  } = overrides;
  const agora = new Date("2026-08-15T12:00:00Z");
  const base: materials = {
    id: "mat-1",
    module_id: "mod-1",
    titulo: "Introdução ao Direito Constitucional",
    tipo: "texto" as MaterialTipo,
    ordem: 1,
    status: "publicado" as MaterialStatus,
    publicado_em: agora,
    amostra: false,
    conteudo_html: "<p>Conteúdo</p>",
    arquivo_key: null,
    video_provider_id: null,
    video_status: null,
    video_erro: null,
    conteudo_busca: "introdução ao direito constitucional conteúdo",
    criado_em: agora,
    atualizado_em: agora,
    ...material,
  };
  const modulo: modules & { course: courses } = {
    id: base.module_id,
    course_id: curso.id ?? "curso-1",
    nome: moduloNome,
    ordem: 1,
    course: {
      id: curso.id ?? "curso-1",
      nome: "Curso Demo",
      descricao: null,
      imagem_url: null,
      slug: curso.slug ?? "curso-demo",
      incluido_assinatura: curso.incluido_assinatura ?? false,
      criado_em: agora,
      atualizado_em: agora,
    },
  };
  return { ...base, modulo };
}

/** Entitlement fake com o produto incluído (shape do findMany da busca). */
function criarEntitlementBuscaFake(
  overrides: Partial<entitlements> & {
    productTipo?: ProductTipo;
    productCursoId?: string | null;
    productStatus?: ProductStatus;
  } = {},
): entitlements & { product: products } {
  const {
    productTipo = "assinatura" as ProductTipo,
    productCursoId = null,
    productStatus = "ativo" as ProductStatus,
    ...entitlement
  } = overrides;
  const agora = new Date("2026-08-15T12:00:00Z");
  return {
    id: "ent-1",
    user_id: "user-1",
    product_id: "prod-1",
    origem: "pagamento",
    acesso_ate: null,
    criado_em: agora,
    atualizado_em: agora,
    product: {
      id: "prod-1",
      tipo: productTipo,
      nome: "Produto",
      preco_mensal_cents: null,
      preco_anual_cents: null,
      curso_id: productCursoId,
      status: productStatus,
    },
    ...entitlement,
  };
}

/** Fake do db de busca — tipado contra o contrato mínimo do serviço. */
function criarDbFake(opcoes: {
  materiais?: (materials & { modulo: modules & { course: courses } })[];
  entitlements?: (entitlements & { product: products })[];
} = {}) {
  const { materiais = [], entitlements = [] } = opcoes;
  // O fake EMULA o WHERE de tipo/cursoId (mocks não filtram sozinhos) para o
  // serviço receber apenas o que a consulta SQL devolveria (mesmo padrão do
  // findUnique roteado por where do fake de cursos, todo 2).
  const materialsFindMany = vi.fn<DbBusca["materials"]["findMany"]>(
    async (args) => {
      let lista = materiais;
      if (args.where.tipo !== undefined) {
        lista = lista.filter((m) => m.tipo === args.where.tipo);
      }
      if (args.where.modulo !== undefined) {
        lista = lista.filter((m) => m.modulo.course_id === args.where.modulo?.course_id);
      }
      return lista;
    },
  );
  const entitlementsFindMany = vi.fn<DbBusca["entitlements"]["findMany"]>(
    async () => entitlements,
  );
  const db: DbBusca = {
    materials: { findMany: materialsFindMany },
    entitlements: { findMany: entitlementsFindMany },
  };
  return { db, materialsFindMany, entitlementsFindMany };
}

/** Entitlement de assinatura ativa (R2 — acesso_ate futuro). */
function assinaturaAtiva(): entitlements & { product: products } {
  return criarEntitlementBuscaFake({
    origem: "pagamento",
    acesso_ate: FUTURO,
    productTipo: "assinatura",
  });
}

describe("buscar — US-21 (SPEC-conteudo §3.7)", () => {
  beforeEach(() => {
    mocksDb.materialsFindMany.mockReset();
    mocksDb.entitlementsFindMany.mockReset();
  });

  describe("match por título e conteúdo", () => {
    it("encontra por título (ILIKE) com assinatura ativa — motivo assinatura", async () => {
      const material = criarMaterialBuscaFake({
        id: "mat-constitucional",
        titulo: "Direito Constitucional",
        conteudo_busca: "direito constitucional",
        curso: { incluido_assinatura: true },
      });
      const { db } = criarDbFake({
        materiais: [material],
        entitlements: [assinaturaAtiva()],
      });

      const resultado = await buscar({ q: "constitucional", userId: "user-1" }, { db });

      expect(resultado.total).toBe(1);
      expect(resultado.resultados).toEqual([
        {
          id: "mat-constitucional",
          titulo: "Direito Constitucional",
          tipo: "texto",
          slugCurso: "curso-demo",
          moduloNome: "Introdução",
          amostra: false,
          motivoAcesso: "assinatura",
        },
      ]);
    });

    it("encontra por conteúdo (conteudo_busca) quando o título não contém o termo", async () => {
      const material = criarMaterialBuscaFake({
        id: "mat-aula1",
        titulo: "Aula 1 — Matéria",
        conteudo_busca: "aula 1 matéria princípios fundamentais da república",
        amostra: true,
      });
      const { db } = criarDbFake({ materiais: [material] });

      const resultado = await buscar({ q: "principios", userId: "user-1" }, { db });

      expect(resultado.total).toBe(1);
      expect(resultado.resultados[0]?.id).toBe("mat-aula1");
      expect(resultado.resultados[0]?.motivoAcesso).toBe("amostra");
    });

    it("encontra conteúdo extraído de PDF (conteudo_busca populado do texto do PDF)", async () => {
      const material = criarMaterialBuscaFake({
        id: "mat-pdf",
        titulo: "Apostila de Direito Administrativo",
        tipo: "pdf" as MaterialTipo,
        conteudo_busca:
          "apostila de direito administrativo artigo 5 todos sao iguais perante a lei",
        curso: { incluido_assinatura: true },
      });
      const { db } = criarDbFake({
        materiais: [material],
        entitlements: [assinaturaAtiva()],
      });

      const resultado = await buscar({ q: "perante a lei", userId: "user-1" }, { db });

      expect(resultado.total).toBe(1);
      expect(resultado.resultados[0]?.id).toBe("mat-pdf");
      expect(resultado.resultados[0]?.tipo).toBe("pdf");
    });

    it("busca é case-insensitive ('bem' encontra 'Bem-vindo' — cenário do seed)", async () => {
      const material = criarMaterialBuscaFake({
        id: "mat-bemvindo",
        titulo: "Bem-vindo",
        conteudo_busca: "bem-vindo ao concursfoco material de exemplo",
      });
      const { db } = criarDbFake({
        materiais: [material],
        entitlements: [
          criarEntitlementBuscaFake({
            origem: "pagamento",
            acesso_ate: null,
            productTipo: "venda_unica",
            productCursoId: "curso-1",
          }),
        ],
      });

      const resultado = await buscar({ q: "bem", userId: "user-1" }, { db });

      expect(resultado.total).toBe(1);
      expect(resultado.resultados[0]?.id).toBe("mat-bemvindo");
      expect(resultado.resultados[0]?.motivoAcesso).toBe("venda_unica");
    });

    it("a consulta usa ILIKE nos DOIS campos (titulo e conteudo_busca) + filtra publicados (R5)", async () => {
      const { db, materialsFindMany } = criarDbFake({ materiais: [] });

      await buscar({ q: "constitucional", userId: "user-1" }, { db });

      const args = materialsFindMany.mock.calls[0]?.[0];
      expect(args?.where.status).toBe("publicado");
      expect(args?.where.OR).toEqual([
        { titulo: { contains: "constitucional", mode: "insensitive" } },
        { conteudo_busca: { contains: "constitucional", mode: "insensitive" } },
      ]);
      expect(args?.include).toEqual({ modulo: { include: { course: true } } });
      expect(args?.orderBy).toEqual({ ordem: "asc" });
    });
  });

  describe("filtros opcionais (tipo e cursoId)", () => {
    it("filtra por tipo — só materiais do tipo informado voltam", async () => {
      const texto = criarMaterialBuscaFake({
        id: "mat-texto",
        titulo: "Resumo de Direito",
        tipo: "texto" as MaterialTipo,
        amostra: true,
      });
      const pdf = criarMaterialBuscaFake({
        id: "mat-pdf",
        titulo: "Apostila de Direito",
        tipo: "pdf" as MaterialTipo,
        amostra: true,
      });
      const { db, materialsFindMany } = criarDbFake({
        materiais: [texto, pdf],
      });

      const resultado = await buscar({ q: "direito", tipo: "texto", userId: "user-1" }, { db });

      expect(materialsFindMany.mock.calls[0]?.[0]?.where.tipo).toBe("texto");
      expect(resultado.total).toBe(1);
      expect(resultado.resultados[0]?.id).toBe("mat-texto");
    });

    it("filtra por curso (cursoId via módulo → course_id)", async () => {
      const { db, materialsFindMany } = criarDbFake({ materiais: [] });

      await buscar({ q: "direito", cursoId: "curso-2", userId: "user-1" }, { db });

      const args = materialsFindMany.mock.calls[0]?.[0];
      expect(args?.where.modulo).toEqual({ course_id: "curso-2" });
    });

    it("tipo inválido → erro de validação (campo tipo)", async () => {
      const { db } = criarDbFake();
      const erro = await buscar(
        { q: "direito", tipo: "audio" as MaterialTipo, userId: "user-1" },
        { db },
      ).catch((e: unknown) => e);

      expect(erro).toBeInstanceOf(ErroConteudo);
      expect((erro as ErroConteudo).code).toBe("validacao");
      expect((erro as ErroConteudo).campo).toBe("tipo");
      expect(mocksDb.materialsFindMany).not.toHaveBeenCalled();
    });
  });

  describe("gating na busca (R1-R4 aplicados aos resultados)", () => {
    it("material publicado bloqueado (sem entitlement, não-amostra) NÃO aparece", async () => {
      const material = criarMaterialBuscaFake({
        id: "mat-bloqueado",
        titulo: "Conteúdo Exclusivo",
        conteudo_busca: "conteúdo exclusivo",
        curso: { incluido_assinatura: false },
      });
      const { db, entitlementsFindMany } = criarDbFake({
        materiais: [material],
        entitlements: [],
      });

      const resultado = await buscar({ q: "exclusivo", userId: "user-1" }, { db });

      expect(entitlementsFindMany.mock.calls[0]?.[0]?.where).toEqual({
        user_id: "user-1",
        product: { status: "ativo" },
      });
      expect(resultado.total).toBe(0);
      expect(resultado.resultados).toEqual([]);
    });

    it("amostra publicada é INCLUÍDA para usuário sem entitlement (R4)", async () => {
      const amostra = criarMaterialBuscaFake({
        id: "mat-amostra",
        titulo: "Amostra Gratuita",
        conteudo_busca: "amostra gratuita",
        amostra: true,
      });
      const { db } = criarDbFake({ materiais: [amostra], entitlements: [] });

      const resultado = await buscar({ q: "amostra", userId: "user-1" }, { db });

      expect(resultado.total).toBe(1);
      expect(resultado.resultados[0]).toMatchObject({
        id: "mat-amostra",
        amostra: true,
        motivoAcesso: "amostra",
      });
    });

    it("material rascunho nunca aparece, mesmo com match (backstop do gating, R5)", async () => {
      // Cenário defensivo: o mock simula uma consulta "vazada" que devolve um
      // rascunho — o gating por linha é o backstop (guarda de publicação).
      const rascunho = criarMaterialBuscaFake({
        id: "mat-rascunho",
        titulo: "Rascunho Secreto",
        conteudo_busca: "rascunho secreto",
        status: "rascunho" as MaterialStatus,
        amostra: true,
      });
      const { db } = criarDbFake({ materiais: [rascunho] });

      const resultado = await buscar({ q: "secreto", userId: "user-1" }, { db });

      expect(resultado.total).toBe(0);
      expect(resultado.resultados).toEqual([]);
    });

    it("entitlement inativo (product.status != ativo) não concede acesso", async () => {
      const material = criarMaterialBuscaFake({
        id: "mat-1",
        titulo: "Curso Avançado",
        conteudo_busca: "curso avançado",
        curso: { incluido_assinatura: true },
      });
      const { db } = criarDbFake({
        materiais: [material],
        entitlements: [
          criarEntitlementBuscaFake({
            origem: "pagamento",
            acesso_ate: FUTURO,
            productStatus: "inativo" as ProductStatus,
            productTipo: "assinatura",
          }),
        ],
      });

      const resultado = await buscar({ q: "avancado", userId: "user-1" }, { db });

      // O serviço consulta apenas entitlements com product ativo (contrato do
      // where) — o fake devolve o inativo para provar que ele NÃO é considerado.
      expect(resultado.total).toBe(0);
    });

    it("assinatura expirada (acesso_ate passado) não concede acesso", async () => {
      const material = criarMaterialBuscaFake({
        id: "mat-1",
        titulo: "Conteúdo da Assinatura",
        conteudo_busca: "conteúdo da assinatura",
        curso: { incluido_assinatura: true },
      });
      const { db } = criarDbFake({
        materiais: [material],
        entitlements: [
          criarEntitlementBuscaFake({
            origem: "pagamento",
            acesso_ate: new Date("2026-08-01T00:00:00.000Z"),
            productTipo: "assinatura",
          }),
        ],
      });

      const resultado = await buscar({ q: "assinatura", userId: "user-1" }, { db });

      expect(resultado.total).toBe(0);
    });
  });

  describe("relevância e shape do resultado", () => {
    it("match no título vem ANTES de match só no conteúdo (ordenação por relevância)", async () => {
      const soConteudo = criarMaterialBuscaFake({
        id: "mat-conteudo",
        titulo: "Apostila Completa",
        conteudo_busca: "dicas para a prova direito constitucional",
        ordem: 1,
        amostra: true,
      });
      const noTitulo = criarMaterialBuscaFake({
        id: "mat-titulo",
        titulo: "Dicas para a Prova",
        conteudo_busca: "dicas para a prova",
        ordem: 2,
        amostra: true,
      });
      // O SQL ordena por ordem asc; a relevância (título primeiro) é aplicada em
      // seguida — estável, então dentro do grupo mantém a ordem do banco.
      const { db } = criarDbFake({ materiais: [soConteudo, noTitulo] });

      const resultado = await buscar({ q: "dicas", userId: "user-1" }, { db });

      expect(resultado.resultados.map((r) => r.id)).toEqual(["mat-titulo", "mat-conteudo"]);
    });

    it("slugs de curso e módulo populados no resultado (navegação)", async () => {
      const material = criarMaterialBuscaFake({
        id: "mat-1",
        titulo: "Direito Constitucional",
        conteudo_busca: "direito constitucional",
        moduloNome: "Módulo 2 — Normas",
        curso: { id: "curso-9", slug: "direito-constitucional", incluido_assinatura: true },
        amostra: false,
      });
      const { db } = criarDbFake({ materiais: [material], entitlements: [assinaturaAtiva()] });

      const resultado = await buscar({ q: "constitucional", userId: "user-1" }, { db });

      expect(resultado.resultados[0]).toMatchObject({
        id: "mat-1",
        slugCurso: "direito-constitucional",
        moduloNome: "Módulo 2 — Normas",
        amostra: false,
      });
    });
  });

  describe("validação de entrada", () => {
    it("q vazio (ou só espaços) → erro de validação 'informe um termo de busca'", async () => {
      const { db } = criarDbFake();
      const erro = await buscar({ q: "   ", userId: "user-1" }, { db }).catch(
        (e: unknown) => e,
      );

      expect(erro).toBeInstanceOf(ErroConteudo);
      expect((erro as ErroConteudo).code).toBe("validacao");
      expect((erro as ErroConteudo).campo).toBe("q");
      expect((erro as ErroConteudo).mensagem).toBe("informe um termo de busca");
      expect(mocksDb.materialsFindMany).not.toHaveBeenCalled();
    });

    it("q ausente (undefined) → erro de validação no campo q", async () => {
      const { db } = criarDbFake();
      const erro = await buscar(
        { q: undefined as unknown as string, userId: "user-1" },
        { db },
      ).catch((e: unknown) => e);

      expect(erro).toBeInstanceOf(ErroConteudo);
      expect((erro as ErroConteudo).campo).toBe("q");
    });
  });
});
