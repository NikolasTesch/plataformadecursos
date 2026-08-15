// Testes unitários do serviço de módulos — US-04 (SPEC-conteudo §3.2).
//
// TDD (todo 3 do plano s2-conteudo): testes escritos ANTES da implementação.
// Cobertura: ordem default = max+1 (1-based, alinhado ao seed — seed cria
// módulo "Introdução" com ordem 1), rename-only, reordenação ATÔMICA via
// `$transaction` (2 fases para não violar o @@unique([course_id, ordem]) em
// swaps), id estranho → erro sem updates, exclusão com cascata de materiais
// (garantida pelo banco — materials.modulo onDelete: Cascade) e listagem
// ordenada por ordem.
//
// Convenção de erros (espelho do ErroAuth, D27): falhas lançam `ErroConteudo`
// com code discriminante ("validacao" | "nao_encontrado") + mensagem pt-BR.
import { describe, expect, it, vi, beforeEach } from "vitest";
import type { modules } from "@/generated/prisma/client";

vi.mock("@/lib/db", () => ({
  db: {
    modules: {
      aggregate: vi.fn(),
      create: vi.fn(),
      findUnique: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}));

import {
  criarModulo,
  atualizarModulo,
  reordenarModulos,
  excluirModulo,
  listarModulos,
  type DbModulos,
  type DbModulosTx,
} from "@/services/conteudo/modulos";
import { ErroConteudo } from "@/services/conteudo/erros";

// Mensagens canônicas — espelham as constantes locais do serviço (modulos.ts).
const MENSAGENS_MODULOS = {
  nomeObrigatorio: "informe o nome do módulo",
  nomeMaximo: "o nome do módulo deve ter no máximo 120 caracteres",
  cursoObrigatorio: "informe o curso do módulo",
  ordemDuplicada: "já existe um módulo com esta ordem neste curso",
  cursoInexistente: "curso não encontrado",
  moduloInexistente: "módulo não encontrado",
  idsDuplicados: "a lista de reordenação não pode conter módulos duplicados",
  idForaDoCurso:
    "a lista de reordenação contém um módulo que não pertence a este curso",
  listaIncompleta:
    "a lista de reordenação deve conter todos os módulos do curso",
} as const;

/** Módulo fake com TODOS os campos do model `modules` (necessário p/ o tipo). */
function criarModuloFake(overrides: Partial<modules> = {}): modules {
  return {
    id: "modulo-uuid-1",
    course_id: "curso-uuid-1",
    nome: "Introdução",
    ordem: 1,
    ...overrides,
  };
}

/** Fake do db de módulos — todos os métodos espiados, resultados configuráveis. */
function criarDbFake(modulosDoCurso: modules[] = []) {
  // Sem auto-referência no próprio inicializador (evita TS7022): o fake base
  // carrega só o delegate `modules`; `$transaction` o recebe como "tx" (o
  // callback da transação só usa `tx.modules` — ver DbModulosTx).
  const dbSemTransacao = {
    modules: {
      aggregate: vi.fn<DbModulos["modules"]["aggregate"]>(async () => ({
        _max: { ordem: null },
      })),
      create: vi.fn<DbModulos["modules"]["create"]>(),
      findUnique: vi.fn<DbModulos["modules"]["findUnique"]>(async () => null),
      findMany: vi.fn<DbModulos["modules"]["findMany"]>(
        async () => modulosDoCurso,
      ),
      update: vi.fn<DbModulos["modules"]["update"]>(),
      delete: vi.fn<DbModulos["modules"]["delete"]>(),
    },
  };
  const db = {
    ...dbSemTransacao,
    // $transaction interativo: executa o callback recebendo o fake como "tx"
    // (mesmo padrão do Prisma: `db.$transaction(fn => ...)`).
    $transaction: vi.fn<DbModulos["$transaction"]>(
      async (fn: (tx: DbModulosTx) => Promise<unknown>) =>
        fn(dbSemTransacao as DbModulosTx),
    ),
  };
  return db;
}

describe("módulos (US-04, SPEC-conteudo §3.2)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("criarModulo — ordem default = último+1", () => {
    it("curso com módulos de ordem 1 e 2 → novo módulo recebe ordem 3", async () => {
      const db = criarDbFake();
      db.modules.aggregate.mockResolvedValue({ _max: { ordem: 2 } });
      db.modules.create.mockResolvedValue(
        criarModuloFake({ id: "mod-novo", nome: "Aprofundamento", ordem: 3 }),
      );

      const resultado = await criarModulo(
        { curso_id: "curso-uuid-1", nome: "  Aprofundamento  " },
        { db },
      );

      // Prova de que a ordem deriva do max existente no curso (1-based, seed).
      expect(db.modules.aggregate).toHaveBeenCalledWith({
        where: { course_id: "curso-uuid-1" },
        _max: { ordem: true },
      });
      expect(db.modules.create).toHaveBeenCalledWith({
        data: { course_id: "curso-uuid-1", nome: "Aprofundamento", ordem: 3 },
      });
      expect(resultado.ordem).toBe(3);
    });

    it("curso sem módulos → primeiro módulo recebe ordem 1", async () => {
      const db = criarDbFake();
      db.modules.aggregate.mockResolvedValue({ _max: { ordem: null } });
      db.modules.create.mockResolvedValue(criarModuloFake({ ordem: 1 }));

      await criarModulo({ curso_id: "curso-uuid-1", nome: "Introdução" }, { db });

      expect(db.modules.create).toHaveBeenCalledWith({
        data: { course_id: "curso-uuid-1", nome: "Introdução", ordem: 1 },
      });
    });

    it("nome obrigatório → erro validacao (campo nome) e create NÃO chamado", async () => {
      const db = criarDbFake();

      const erro = await criarModulo(
        { curso_id: "curso-uuid-1", nome: "   " },
        { db },
      ).catch((e: unknown) => e);

      expect(erro).toBeInstanceOf(ErroConteudo);
      expect(erro).toMatchObject({
        code: "validacao",
        campo: "nome",
        mensagem: MENSAGENS_MODULOS.nomeObrigatorio,
      });
      expect(db.modules.aggregate).not.toHaveBeenCalled();
      expect(db.modules.create).not.toHaveBeenCalled();
    });

    it("curso_id obrigatório → erro validacao (campo curso_id)", async () => {
      const db = criarDbFake();

      const erro = await criarModulo(
        { curso_id: "", nome: "Introdução" },
        { db },
      ).catch((e: unknown) => e);

      expect(erro).toMatchObject({
        code: "validacao",
        campo: "curso_id",
        mensagem: MENSAGENS_MODULOS.cursoObrigatorio,
      });
      expect(db.modules.create).not.toHaveBeenCalled();
    });

    it("duplicata (course_id, ordem) por corrida → erro validacao amigável", async () => {
      const db = criarDbFake();
      db.modules.aggregate.mockResolvedValue({ _max: { ordem: 2 } });
      // O banco rejeita com P2002 (unique @@unique([course_id, ordem])).
      db.modules.create.mockRejectedValue({ code: "P2002" });

      await expect(
        criarModulo({ curso_id: "curso-uuid-1", nome: "Colisão" }, { db }),
      ).rejects.toMatchObject({
        code: "validacao",
        campo: "ordem",
        mensagem: MENSAGENS_MODULOS.ordemDuplicada,
      });
    });

    it("curso inexistente (FK P2003) → erro validacao 'curso não encontrado'", async () => {
      const db = criarDbFake();
      db.modules.aggregate.mockResolvedValue({ _max: { ordem: null } });
      db.modules.create.mockRejectedValue({ code: "P2003" });

      await expect(
        criarModulo({ curso_id: "curso-inexistente", nome: "Órfão" }, { db }),
      ).rejects.toMatchObject({
        code: "validacao",
        campo: "curso_id",
        mensagem: MENSAGENS_MODULOS.cursoInexistente,
      });
    });
  });

  describe("atualizarModulo — rename-only (ordem muda via reorder)", () => {
    it("renomeia o módulo", async () => {
      const db = criarDbFake();
      const existente = criarModuloFake({ id: "mod-a", nome: "Antigo" });
      db.modules.findUnique.mockResolvedValue(existente);
      db.modules.update.mockResolvedValue({ ...existente, nome: "Novo nome" });

      const resultado = await atualizarModulo(
        "mod-a",
        { nome: "  Novo nome  " },
        { db },
      );

      expect(db.modules.findUnique).toHaveBeenCalledWith({
        where: { id: "mod-a" },
      });
      expect(db.modules.update).toHaveBeenCalledWith({
        where: { id: "mod-a" },
        data: { nome: "Novo nome" },
      });
      expect(resultado.nome).toBe("Novo nome");
    });

    it("módulo inexistente → nao_encontrado e update NÃO chamado", async () => {
      const db = criarDbFake();

      const erro = await atualizarModulo(
        "mod-que-nao-existe",
        { nome: "X" },
        { db },
      ).catch((e: unknown) => e);

      expect(erro).toMatchObject({
        code: "nao_encontrado",
        mensagem: MENSAGENS_MODULOS.moduloInexistente,
      });
      expect(db.modules.update).not.toHaveBeenCalled();
    });

    it("nome vazio → erro validacao e update NÃO chamado", async () => {
      const db = criarDbFake();
      db.modules.findUnique.mockResolvedValue(criarModuloFake({ id: "mod-a" }));

      const erro = await atualizarModulo("mod-a", { nome: " " }, { db }).catch(
        (e: unknown) => e,
      );

      expect(erro).toMatchObject({
        code: "validacao",
        campo: "nome",
        mensagem: MENSAGENS_MODULOS.nomeObrigatorio,
      });
      expect(db.modules.update).not.toHaveBeenCalled();
    });

    it("nome ausente → no-op: retorna o módulo atual SEM chamar update", async () => {
      const db = criarDbFake();
      const existente = criarModuloFake({ id: "mod-a", nome: "Sem mudança" });
      db.modules.findUnique.mockResolvedValue(existente);

      const resultado = await atualizarModulo("mod-a", {}, { db });

      expect(resultado).toEqual(existente);
      expect(db.modules.update).not.toHaveBeenCalled();
    });
  });

  describe("reordenarModulos — atômico via $transaction", () => {
    it("troca a ordem dos módulos DENTRO de uma única transação (2 fases p/ não violar o unique)", async () => {
      const modA = criarModuloFake({ id: "mod-a", nome: "A", ordem: 1 });
      const modB = criarModuloFake({ id: "mod-b", nome: "B", ordem: 2 });
      const db = criarDbFake([modA, modB]);
      db.modules.update.mockImplementation(async ({ where, data }) =>
        criarModuloFake({
          id: where.id,
          nome: where.id === "mod-a" ? "A" : "B",
          ordem: data.ordem ?? 0,
        }),
      );

      await reordenarModulos("curso-uuid-1", ["mod-b", "mod-a"], { db });

      // A transação É a garantia de atomicidade (rollback total em falha).
      expect(db.$transaction).toHaveBeenCalledTimes(1);

      // Fase 1: ordens temporárias NEGATIVAS únicas (libera os valores-alvo
      // sem colidir com o @@unique([course_id, ordem]) durante o swap).
      const temporarias = db.modules.update.mock.calls.filter(
        ([args]) => args.data.ordem !== undefined && args.data.ordem < 0,
      );
      expect(temporarias).toHaveLength(2);
      expect(temporarias).toContainEqual([
        { where: { id: "mod-b" }, data: { ordem: -1 } },
      ]);
      expect(temporarias).toContainEqual([
        { where: { id: "mod-a" }, data: { ordem: -2 } },
      ]);

      // Fase 2: ordens finais = posição na lista (index + 1).
      const finais = db.modules.update.mock.calls.filter(
        ([args]) => args.data.ordem !== undefined && args.data.ordem > 0,
      );
      expect(finais).toHaveLength(2);
      expect(finais).toContainEqual([
        { where: { id: "mod-b" }, data: { ordem: 1 } },
      ]);
      expect(finais).toContainEqual([
        { where: { id: "mod-a" }, data: { ordem: 2 } },
      ]);
    });

    it("id de outro curso → erro validacao, $transaction NÃO chamado e zero updates", async () => {
      const modA = criarModuloFake({ id: "mod-a", nome: "A", ordem: 1 });
      const modB = criarModuloFake({ id: "mod-b", nome: "B", ordem: 2 });
      const db = criarDbFake([modA, modB]);

      await expect(
        reordenarModulos("curso-uuid-1", ["mod-a", "id-estranho"], { db }),
      ).rejects.toMatchObject({
        code: "validacao",
        campo: "ordemIds",
        mensagem: MENSAGENS_MODULOS.idForaDoCurso,
      });

      expect(db.$transaction).not.toHaveBeenCalled();
      expect(db.modules.update).not.toHaveBeenCalled();
    });

    it("lista incompleta (faltou módulo do curso) → erro, sem updates", async () => {
      const modA = criarModuloFake({ id: "mod-a", nome: "A", ordem: 1 });
      const modB = criarModuloFake({ id: "mod-b", nome: "B", ordem: 2 });
      const db = criarDbFake([modA, modB]);

      await expect(
        reordenarModulos("curso-uuid-1", ["mod-b"], { db }),
      ).rejects.toMatchObject({
        code: "validacao",
        campo: "ordemIds",
        mensagem: MENSAGENS_MODULOS.listaIncompleta,
      });
      expect(db.$transaction).not.toHaveBeenCalled();
      expect(db.modules.update).not.toHaveBeenCalled();
    });

    it("ids duplicados → erro, sem updates", async () => {
      const modA = criarModuloFake({ id: "mod-a", nome: "A", ordem: 1 });
      const db = criarDbFake([modA]);

      await expect(
        reordenarModulos("curso-uuid-1", ["mod-a", "mod-a"], { db }),
      ).rejects.toMatchObject({
        code: "validacao",
        campo: "ordemIds",
        mensagem: MENSAGENS_MODULOS.idsDuplicados,
      });
      expect(db.$transaction).not.toHaveBeenCalled();
      expect(db.modules.update).not.toHaveBeenCalled();
    });
  });

  describe("excluirModulo — materiais em cascata pelo banco", () => {
    it("exclui o módulo (materiais são removidos via onDelete: Cascade)", async () => {
      const db = criarDbFake();
      const existente = criarModuloFake({ id: "mod-a" });
      db.modules.findUnique.mockResolvedValue(existente);
      db.modules.delete.mockResolvedValue(existente);

      await excluirModulo("mod-a", { db });

      expect(db.modules.findUnique).toHaveBeenCalledWith({
        where: { id: "mod-a" },
      });
      // A cascata é do banco (prisma/schema.prisma:166 — materials.modulo
      // onDelete: Cascade): o serviço só precisa do delete do módulo.
      expect(db.modules.delete).toHaveBeenCalledWith({ where: { id: "mod-a" } });
    });

    it("módulo inexistente → nao_encontrado e delete NÃO chamado", async () => {
      const db = criarDbFake();

      const erro = await excluirModulo("mod-que-nao-existe", { db }).catch(
        (e: unknown) => e,
      );

      expect(erro).toMatchObject({
        code: "nao_encontrado",
        mensagem: MENSAGENS_MODULOS.moduloInexistente,
      });
      expect(db.modules.delete).not.toHaveBeenCalled();
    });
  });

  describe("listarModulos", () => {
    it("lista os módulos do curso ordenados por ordem (asc)", async () => {
      const db = criarDbFake([
        criarModuloFake({ id: "mod-1", ordem: 1 }),
        criarModuloFake({ id: "mod-2", ordem: 2 }),
        criarModuloFake({ id: "mod-3", ordem: 3 }),
      ]);

      const lista = await listarModulos("curso-uuid-1", { db });

      expect(db.modules.findMany).toHaveBeenCalledWith({
        where: { course_id: "curso-uuid-1" },
        orderBy: { ordem: "asc" },
      });
      expect(lista).toHaveLength(3);
      expect(lista.map((m) => m.ordem)).toEqual([1, 2, 3]);
    });
  });
});
