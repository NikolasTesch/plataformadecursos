// Serviço de materiais — US-05/06/09/40 (SPEC-conteudo §3.3-3.6).
//
// CRUD de materiais por tipo: `pdf` (arquivo_key após upload — C3), `texto`/
// `resumo` (conteudo_html), `video` (video_provider_id + video_status, apenas
// estrutura — comportamento de vídeo é S5) e `questoes` (placeholder estrutural
// — comportamento é S4). Campos comuns: titulo (obrigatório), `ordem` (default
// = max+1 dentro do módulo, mesmo padrão de módulos), `status`
// (rascunho|publicado), `amostra` (máx. 1 por curso — C2).
//
// Publicação (US-09): rascunho→publicado registra `publicado_em = now`; já
// publicado → no-op idempotente. R11: material `video` com video_status `erro`
// NÃO pode ser publicado. Despublicar (R5): efeito imediato — status → rascunho;
// `publicado_em` é MANTIDO (histórico) e um novo publicar o atualiza de novo.
//
// `conteudo_busca` (migration S2 todo 1, schema.prisma): texto puro lowercased
// para ILIKE — titulo + corpo para texto/resumo; só titulo para pdf (o texto
// extraído do PDF é anexado pelo todo 11 após o upload); NULL para video/
// questoes (sem corpo pesquisável). Populado aqui, nunca pelo cliente.
//
// Dependência de banco INJETÁVEL: produção chama sem `deps` (singleton @/lib/db);
// testes injetam fake tipado via `deps.db` (padrão D29 de src/services/auth).
import { db as dbPadrao } from "@/lib/db";
import type {
  materials,
  MaterialStatus,
  MaterialTipo,
  modules,
  VideoStatus,
} from "@/generated/prisma/client";

import { ErroConteudo, erroValidacao } from "./erros";
import { invalidarPorCurso } from "@/services/gating";

export interface DbMateriais {
  modules: {
    findUnique: (args: { where: { id: string } }) => Promise<modules | null>;
  };
  materials: {
    findUnique: (args: { where: { id: string } }) => Promise<materials | null>;
    findMany: (args: {
      where: { module_id: string };
      orderBy: { ordem: "asc" };
    }) => Promise<materials[]>;
    create: (args: {
      data: {
        module_id: string;
        titulo: string;
        tipo: MaterialTipo;
        ordem: number;
        status: MaterialStatus;
        publicado_em: Date | null;
        amostra: boolean;
        conteudo_html: string | null;
        arquivo_key: string | null;
        video_provider_id: string | null;
        video_status: VideoStatus | null;
        conteudo_busca: string | null;
      };
    }) => Promise<materials>;
    update: (args: {
      where: { id: string };
      data: {
        titulo?: string;
        tipo?: MaterialTipo;
        ordem?: number;
        status?: MaterialStatus;
        publicado_em?: Date | null;
        amostra?: boolean;
        conteudo_html?: string | null;
        arquivo_key?: string | null;
        video_provider_id?: string | null;
        video_status?: VideoStatus | null;
        conteudo_busca?: string | null;
      };
    }) => Promise<materials>;
    count: (args: {
      where: {
        amostra: true;
        modulo: { course_id: string };
        id?: { not: string };
      };
    }) => Promise<number>;
    aggregate: (args: {
      where: { module_id: string };
      _max: { ordem: true };
    }) => Promise<{ _max: { ordem: number | null } }>;
  };
}

export interface DadosCriarMaterial {
  module_id: string;
  titulo: string;
  tipo: MaterialTipo;
  ordem?: number;
  status?: MaterialStatus;
  amostra?: boolean;
  conteudo_html?: string;
  arquivo_key?: string;
  video_provider_id?: string;
  video_status?: VideoStatus;
}

export interface DadosAtualizarMaterial {
  titulo?: string;
  tipo?: MaterialTipo;
  ordem?: number;
  status?: MaterialStatus;
  amostra?: boolean;
  conteudo_html?: string;
  arquivo_key?: string;
  video_provider_id?: string;
  video_status?: VideoStatus;
}

export interface DepsMateriais {
  db?: DbMateriais;
}

const TIPOS_MATERIAL: ReadonlySet<string> = new Set([
  "pdf",
  "texto",
  "video",
  "questoes",
  "resumo",
]);
const STATUS_MATERIAL: ReadonlySet<string> = new Set(["rascunho", "publicado"]);
const VALORES_VIDEO_STATUS: ReadonlySet<string> = new Set([
  "processando",
  "pronto",
  "erro",
]);

function validarModuleId(module_id: unknown): string {
  const limpo = typeof module_id === "string" ? module_id.trim() : "";
  if (limpo === "") {
    throw erroValidacao("module_id", "informe o módulo do material");
  }
  return limpo;
}

function validarTitulo(titulo: unknown): string {
  const limpo = typeof titulo === "string" ? titulo.trim() : "";
  if (limpo === "") {
    throw erroValidacao("titulo", "o título é obrigatório");
  }
  if (limpo.length > 200) {
    throw erroValidacao("titulo", "o título deve ter no máximo 200 caracteres");
  }
  return limpo;
}

function validarTipo(tipo: unknown): MaterialTipo {
  if (typeof tipo !== "string" || !TIPOS_MATERIAL.has(tipo)) {
    throw erroValidacao(
      "tipo",
      "informe um tipo válido de material (pdf, texto, video, questoes ou resumo)",
    );
  }
  return tipo as MaterialTipo;
}

function validarStatus(status: unknown): MaterialStatus | undefined {
  if (status === undefined) return undefined;
  if (typeof status !== "string" || !STATUS_MATERIAL.has(status)) {
    throw erroValidacao("status", "informe um status válido (rascunho ou publicado)");
  }
  return status as MaterialStatus;
}

function validarVideoStatus(video_status: unknown): VideoStatus | undefined {
  if (video_status === undefined) return undefined;
  if (typeof video_status !== "string" || !VALORES_VIDEO_STATUS.has(video_status)) {
    throw erroValidacao(
      "video_status",
      "informe um status de vídeo válido (processando, pronto ou erro)",
    );
  }
  return video_status as VideoStatus;
}

function validarOrdem(ordem: unknown): number | undefined {
  if (ordem === undefined) return undefined;
  if (typeof ordem !== "number" || !Number.isInteger(ordem) || ordem < 1) {
    throw erroValidacao("ordem", "a ordem deve ser um número inteiro positivo");
  }
  return ordem;
}

/**
 * Validação ESTRUTURAL por tipo (SPEC-conteudo §3.3-3.5, plano S2 todo 4):
 * pdf exige `arquivo_key`; texto/resumo exige `conteudo_html`; video exige
 * `video_provider_id` + `video_status`. `questoes` é placeholder (nenhum campo
 * obrigatório — comportamento é S4). Campo `undefined` = não informado.
 */
function validarEstruturaTipo(
  tipo: MaterialTipo,
  dados: {
    arquivo_key?: unknown;
    conteudo_html?: unknown;
    video_provider_id?: unknown;
    video_status?: unknown;
  },
): void {
  if (tipo === "pdf" && dados.arquivo_key === undefined) {
    throw erroValidacao("arquivo_key", "material PDF exige a chave do arquivo no storage");
  }
  if ((tipo === "texto" || tipo === "resumo") && dados.conteudo_html === undefined) {
    throw erroValidacao("conteudo_html", `material ${tipo} exige o conteúdo HTML`);
  }
  if (tipo === "video") {
    if (dados.video_provider_id === undefined) {
      throw erroValidacao("video_provider_id", "material de vídeo exige o id do vídeo no Bunny Stream");
    }
    if (dados.video_status === undefined) {
      throw erroValidacao("video_status", "material de vídeo exige o status do vídeo");
    }
  }
}

/**
 * R11 (SPEC-conteudo §3.6/:75): material `video` com video_status `erro` não
 * pode ser publicado — erro amigável e nenhuma transição de status.
 */
function verificarVideoPublicavel(
  tipo: MaterialTipo,
  video_status: VideoStatus | null | undefined,
): void {
  if (tipo === "video" && video_status === "erro") {
    throw new ErroConteudo({
      code: "regra_negocio",
      campo: "video_status",
      mensagem: "o vídeo precisa ser processado com sucesso para publicar",
    });
  }
}

/** Remove tags HTML e colapsa espaços — texto puro para a busca. */
function extrairTextoPlano(html: string): string {
  return html
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * `conteudo_busca` (schema.prisma): titulo + corpo lowercased para texto/resumo;
 * só titulo para pdf (todo 11 anexa o texto extraído após o upload); NULL para
 * video/questoes (sem corpo pesquisável).
 */
function montarConteudoBusca(
  titulo: string,
  tipo: MaterialTipo,
  conteudo_html: string | null | undefined,
): string | null {
  if (tipo === "video" || tipo === "questoes") return null;
  const corpo = typeof conteudo_html === "string" ? extrairTextoPlano(conteudo_html) : "";
  return [titulo, corpo].filter((parte) => parte.length > 0).join(" ").toLowerCase();
}

function erroMaterialNaoEncontrado(): ErroConteudo {
  return new ErroConteudo({ code: "nao_encontrado", mensagem: "material não encontrado" });
}

function erroModuloNaoEncontrado(): ErroConteudo {
  return new ErroConteudo({ code: "nao_encontrado", mensagem: "módulo não encontrado" });
}

/**
 * C2 (SPEC-conteudo §4/:98): máx. 1 amostra por curso (R4). Conta amostras do
 * MESMO curso do material (join via módulo → course_id). `excluirId` evita que
 * a própria atualização conte a si mesma.
 */
async function verificarAmostraUnica(
  db: DbMateriais,
  course_id: string,
  excluirId?: string,
): Promise<void> {
  const where = {
    amostra: true as const,
    modulo: { course_id },
    ...(excluirId !== undefined ? { id: { not: excluirId } } : {}),
  };
  const amostras = await db.materials.count({ where });
  if (amostras > 0) {
    throw new ErroConteudo({
      code: "regra_negocio",
      campo: "amostra",
      mensagem: "já existe 1 material de amostra neste curso",
    });
  }
}

export async function criarMaterial(
  dados: DadosCriarMaterial,
  deps: DepsMateriais = {},
): Promise<materials> {
  // Anotação com a interface estreita: o PrismaClient real a satisfaz
  // estruturalmente (mesma nota da decisão D29) e evita a união com os tipos
  // amplos do Prisma no ponto de uso (ex.: `_max` nullable no aggregate).
  const db: DbMateriais = deps.db ?? dbPadrao;

  // 1. Validações puras (antes de tocar no banco).
  const module_id = validarModuleId(dados.module_id);
  const titulo = validarTitulo(dados.titulo);
  const tipo = validarTipo(dados.tipo);
  const status = validarStatus(dados.status) ?? "rascunho";
  const ordemInformada = validarOrdem(dados.ordem);
  const video_status = validarVideoStatus(dados.video_status);

  // 2. Estrutura do tipo (arquivo_key / conteudo_html / video_provider_id+video_status).
  validarEstruturaTipo(tipo, dados);

  // 3. R11 — criar já publicado também passa pelo guarda (publicado ⇒ publicado_em).
  if (status === "publicado") {
    verificarVideoPublicavel(tipo, video_status);
  }

  // 4. Módulo existe (FK + course_id para o C2).
  const modulo = await db.modules.findUnique({ where: { id: module_id } });
  if (!modulo) throw erroModuloNaoEncontrado();

  // 5. C2 — amostra única por curso (máx. 1; R4/C2, E2E-C1).
  if (dados.amostra === true) {
    await verificarAmostraUnica(db, modulo.course_id);
  }

  // 6. ordem default = max+1 dentro do módulo (mesmo padrão de módulos).
  let ordem = ordemInformada;
  if (ordem === undefined) {
    const { _max } = await db.materials.aggregate({
      where: { module_id },
      _max: { ordem: true },
    });
    ordem = (_max.ordem ?? 0) + 1;
  }

  // 7. `conteudo_busca` gerado no serviço (nunca pelo cliente).
  const conteudo_busca = montarConteudoBusca(titulo, tipo, dados.conteudo_html);

  return db.materials.create({
    data: {
      module_id,
      titulo,
      tipo,
      ordem,
      status,
      publicado_em: status === "publicado" ? new Date() : null,
      amostra: dados.amostra ?? false,
      conteudo_html: tipo === "texto" || tipo === "resumo" ? (dados.conteudo_html ?? null) : null,
      arquivo_key: tipo === "pdf" ? (dados.arquivo_key ?? null) : null,
      video_provider_id: tipo === "video" ? (dados.video_provider_id ?? null) : null,
      video_status: tipo === "video" ? (video_status ?? null) : null,
      conteudo_busca,
    },
  });
}

export async function atualizarMaterial(
  id: string,
  dados: DadosAtualizarMaterial,
  deps: DepsMateriais = {},
): Promise<materials> {
  // Anotação com a interface estreita: o PrismaClient real a satisfaz
  // estruturalmente (mesma nota da decisão D29) e evita a união com os tipos
  // amplos do Prisma no ponto de uso (ex.: `_max` nullable no aggregate).
  const db: DbMateriais = deps.db ?? dbPadrao;

  // 1. Validações puras (apenas campos informados).
  const titulo = dados.titulo !== undefined ? validarTitulo(dados.titulo) : undefined;
  const tipo = dados.tipo !== undefined ? validarTipo(dados.tipo) : undefined;
  const status = validarStatus(dados.status);
  const ordem = validarOrdem(dados.ordem);
  const video_status = validarVideoStatus(dados.video_status);

  // 2. Existência.
  const material = await db.materials.findUnique({ where: { id } });
  if (!material) throw erroMaterialNaoEncontrado();

  // 3. Nada a atualizar → no-op (retorna o material atual).
  if (Object.keys(dados).length === 0) return material;

  // 4. Tipo efetivo (novo ou atual) + estrutura quando o tipo MUDAR.
  const tipoFinal = tipo ?? material.tipo;
  if (tipo !== undefined) validarEstruturaTipo(tipo, dados);

  // 5. Transição de status no update — mesmas regras de publicar/despublicar:
  //    publicado ⇒ R11 + publicado_em = now; rascunho ⇒ publicado_em mantido.
  const virarPublicado = status === "publicado" && material.status !== "publicado";
  if (virarPublicado) {
    const videoStatusFinal =
      dados.video_status !== undefined ? video_status : material.video_status;
    verificarVideoPublicavel(tipoFinal, videoStatusFinal);
  }

  // 6. C2 — amostra única por curso (máx. 1; excluindo este material).
  if (dados.amostra === true) {
    const modulo = await db.modules.findUnique({ where: { id: material.module_id } });
    if (!modulo) throw erroModuloNaoEncontrado();
    await verificarAmostraUnica(db, modulo.course_id, id);
  }

  // 7. Monta o data — só campos informados; campos de corpo fora do tipo efetivo
  //    são ignorados (coerência do material).
  const data: NonNullable<Parameters<DbMateriais["materials"]["update"]>[0]>["data"] = {};
  if (titulo !== undefined) data.titulo = titulo;
  if (tipo !== undefined) data.tipo = tipo;
  if (ordem !== undefined) data.ordem = ordem;
  if (status !== undefined) data.status = status;
  if (virarPublicado) data.publicado_em = new Date();
  if (dados.amostra !== undefined) data.amostra = dados.amostra;

  if (dados.conteudo_html !== undefined && (tipoFinal === "texto" || tipoFinal === "resumo")) {
    data.conteudo_html = dados.conteudo_html;
  }
  if (dados.arquivo_key !== undefined && tipoFinal === "pdf") {
    data.arquivo_key = dados.arquivo_key;
  }
  if (dados.video_provider_id !== undefined && tipoFinal === "video") {
    data.video_provider_id = dados.video_provider_id;
  }
  if (video_status !== undefined && tipoFinal === "video") {
    data.video_status = video_status;
  }

  // 8. Busca recomputada quando o texto pesquisável muda (titulo/tipo/conteudo_html).
  if (titulo !== undefined || tipo !== undefined || dados.conteudo_html !== undefined) {
    const novoTitulo = titulo ?? material.titulo;
    const novoHtml =
      dados.conteudo_html !== undefined ? dados.conteudo_html : material.conteudo_html;
    data.conteudo_busca = montarConteudoBusca(novoTitulo, tipoFinal, novoHtml);
  }

  return db.materials.update({ where: { id }, data });
}

export async function publicarMaterial(
  id: string,
  deps: DepsMateriais = {},
): Promise<materials> {
  // Anotação com a interface estreita: o PrismaClient real a satisfaz
  // estruturalmente (mesma nota da decisão D29) e evita a união com os tipos
  // amplos do Prisma no ponto de uso (ex.: `_max` nullable no aggregate).
  const db: DbMateriais = deps.db ?? dbPadrao;

  const material = await db.materials.findUnique({ where: { id } });
  if (!material) throw erroMaterialNaoEncontrado();

  // Já publicado → no-op idempotente (decisão registrada no notepad s2-conteudo).
  if (material.status === "publicado") return material;

  // R11 (SPEC-conteudo §3.6/:75): vídeo com status `erro` não pode ser publicado.
  verificarVideoPublicavel(material.tipo, material.video_status);

  return db.materials.update({
    where: { id },
    data: {
      status: "publicado",
      publicado_em: new Date(),
    },
  });
}

export async function despublicarMaterial(
  id: string,
  deps: DepsMateriais = {},
): Promise<materials> {
  // Anotação com a interface estreita: o PrismaClient real a satisfaz
  // estruturalmente (mesma nota da decisão D29) e evita a união com os tipos
  // amplos do Prisma no ponto de uso (ex.: `_max` nullable no aggregate).
  const db: DbMateriais = deps.db ?? dbPadrao;

  const material = await db.materials.findUnique({ where: { id } });
  if (!material) throw erroMaterialNaoEncontrado();

  // Já rascunho → no-op idempotente.
  if (material.status === "rascunho") return material;

  // R5 (SPEC-conteudo §3.6/:74): efeito imediato — status → rascunho. publicado_em
  // é MANTIDO (histórico); um novo publicar o atualiza de novo.
  const atualizado = await db.materials.update({
    where: { id },
    data: { status: "rascunho" },
  });
  const modulo = await db.modules.findUnique({ where: { id: material.module_id } });
  if (modulo) invalidarPorCurso(modulo.course_id);
  return atualizado;
}

/** Lista materiais de um módulo ordenados por `ordem` crescente (R6). */
export async function listarMateriais(
  module_id: string,
  deps: DepsMateriais = {},
): Promise<materials[]> {
  // Anotação com a interface estreita: o PrismaClient real a satisfaz
  // estruturalmente (mesma nota da decisão D29) e evita a união com os tipos
  // amplos do Prisma no ponto de uso (ex.: `_max` nullable no aggregate).
  const db: DbMateriais = deps.db ?? dbPadrao;
  return db.materials.findMany({
    where: { module_id },
    orderBy: { ordem: "asc" },
  });
}

/** Obtém um material pelo id — getter: retorna null quando não existe. */
export async function obterMaterial(
  id: string,
  deps: DepsMateriais = {},
): Promise<materials | null> {
  // Anotação com a interface estreita: o PrismaClient real a satisfaz
  // estruturalmente (mesma nota da decisão D29) e evita a união com os tipos
  // amplos do Prisma no ponto de uso (ex.: `_max` nullable no aggregate).
  const db: DbMateriais = deps.db ?? dbPadrao;
  return db.materials.findUnique({ where: { id } });
}
