// Testes unitários do serviço de cursos — US-03 (SPEC-conteudo §3.1).
//
// TDD (todo 2 do plano s2-conteudo): testes escritos ANTES da implementação.
// O `db` é injetado via `deps` (fake tipado com `DbCursos`) para isolar a regra
// de negócio; o módulo `@/lib/db` é mockado para impedir a construção do
// PrismaClient real (driver adapter exige DATABASE_URL — ver notepads D11). Um
// teste por função cobre o wiring default (chamar sem deps usa o singleton
// mockado).
//
// Convenção de erros: espelha o domínio de auth (D27) — ErroConteudo com
// { code, mensagem, campo? }. C1 (slug imutável após 1º material publicado) e
// C6 (exclusão em cascata com confirmação digitando o nome) vêm de
// SPEC-conteudo §3.1/:37-39 e §4 (:97-106).
import { describe, expect, it, vi, beforeEach } from "vitest";
import type { courses } from "@/generated/prisma/client";

const mocksDb = vi.hoisted(() => ({
  findUnique: vi.fn(),
  findMany: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
  count: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  db: {
    courses: {
      findUnique: mocksDb.findUnique,
      findMany: mocksDb.findMany,
      create: mocksDb.create,
      update: mocksDb.update,
      delete: mocksDb.delete,
    },
    materials: {
      count: mocksDb.count,
    },
  },
}));

import {
  criarCurso,
  atualizarCurso,
  excluirCurso,
  listarCursos,
  obterCursoPorSlug,
  gerarSlug,
  type DadosCriarCurso,
  type DbCursos,
} from "@/services/conteudo/cursos";
import { ErroConteudo } from "@/services/conteudo/erros";

/** Curso fake com TODOS os campos escalares do model `courses` (p/ o tipo). */
function criarCursoFake(overrides: Partial<courses> = {}): courses {
  const agora = new Date("2026-08-15T12:00:00Z");
  return {
    id: "curso-fake-uuid-1",
    nome: "Direito Constitucional",
    descricao: null,
    imagem_url: null,
    slug: "direito-constitucional",
    incluido_assinatura: false,
    criado_em: agora,
    atualizado_em: agora,
    ...overrides,
  };
}

/**
 * Fake do db de cursos — tipado contra o contrato mínimo do serviço (DbCursos).
 * `findUnique` roteia por `where`: `slug` → curso com aquele slug (ou null);
 * caso contrário → curso pelo id (ou null). Os demais retornam valores
 * configuráveis por opção, com defaults neutros.
 */
function criarDbFake(
  options: {
    curso?: courses | null;
    porSlug?: courses | null;
    publicados?: number;
    criado?: courses;
    atualizado?: courses;
    lista?: courses[];
  } = {},
) {
  const findUnique = vi.fn<DbCursos["courses"]["findUnique"]>(
    async (args) => {
      if ("slug" in args.where && args.where.slug !== undefined) {
        return options.porSlug ?? null;
      }
      return options.curso ?? null;
    },
  );
  const findMany = vi.fn<DbCursos["courses"]["findMany"]>(
    async () => options.lista ?? [],
  );
  const create = vi.fn<DbCursos["courses"]["create"]>(
    async () => options.criado ?? criarCursoFake(),
  );
  const update = vi.fn<DbCursos["courses"]["update"]>(
    async () => options.atualizado ?? criarCursoFake(),
  );
  const excluir = vi.fn<DbCursos["courses"]["delete"]>(
    async () => options.curso ?? criarCursoFake(),
  );
  const countMaterials = vi.fn<DbCursos["materials"]["count"]>(
    async () => options.publicados ?? 0,
  );
  return {
    db: {
      courses: { findUnique, findMany, create, update, delete: excluir },
      materials: { count: countMaterials },
    } satisfies DbCursos,
    findUnique,
    findMany,
    create,
    update,
    excluir,
    countMaterials,
  };
}

const dadosValidos: DadosCriarCurso = {
  nome: "  Direito Constitucional para Concursos  ",
};

describe("gerarSlug (helper puro, exportado)", () => {
  it("gera slug minúsculo com hífens a partir do nome", () => {
    expect(gerarSlug("Direito Constitucional para Concursos")).toBe(
      "direito-constitucional-para-concursos",
    );
  });

  it("remove acentos (NFD) mantendo alfanuméricos", () => {
    expect(gerarSlug("Cálculo 1 para Concursos")).toBe(
      "calculo-1-para-concursos",
    );
  });

  it("substitui sequências de espaços/símbolos por um único hífen", () => {
    expect(gerarSlug("  Aula   de   Português!! ")).toBe("aula-de-portugues");
  });

  it("remove hífens nas pontas", () => {
    expect(gerarSlug("-Português-")).toBe("portugues");
  });
});

describe("criarCurso (US-03)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("caso de sucesso", () => {
    it("gera o slug a partir do nome (lowercase, sem acentos, hífens) e cria com incluido_assinatura false por padrão", async () => {
      const criado = criarCursoFake({
        slug: "direito-constitucional-para-concursos",
      });
      const { db, findUnique, create } = criarDbFake({ criado });

      const curso = await criarCurso(dadosValidos, { db });

      expect(curso).toBe(criado);
      // Unicidade conferida ANTES do create, com o slug gerado.
      expect(findUnique).toHaveBeenCalledWith({
        where: { slug: "direito-constitucional-para-concursos" },
      });
      const argsCreate = create.mock.calls[0][0];
      expect(argsCreate.data.slug).toBe(
        "direito-constitucional-para-concursos",
      );
      expect(argsCreate.data.nome).toBe(
        "Direito Constitucional para Concursos", // trim aplicado
      );
      expect(argsCreate.data.descricao).toBeNull();
      expect(argsCreate.data.imagem_url).toBeNull();
      expect(argsCreate.data.incluido_assinatura).toBe(false);
    });

    it("aceita slug manual informado (override do gerado)", async () => {
      const { db, create } = criarDbFake();
      await criarCurso(
        { ...dadosValidos, slug: "meu-curso" },
        { db },
      );

      const argsCreate = create.mock.calls[0][0];
      expect(argsCreate.data.slug).toBe("meu-curso");
    });

    it("aceita descricao, imagem_url e incluido_assinatura informados", async () => {
      const { db, create } = criarDbFake();
      await criarCurso(
        {
          nome: dadosValidos.nome,
          descricao: "  Curso completo  ",
          imagem_url: "https://cdn.exemplo.com/curso.jpg",
          incluido_assinatura: true,
        },
        { db },
      );

      const argsCreate = create.mock.calls[0][0];
      expect(argsCreate.data.descricao).toBe("Curso completo"); // trim
      expect(argsCreate.data.imagem_url).toBe(
        "https://cdn.exemplo.com/curso.jpg",
      );
      expect(argsCreate.data.incluido_assinatura).toBe(true);
    });

    it("usa o db padrão (@/lib/db) quando deps não é informado", async () => {
      mocksDb.findUnique.mockResolvedValue(null);
      const criado = criarCursoFake();
      mocksDb.create.mockResolvedValue(criado);

      const curso = await criarCurso(dadosValidos);

      expect(curso).toBe(criado);
      expect(mocksDb.create).toHaveBeenCalledTimes(1);
    });
  });

  describe("slug duplicado", () => {
    it("lança slug_duplicado amigável e NÃO cria", async () => {
      const existente = criarCursoFake({
        slug: "direito-constitucional-para-concursos",
      });
      const { db, create } = criarDbFake({ porSlug: existente });

      const erro = await criarCurso(dadosValidos, { db }).catch(
        (e: unknown) => e,
      );

      expect(erro).toBeInstanceOf(ErroConteudo);
      expect(erro).toMatchObject({
        code: "slug_duplicado",
        campo: "slug",
        mensagem: "este slug já está em uso",
      });
      expect(create).not.toHaveBeenCalled();
    });
  });

  describe("validação de nome", () => {
    it("rejeita nome com menos de 2 caracteres", async () => {
      const { db, findUnique, create } = criarDbFake();
      await expect(
        criarCurso({ nome: "A" }, { db }),
      ).rejects.toMatchObject({ code: "validacao", campo: "nome" });
      expect(findUnique).not.toHaveBeenCalled();
      expect(create).not.toHaveBeenCalled();
    });

    it("rejeita nome com mais de 120 caracteres", async () => {
      const { db } = criarDbFake();
      await expect(
        criarCurso({ nome: "x".repeat(121) }, { db }),
      ).rejects.toMatchObject({ code: "validacao", campo: "nome" });
    });

    it("rejeita nome em branco (após trim)", async () => {
      const { db } = criarDbFake();
      await expect(
        criarCurso({ nome: "   " }, { db }),
      ).rejects.toMatchObject({ code: "validacao", campo: "nome" });
    });
  });

  describe("validação de imagem_url", () => {
    it("rejeita URL inválida — validação de TAMANHO (≤2MB) é do upload (todo 5 storage)", async () => {
      const { db, findUnique, create } = criarDbFake();
      await expect(
        criarCurso(
          { ...dadosValidos, imagem_url: "não-é-uma-url" },
          { db },
        ),
      ).rejects.toMatchObject({ code: "validacao", campo: "imagem_url" });
      expect(findUnique).not.toHaveBeenCalled();
      expect(create).not.toHaveBeenCalled();
    });

    it("rejeita protocolo fora de http/https", async () => {
      const { db } = criarDbFake();
      await expect(
        criarCurso(
          { ...dadosValidos, imagem_url: "ftp://arquivo.com/img.png" },
          { db },
        ),
      ).rejects.toMatchObject({ code: "validacao", campo: "imagem_url" });
    });
  });

  describe("validação de slug manual", () => {
    it("rejeita slug manual fora do padrão (maiúsculas/símbolos)", async () => {
      const { db } = criarDbFake();
      await expect(
        criarCurso({ ...dadosValidos, slug: "Meu Curso!" }, { db }),
      ).rejects.toMatchObject({ code: "validacao", campo: "slug" });
    });
  });
});

describe("atualizarCurso (US-03, C1)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const curso = criarCursoFake();

  it("atualiza campos que não são slug", async () => {
    const atualizado = criarCursoFake({
      nome: "Direito Constitucional Avançado",
      descricao: "Novo conteúdo",
      incluido_assinatura: true,
    });
    const { db, update } = criarDbFake({
      curso,
      atualizado,
    });

    const resultado = await atualizarCurso(
      curso.id,
      {
        nome: "Direito Constitucional Avançado",
        descricao: "Novo conteúdo",
        incluido_assinatura: true,
      },
      { db },
    );

    expect(resultado).toBe(atualizado);
    expect(update).toHaveBeenCalledWith({
      where: { id: curso.id },
      data: {
        nome: "Direito Constitucional Avançado",
        descricao: "Novo conteúdo",
        incluido_assinatura: true,
      },
    });
  });

  it("C1: bloqueia mudança de slug quando o curso tem ≥1 material publicado", async () => {
    const { db, update, countMaterials } = criarDbFake({
      curso,
      publicados: 1,
    });

    const erro = await atualizarCurso(
      curso.id,
      { slug: "novo-slug" },
      { db },
    ).catch((e: unknown) => e);

    expect(erro).toBeInstanceOf(ErroConteudo);
    expect(erro).toMatchObject({
      code: "slug_imutavel",
      campo: "slug",
      mensagem: "o slug não pode ser alterado após o primeiro material publicado",
    });
    // A checagem de materiais publicados usa a relação modulo → course_id.
    expect(countMaterials).toHaveBeenCalledWith({
      where: { modulo: { course_id: curso.id }, status: "publicado" },
    });
    expect(update).not.toHaveBeenCalled();
  });

  it("C1: permite mudar o slug quando NENHUM material publicado", async () => {
    const { db, update } = criarDbFake({
      curso,
      publicados: 0,
    });

    await atualizarCurso(curso.id, { slug: "novo-slug" }, { db });

    expect(update).toHaveBeenCalledWith({
      where: { id: curso.id },
      data: { slug: "novo-slug" },
    });
  });

  it("slug duplicado na alteração → slug_duplicado (sem update)", async () => {
    const outroCurso = criarCursoFake({
      id: "outro-curso-uuid",
      slug: "novo-slug",
    });
    const { db, update } = criarDbFake({
      curso,
      porSlug: outroCurso,
      publicados: 0,
    });

    const erro = await atualizarCurso(
      curso.id,
      { slug: "novo-slug" },
      { db },
    ).catch((e: unknown) => e);

    expect(erro).toMatchObject({
      code: "slug_duplicado",
      campo: "slug",
    });
    expect(update).not.toHaveBeenCalled();
  });

  it("manter o MESMO slug (sem mudança) não dispara a checagem C1", async () => {
    const { db, update, countMaterials } = criarDbFake({
      curso,
      publicados: 1, // mesmo com material publicado…
    });

    await atualizarCurso(curso.id, { slug: curso.slug }, { db });

    // …a contagem de publicados NÃO é feita (slug inalterado).
    expect(countMaterials).not.toHaveBeenCalled();
    expect(update).toHaveBeenCalledWith({
      where: { id: curso.id },
      data: { slug: curso.slug },
    });
  });

  it("curso não encontrado → nao_encontrado", async () => {
    const { db, update } = criarDbFake({ curso: null });

    const erro = await atualizarCurso(
      "id-inexistente",
      { nome: "Qualquer" },
      { db },
    ).catch((e: unknown) => e);

    expect(erro).toMatchObject({
      code: "nao_encontrado",
      mensagem: "curso não encontrado",
    });
    expect(update).not.toHaveBeenCalled();
  });

  it("nome inválido na atualização → validacao, sem tocar no banco", async () => {
    const { db, findUnique, update } = criarDbFake({ curso });

    await expect(
      atualizarCurso(curso.id, { nome: "A" }, { db }),
    ).rejects.toMatchObject({ code: "validacao", campo: "nome" });
    expect(findUnique).not.toHaveBeenCalled();
    expect(update).not.toHaveBeenCalled();
  });

  it("limpa descricao/imagem_url ao passar null", async () => {
    const { db, update } = criarDbFake({ curso });

    await atualizarCurso(
      curso.id,
      { descricao: null, imagem_url: null },
      { db },
    );

    expect(update).toHaveBeenCalledWith({
      where: { id: curso.id },
      data: { descricao: null, imagem_url: null },
    });
  });
});

describe("excluirCurso (US-03, C6)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const curso = criarCursoFake({ nome: "Direito Constitucional" });

  it("nome digitado diferente → confirmacao_necessaria e NENHUM delete", async () => {
    const { db, excluir } = criarDbFake({ curso });

    const erro = await excluirCurso(
      curso.id,
      "Outro Nome",
      { db },
    ).catch((e: unknown) => e);

    expect(erro).toBeInstanceOf(ErroConteudo);
    expect(erro).toMatchObject({
      code: "confirmacao_necessaria",
      mensagem: "digite o nome do curso para confirmar a exclusão",
    });
    expect(excluir).not.toHaveBeenCalled();
  });

  it("nome correto (com espaços extras) → delete do curso; cascata módulos+materiais fica por conta do banco (C6)", async () => {
    const { db, excluir } = criarDbFake({ curso });

    const resultado = await excluirCurso(
      curso.id,
      "  Direito Constitucional  ",
      { db },
    );

    expect(resultado).toBe(curso);
    // C6: courses.delete dispara a cascata (onDelete: Cascade em
    // modules.course e materials.modulo — schema.prisma) — o serviço apaga
    // a linha do curso e o banco remove módulos/materiais.
    expect(excluir).toHaveBeenCalledWith({ where: { id: curso.id } });
  });

  it("curso não encontrado → nao_encontrado (sem delete)", async () => {
    const { db, excluir } = criarDbFake({ curso: null });

    const erro = await excluirCurso(
      "id-inexistente",
      "Direito Constitucional",
      { db },
    ).catch((e: unknown) => e);

    expect(erro).toMatchObject({ code: "nao_encontrado" });
    expect(excluir).not.toHaveBeenCalled();
  });
});

describe("leitura: listarCursos e obterCursoPorSlug", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("listarCursos retorna os cursos ordenados por criado_em asc", async () => {
    const lista = [criarCursoFake(), criarCursoFake({ id: "c2" })];
    const { db, findMany } = criarDbFake({ lista });

    const resultado = await listarCursos({ db });

    expect(resultado).toBe(lista);
    expect(findMany).toHaveBeenCalledWith({
      orderBy: { criado_em: "asc" },
    });
  });

  it("obterCursoPorSlug retorna o curso encontrado", async () => {
    const curso = criarCursoFake();
    const { db, findUnique } = criarDbFake({ porSlug: curso });

    const resultado = await obterCursoPorSlug("direito-constitucional", {
      db,
    });

    expect(resultado).toBe(curso);
    expect(findUnique).toHaveBeenCalledWith({
      where: { slug: "direito-constitucional" },
    });
  });

  it("obterCursoPorSlug com slug inexistente → nao_encontrado", async () => {
    const { db } = criarDbFake({ porSlug: null });

    const erro = await obterCursoPorSlug("nao-existe", { db }).catch(
      (e: unknown) => e,
    );

    expect(erro).toMatchObject({
      code: "nao_encontrado",
      mensagem: "curso não encontrado",
    });
  });
});
