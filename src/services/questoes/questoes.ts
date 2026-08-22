// CRUD administrativo de questões — S4.1 (D-S4-1..4).
import { db as dbPadrao } from "@/lib/db";
import { sanitizarHtml } from "@/lib/sanitize";
import type { Prisma, questions } from "@/generated/prisma/client";
import { ErroConteudo, erroValidacao } from "@/services/conteudo/erros";

export interface AlternativaQuestao { letra: "A" | "B" | "C" | "D" | "E"; texto: string }
export interface DadosQuestao { material_id: string; enunciado: string; alternativas: AlternativaQuestao[]; gabarito: string; comentario_html?: string | null; ordem?: number }
export interface DbQuestoes {
  materials: { findUnique: (args: { where: { id: string } }) => Promise<{ tipo: string } | null> };
  questions: {
    findUnique: (args: { where: { id: string } }) => Promise<questions | null>;
    findMany: (args: { where: { material_id: string }; orderBy: { ordem: "asc" } }) => Promise<questions[]>;
    create: (args: { data: DadosPersistencia }) => Promise<questions>;
    update: (args: { where: { id: string }; data: Partial<DadosPersistencia> }) => Promise<questions>;
    delete: (args: { where: { id: string } }) => Promise<questions>;
    aggregate: (args: { where: { material_id: string }; _max: { ordem: true } }) => Promise<{ _max: { ordem: number | null } }>;
  };
}
export interface DepsQuestoes { db?: DbQuestoes }

const LETRAS = ["A", "B", "C", "D", "E"] as const;
type DadosPersistencia = Omit<questions, "id" | "alternativas"> & { alternativas: Prisma.InputJsonValue };

function texto(campo: string, valor: unknown): string {
  const resultado = typeof valor === "string" ? valor.trim() : "";
  if (!resultado) throw erroValidacao(campo, "o enunciado é obrigatório");
  return resultado;
}

function alternativas(valor: unknown): AlternativaQuestao[] {
  if (!Array.isArray(valor) || (valor.length !== 4 && valor.length !== 5)) throw erroValidacao("alternativas", "informe 4 ou 5 alternativas");
  return valor.map((item: unknown, indice: number) => {
    if (typeof item !== "object" || item === null) throw erroValidacao("alternativas", "alternativa inválida");
    const registro = item as { letra?: unknown; texto?: unknown };
    const letra = LETRAS[indice];
    if (registro.letra !== letra) throw erroValidacao("alternativas", "as alternativas devem estar em ordem A–E");
    const textoAlternativa = typeof registro.texto === "string" ? registro.texto.trim() : "";
    if (!textoAlternativa) throw erroValidacao("alternativas", `a alternativa ${letra} é obrigatória`);
    return { letra, texto: textoAlternativa };
  });
}

function ordem(valor: unknown): number | undefined {
  if (valor === undefined) return undefined;
  if (typeof valor !== "number" || !Number.isInteger(valor) || valor < 1) throw erroValidacao("ordem", "a ordem deve ser um número inteiro positivo");
  return valor;
}

function preparar(dados: Omit<DadosQuestao, "material_id" | "ordem">): Omit<DadosPersistencia, "material_id" | "ordem"> {
  const lista = alternativas(dados.alternativas);
  const gabarito = typeof dados.gabarito === "string" ? dados.gabarito.trim() : "";
  if (!LETRAS.includes(gabarito as (typeof LETRAS)[number]) || (gabarito === "E" && lista.length !== 5)) throw erroValidacao("gabarito", "informe exatamente um gabarito entre as alternativas");
  return { enunciado: texto("enunciado", dados.enunciado), alternativas: lista as unknown as Prisma.InputJsonValue, gabarito, comentario_html: dados.comentario_html?.trim() ? sanitizarHtml(dados.comentario_html) : null };
}

async function validarMaterial(db: DbQuestoes, id: string): Promise<void> {
  const material = await db.materials.findUnique({ where: { id } });
  if (!material) throw new ErroConteudo({ code: "nao_encontrado", mensagem: "material não encontrado" });
  if (material.tipo !== "questoes") throw erroValidacao("material_id", "a questão deve pertencer a um material do tipo questoes");
}

export async function listarQuestoes(material_id: string, deps: DepsQuestoes = {}): Promise<questions[]> {
  const db = deps.db ?? dbPadrao; await validarMaterial(db, material_id);
  return db.questions.findMany({ where: { material_id }, orderBy: { ordem: "asc" } });
}

export async function criarQuestao(dados: DadosQuestao, deps: DepsQuestoes = {}): Promise<questions> {
  const db = deps.db ?? dbPadrao; await validarMaterial(db, dados.material_id);
  const preparado = preparar(dados); const informada = ordem(dados.ordem);
  const proxima = informada ?? ((await db.questions.aggregate({ where: { material_id: dados.material_id }, _max: { ordem: true } }))._max?.ordem ?? 0) + 1;
  return db.questions.create({ data: { ...preparado, material_id: dados.material_id, ordem: proxima } });
}

export async function atualizarQuestao(id: string, dados: Omit<DadosQuestao, "material_id">, deps: DepsQuestoes = {}): Promise<questions> {
  const db = deps.db ?? dbPadrao; const atual = await db.questions.findUnique({ where: { id } });
  if (!atual) throw new ErroConteudo({ code: "nao_encontrado", mensagem: "questão não encontrada" });
  const preparado = preparar(dados); const informada = ordem(dados.ordem);
  return db.questions.update({ where: { id }, data: { ...preparado, ...(informada === undefined ? {} : { ordem: informada }) } });
}

export async function excluirQuestao(id: string, deps: DepsQuestoes = {}): Promise<questions> {
  const db = deps.db ?? dbPadrao; const atual = await db.questions.findUnique({ where: { id } });
  if (!atual) throw new ErroConteudo({ code: "nao_encontrado", mensagem: "questão não encontrada" });
  return db.questions.delete({ where: { id } });
}
