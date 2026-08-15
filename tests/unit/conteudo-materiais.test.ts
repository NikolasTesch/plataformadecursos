// Testes unitários do serviço de materiais — US-05/06/09/40 (SPEC-conteudo §3.3-3.6).
//
// TDD (todo 4 do plano s2-conteudo): testes escritos ANTES da implementação. O
// `db` é injetado via `deps` (fake tipado com `DbMateriais`) para isolar a regra
// de negócio; o módulo `@/lib/db` é mockado para impedir a construção do
// PrismaClient real (mesmo padrão de src/services/auth/registrar.ts, D29).
//
// Regras cobertas:
// - CRUD por tipo (pdf: arquivo_key; texto/resumo: conteudo_html; video:
//   video_provider_id + video_status estrutural; questoes: placeholder).
// - ordem default = max+1 dentro do módulo.
// - C2 (SPEC-conteudo §4/:98): máx. 1 amostra por curso — erro "já existe 1
//   material de amostra neste curso" (E2E-C1) e nenhum write.
// - Publicação (US-09): rascunho→publicado define publicado_em = now; já
//   publicado → no-op; R11: vídeo com status `erro` não publica.
// - Despublicação (R5): efeito imediato; publicado_em mantido (histórico).
// - Getters/lista ordenada por ordem (R6).
import { beforeEach, describe, expect, it, vi } from "vitest";
import type {
  materials,
  MaterialStatus,
  MaterialTipo,
  modules,
  VideoStatus,
} from "@/generated/prisma/client";

const mocksDb = vi.hoisted(() => ({
  modulesFindUnique: vi.fn(),
  materialsFindUnique: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  findMany: vi.fn(),
  count: vi.fn(),
  aggregate: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  db: {
    modules: { findUnique: mocksDb.modulesFindUnique },
    materials: {
      findUnique: mocksDb.materialsFindUnique,
      create: mocksDb.create,
      update: mocksDb.update,
      findMany: mocksDb.findMany,
      count: mocksDb.count,
      aggregate: mocksDb.aggregate,
    },
  },
}));

import {
  atualizarMaterial,
  criarMaterial,
  despublicarMaterial,
  listarMateriais,
  obterMaterial,
  publicarMaterial,
  type DbMateriais,
} from "@/services/conteudo/materiais";
import { ErroConteudo } from "@/services/conteudo/erros";

/** Material fake com TODOS os campos do model `materials`. */
function criarMaterialFake(overrides: Partial<materials> = {}): materials {
  const agora = new Date("2026-08-15T12:00:00Z");
  return {
    id: "mat-fake-1",
    module_id: "mod-fake-1",
    titulo: "Introdução ao Direito Constitucional",
    tipo: "texto" as MaterialTipo,
    ordem: 1,
    status: "rascunho" as MaterialStatus,
    publicado_em: null,
    amostra: false,
    conteudo_html: "<p>Conteúdo do material</p>",
    arquivo_key: null,
    video_provider_id: null,
    video_status: null,
    video_erro: null,
    conteudo_busca: "introdução ao direito constitucional conteúdo do material",
    criado_em: agora,
    atualizado_em: agora,
    ...overrides,
  };
}

/** Módulo fake com os campos escalares do model `modules`. */
function criarModuloFake(overrides: Partial<modules> = {}): modules {
  return {
    id: "mod-fake-1",
    course_id: "curso-fake-1",
    nome: "Módulo 1",
    ordem: 1,
    ...overrides,
  };
}

/** Fake do db de materiais — tipado contra o contrato mínimo do serviço. */
function criarDbFake(opcoes: {
  modulo?: modules | null;
  material?: materials | null;
  criado?: materials;
  atualizado?: materials;
  amostras?: number;
  maxOrdem?: number | null;
  lista?: materials[];
} = {}) {
  const {
    modulo = criarModuloFake(),
    material = criarMaterialFake(),
    criado = criarMaterialFake(),
    atualizado = criarMaterialFake(),
    amostras = 0,
    maxOrdem = null,
    lista = [],
  } = opcoes;

  const modulesFindUnique = vi.fn<DbMateriais["modules"]["findUnique"]>(
    async () => modulo,
  );
  const materialsFindUnique = vi.fn<DbMateriais["materials"]["findUnique"]>(
    async () => material,
  );
  const create = vi.fn<DbMateriais["materials"]["create"]>(async () => criado);
  const update = vi.fn<DbMateriais["materials"]["update"]>(async () => atualizado);
  const findMany = vi.fn<DbMateriais["materials"]["findMany"]>(
    async () => lista,
  );
  const count = vi.fn<DbMateriais["materials"]["count"]>(async () => amostras);
  const aggregate = vi.fn<DbMateriais["materials"]["aggregate"]>(
    async () => ({ _max: { ordem: maxOrdem } }),
  );

  return {
    db: {
      modules: { findUnique: modulesFindUnique },
      materials: {
        findUnique: materialsFindUnique,
        create,
        update,
        findMany,
        count,
        aggregate,
      },
    },
    modulesFindUnique,
    materialsFindUnique,
    create,
    update,
    findMany,
    count,
    aggregate,
  };
}

describe("criarMaterial (US-05/06/09/40)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("cria material texto: titulo com trim, rascunho default, amostra false, publicado_em null e conteudo_busca preenchido", async () => {
    const { db, aggregate, create } = criarDbFake({ maxOrdem: null });

    await criarMaterial(
      {
        module_id: " mod-fake-1 ",
        titulo: "  Introdução ao Direito Constitucional  ",
        tipo: "texto",
        conteudo_html: "<p>Bem-vindo ao curso!</p>",
      },
      { db },
    );

    // ordem default: nenhum material no módulo → 1.
    expect(aggregate).toHaveBeenCalledWith({
      where: { module_id: "mod-fake-1" },
      _max: { ordem: true },
    });
    const argsCreate = create.mock.calls[0][0];
    expect(argsCreate.data.module_id).toBe("mod-fake-1");
    expect(argsCreate.data.titulo).toBe("Introdução ao Direito Constitucional");
    expect(argsCreate.data.tipo).toBe("texto");
    expect(argsCreate.data.ordem).toBe(1);
    expect(argsCreate.data.status).toBe("rascunho");
    expect(argsCreate.data.amostra).toBe(false);
    expect(argsCreate.data.publicado_em).toBeNull();
    expect(argsCreate.data.conteudo_html).toBe("<p>Bem-vindo ao curso!</p>");
    expect(argsCreate.data.conteudo_busca).toBe(
      "introdução ao direito constitucional bem-vindo ao curso!",
    );
  });

  it("ordem default = max+1 dentro do módulo (max 5 → ordem 6)", async () => {
    const { db, aggregate, create } = criarDbFake({ maxOrdem: 5 });

    await criarMaterial(
      { module_id: "mod-fake-1", titulo: "Aula 2", tipo: "texto", conteudo_html: "<p>x</p>" },
      { db },
    );

    expect(aggregate).toHaveBeenCalledTimes(1);
    expect(create.mock.calls[0][0].data.ordem).toBe(6);
  });

  it("ordem explícita é respeitada e o aggregate não é consultado", async () => {
    const { db, aggregate, create } = criarDbFake();

    await criarMaterial(
      { module_id: "mod-fake-1", titulo: "Aula 3", tipo: "texto", ordem: 9, conteudo_html: "<p>x</p>" },
      { db },
    );

    expect(aggregate).not.toHaveBeenCalled();
    expect(create.mock.calls[0][0].data.ordem).toBe(9);
  });

  it("cria material pdf com arquivo_key (conteudo_busca só com o título)", async () => {
    const { db, create } = criarDbFake();

    await criarMaterial(
      { module_id: "mod-fake-1", titulo: "Aula 1 - PDF", tipo: "pdf", arquivo_key: "materials/curso/mat.pdf" },
      { db },
    );

    const argsCreate = create.mock.calls[0][0];
    expect(argsCreate.data.arquivo_key).toBe("materials/curso/mat.pdf");
    expect(argsCreate.data.conteudo_html).toBeNull();
    expect(argsCreate.data.conteudo_busca).toBe("aula 1 - pdf");
  });

  it("cria material video com video_provider_id e video_status", async () => {
    const { db, create } = criarDbFake();

    await criarMaterial(
      {
        module_id: "mod-fake-1",
        titulo: "Vídeo 1",
        tipo: "video",
        video_provider_id: "bunny-abc-123",
        video_status: "processando",
      },
      { db },
    );

    const argsCreate = create.mock.calls[0][0];
    expect(argsCreate.data.video_provider_id).toBe("bunny-abc-123");
    expect(argsCreate.data.video_status).toBe("processando");
    expect(argsCreate.data.conteudo_busca).toBeNull(); // video: sem corpo pesquisável
  });

  it("rejeita video sem video_provider_id (estrutura do tipo)", async () => {
    const { db, create } = criarDbFake();

    await expect(
      criarMaterial(
        { module_id: "mod-fake-1", titulo: "Vídeo", tipo: "video", video_status: "processando" },
        { db },
      ),
    ).rejects.toMatchObject({ code: "validacao", campo: "video_provider_id" });
    expect(create).not.toHaveBeenCalled();
  });

  it("rejeita video sem video_status (estrutura do tipo)", async () => {
    const { db, create } = criarDbFake();

    await expect(
      criarMaterial(
        { module_id: "mod-fake-1", titulo: "Vídeo", tipo: "video", video_provider_id: "bunny-1" },
        { db },
      ),
    ).rejects.toMatchObject({ code: "validacao", campo: "video_status" });
    expect(create).not.toHaveBeenCalled();
  });

  it("cria material questoes (placeholder estrutural — sem campos obrigatórios)", async () => {
    const { db, create } = criarDbFake();

    await criarMaterial(
      { module_id: "mod-fake-1", titulo: "Bloco de questões", tipo: "questoes" },
      { db },
    );

    expect(create).toHaveBeenCalledTimes(1);
    expect(create.mock.calls[0][0].data.conteudo_busca).toBeNull();
  });

  it("rejeita titulo em branco sem tocar no banco", async () => {
    const { db, modulesFindUnique, create } = criarDbFake();

    await expect(
      criarMaterial({ module_id: "mod-fake-1", titulo: "   ", tipo: "texto" }, { db }),
    ).rejects.toMatchObject({ code: "validacao", campo: "titulo" });
    expect(modulesFindUnique).not.toHaveBeenCalled();
    expect(create).not.toHaveBeenCalled();
  });

  it("rejeita tipo inválido", async () => {
    const { db, create } = criarDbFake();

    await expect(
      criarMaterial(
        { module_id: "mod-fake-1", titulo: "X", tipo: "audio" as MaterialTipo },
        { db },
      ),
    ).rejects.toMatchObject({ code: "validacao", campo: "tipo" });
    expect(create).not.toHaveBeenCalled();
  });

  it("rejeita módulo inexistente com erro amigável e sem create", async () => {
    const { db, create } = criarDbFake({ modulo: null });

    const erro = await criarMaterial(
      { module_id: "mod-inexistente", titulo: "X", tipo: "texto", conteudo_html: "<p>x</p>" },
      { db },
    ).catch((e: unknown) => e);

    expect(erro).toBeInstanceOf(ErroConteudo);
    expect(erro).toMatchObject({ code: "nao_encontrado", mensagem: "módulo não encontrado" });
    expect(create).not.toHaveBeenCalled();
  });

  it("criar já publicado define publicado_em = now (Date)", async () => {
    const { db, create } = criarDbFake();

    await criarMaterial(
      { module_id: "mod-fake-1", titulo: "Aula", tipo: "texto", conteudo_html: "<p>x</p>", status: "publicado" },
      { db },
    );

    const argsCreate = create.mock.calls[0][0];
    expect(argsCreate.data.status).toBe("publicado");
    expect(argsCreate.data.publicado_em).toBeInstanceOf(Date);
  });

  it("R11: criar video com video_status erro já publicado é bloqueado (sem create)", async () => {
    const { db, create } = criarDbFake();

    const erro = await criarMaterial(
      {
        module_id: "mod-fake-1",
        titulo: "Vídeo quebrado",
        tipo: "video",
        video_provider_id: "bunny-1",
        video_status: "erro",
        status: "publicado",
      },
      { db },
    ).catch((e: unknown) => e);

    expect(erro).toBeInstanceOf(ErroConteudo);
    expect(erro).toMatchObject({
      code: "regra_negocio",
      mensagem: "o vídeo precisa ser processado com sucesso para publicar",
    });
    expect(create).not.toHaveBeenCalled();
  });
});

describe("C2 — máx. 1 amostra por curso (SPEC-conteudo §4/:98, E2E-C1)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("cria amostra=true sem outra amostra no curso → ok (count retorna 0)", async () => {
    const { db, count, create } = criarDbFake({ amostras: 0 });

    await criarMaterial(
      { module_id: "mod-fake-1", titulo: "Amostra", tipo: "texto", conteudo_html: "<p>x</p>", amostra: true },
      { db },
    );

    // A contagem filtra pelo curso do módulo (join via relação modulo).
    expect(count).toHaveBeenCalledWith({
      where: {
        amostra: true,
        modulo: { course_id: "curso-fake-1" },
      },
    });
    expect(create).toHaveBeenCalledTimes(1);
    expect(create.mock.calls[0][0].data.amostra).toBe(true);
  });

  it("2ª amostra no MESMO curso → erro E2E-C1 e NENHUM create", async () => {
    const { db, count, create } = criarDbFake({ amostras: 1 });

    const erro = await criarMaterial(
      { module_id: "mod-fake-1", titulo: "Segunda amostra", tipo: "texto", conteudo_html: "<p>x</p>", amostra: true },
      { db },
    ).catch((e: unknown) => e);

    expect(erro).toBeInstanceOf(ErroConteudo);
    expect(erro).toMatchObject({
      code: "regra_negocio",
      campo: "amostra",
      mensagem: "já existe 1 material de amostra neste curso",
    });
    expect(count).toHaveBeenCalledWith({
      where: { amostra: true, modulo: { course_id: "curso-fake-1" } },
    });
    expect(create).not.toHaveBeenCalled();
  });

  it("amostra em curso diferente → permitido (count 0 pelo curso do módulo)", async () => {
    const { db, count, create } = criarDbFake({ modulo: criarModuloFake({ course_id: "curso-fake-2" }) });

    await criarMaterial(
      { module_id: "mod-fake-1", titulo: "Amostra outro curso", tipo: "texto", conteudo_html: "<p>x</p>", amostra: true },
      { db },
    );

    expect(count).toHaveBeenCalledWith({
      where: { amostra: true, modulo: { course_id: "curso-fake-2" } },
    });
    expect(create).toHaveBeenCalledTimes(1);
  });

  it("atualizar para amostra=true com outra amostra no mesmo curso → erro + sem update", async () => {
    const material = criarMaterialFake({ id: "mat-b", amostra: false });
    const { db, count, update } = criarDbFake({ material, amostras: 1 });

    const erro = await atualizarMaterial("mat-b", { amostra: true }, { db }).catch(
      (e: unknown) => e,
    );

    expect(erro).toBeInstanceOf(ErroConteudo);
    expect(erro).toMatchObject({ code: "regra_negocio", mensagem: "já existe 1 material de amostra neste curso" });
    // A contagem EXCLUI o próprio material (id: not).
    expect(count).toHaveBeenCalledWith({
      where: { amostra: true, modulo: { course_id: "curso-fake-1" }, id: { not: "mat-b" } },
    });
    expect(update).not.toHaveBeenCalled();
  });

  it("atualizar para amostra=true sem concorrente → ok (count exclui o próprio id)", async () => {
    const material = criarMaterialFake({ id: "mat-b", amostra: false });
    const { db, count, update } = criarDbFake({ material, amostras: 0 });

    await atualizarMaterial("mat-b", { amostra: true }, { db });

    expect(count).toHaveBeenCalledWith({
      where: { amostra: true, modulo: { course_id: "curso-fake-1" }, id: { not: "mat-b" } },
    });
    expect(update.mock.calls[0][0].data.amostra).toBe(true);
  });

  it("amostra=false é sempre permitido (mesmo com outra amostra existente)", async () => {
    const material = criarMaterialFake({ amostra: true });
    const { db, count, update } = criarDbFake({ material, amostras: 1 });

    await atualizarMaterial("mat-fake-1", { amostra: false }, { db });

    // Sem contagem: amostra=false não exige checagem (C2 só limita o "true").
    expect(count).not.toHaveBeenCalled();
    expect(update.mock.calls[0][0].data.amostra).toBe(false);
  });
});

describe("atualizarMaterial (US-06)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("atualiza titulo/ordem sem tocar em publicado_em nem recontar amostra", async () => {
    const { db, update, count, modulesFindUnique } = criarDbFake();

    await atualizarMaterial("mat-fake-1", { titulo: "Novo título", ordem: 4 }, { db });

    const data = update.mock.calls[0][0].data;
    expect(data.titulo).toBe("Novo título");
    expect(data.ordem).toBe(4);
    expect(data).not.toHaveProperty("publicado_em");
    expect(data).not.toHaveProperty("amostra");
    expect(count).not.toHaveBeenCalled();
    expect(modulesFindUnique).not.toHaveBeenCalled();
  });

  it("objeto vazio → no-op (update não é chamado)", async () => {
    const { db, update } = criarDbFake();

    const resultado = await atualizarMaterial("mat-fake-1", {}, { db });

    expect(resultado.id).toBe("mat-fake-1");
    expect(update).not.toHaveBeenCalled();
  });

  it("material inexistente → nao_encontrado", async () => {
    const { db, update } = criarDbFake({ material: null });

    await expect(
      atualizarMaterial("mat-nada", { titulo: "X" }, { db }),
    ).rejects.toMatchObject({ code: "nao_encontrado", mensagem: "material não encontrado" });
    expect(update).not.toHaveBeenCalled();
  });

  it("atualizar para status publicado (rascunho→publicado) aplica R11 e define publicado_em", async () => {
    const material = criarMaterialFake({ status: "rascunho" });
    const { db, update } = criarDbFake({ material });

    await atualizarMaterial("mat-fake-1", { status: "publicado" }, { db });

    const data = update.mock.calls[0][0].data;
    expect(data.status).toBe("publicado");
    expect(data.publicado_em).toBeInstanceOf(Date);
  });

  it("atualizar video com video_status erro para publicado → regra_negocio (R11) + sem update", async () => {
    const material = criarMaterialFake({ tipo: "video", video_status: "erro" });
    const { db, update } = criarDbFake({ material });

    const erro = await atualizarMaterial("mat-fake-1", { status: "publicado" }, { db }).catch(
      (e: unknown) => e,
    );

    expect(erro).toMatchObject({
      code: "regra_negocio",
      mensagem: "o vídeo precisa ser processado com sucesso para publicar",
    });
    expect(update).not.toHaveBeenCalled();
  });
});

describe("publicarMaterial (US-09 + R11)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rascunho→publicado: update com status publicado e publicado_em = now (Date)", async () => {
    const material = criarMaterialFake({ status: "rascunho" });
    const { db, update } = criarDbFake({ material });

    await publicarMaterial("mat-fake-1", { db });

    const data = update.mock.calls[0][0].data;
    expect(data.status).toBe("publicado");
    expect(data.publicado_em).toBeInstanceOf(Date);
    expect(update).toHaveBeenCalledWith({
      where: { id: "mat-fake-1" },
      data,
    });
  });

  it("já publicado → no-op (update não é chamado)", async () => {
    const material = criarMaterialFake({ status: "publicado", publicado_em: new Date("2026-08-01T10:00:00Z") });
    const { db, update } = criarDbFake({ material });

    const resultado = await publicarMaterial("mat-fake-1", { db });

    expect(resultado).toBe(material);
    expect(update).not.toHaveBeenCalled();
  });

  it("R11: video com video_status erro → regra_negocio, status inalterado (sem update)", async () => {
    const material = criarMaterialFake({ tipo: "video", video_status: "erro", status: "rascunho" });
    const { db, update } = criarDbFake({ material });

    const erro = await publicarMaterial("mat-fake-1", { db }).catch((e: unknown) => e);

    expect(erro).toBeInstanceOf(ErroConteudo);
    expect(erro).toMatchObject({
      code: "regra_negocio",
      mensagem: "o vídeo precisa ser processado com sucesso para publicar",
    });
    expect(update).not.toHaveBeenCalled();
  });

  it("video com video_status pronto → publica ok", async () => {
    const material = criarMaterialFake({ tipo: "video", video_status: "pronto", status: "rascunho" });
    const { db, update } = criarDbFake({ material });

    await publicarMaterial("mat-fake-1", { db });

    expect(update).toHaveBeenCalledTimes(1);
    expect(update.mock.calls[0][0].data.status).toBe("publicado");
  });

  it("material inexistente → nao_encontrado", async () => {
    const { db } = criarDbFake({ material: null });

    await expect(publicarMaterial("mat-nada", { db })).rejects.toMatchObject({
      code: "nao_encontrado",
    });
  });
});

describe("despublicarMaterial (R5)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("publicado→rascunho imediato; publicado_em é MANTIDO (histórico)", async () => {
    const publicadoEm = new Date("2026-08-10T09:00:00Z");
    const material = criarMaterialFake({ status: "publicado", publicado_em: publicadoEm });
    const { db, update } = criarDbFake({ material });

    await despublicarMaterial("mat-fake-1", { db });

    // Update data: apenas status → rascunho; publicado_em NÃO aparece (fica no banco).
    expect(update).toHaveBeenCalledWith({
      where: { id: "mat-fake-1" },
      data: { status: "rascunho" },
    });
  });

  it("já rascunho → no-op (update não é chamado)", async () => {
    const material = criarMaterialFake({ status: "rascunho" });
    const { db, update } = criarDbFake({ material });

    const resultado = await despublicarMaterial("mat-fake-1", { db });

    expect(resultado).toBe(material);
    expect(update).not.toHaveBeenCalled();
  });

  it("material inexistente → nao_encontrado", async () => {
    const { db } = criarDbFake({ material: null });

    await expect(despublicarMaterial("mat-nada", { db })).rejects.toMatchObject({
      code: "nao_encontrado",
    });
  });
});

describe("getters e listagem (R6)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("listarMateriais filtra pelo módulo e ordena por ordem crescente", async () => {
    const lista = [
      criarMaterialFake({ id: "m1", ordem: 1 }),
      criarMaterialFake({ id: "m2", ordem: 2 }),
    ];
    const { db, findMany } = criarDbFake({ lista });

    const materiais = await listarMateriais("mod-fake-1", { db });

    expect(findMany).toHaveBeenCalledWith({
      where: { module_id: "mod-fake-1" },
      orderBy: { ordem: "asc" },
    });
    expect(materiais).toHaveLength(2);
  });

  it("obterMaterial retorna o material", async () => {
    const material = criarMaterialFake();
    const { db, materialsFindUnique } = criarDbFake({ material });

    const resultado = await obterMaterial("mat-fake-1", { db });

    expect(materialsFindUnique).toHaveBeenCalledWith({ where: { id: "mat-fake-1" } });
    expect(resultado).toBe(material);
  });

  it("obterMaterial retorna null quando o material não existe (getter)", async () => {
    const { db } = criarDbFake({ material: null });

    const resultado = await obterMaterial("mat-nada", { db });

    expect(resultado).toBeNull();
  });
});
