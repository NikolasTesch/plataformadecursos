// Serviço de cursos — US-03 (SPEC-conteudo §3.1).
//
// CRUD de cursos: criar (nome obrigatório 2–120, descrição/URL de imagem
// opcionais, slug AUTO-GERADO do nome com override manual, incluido_assinatura
// default false), atualizar (respeita C1 — slug imutável após o 1º material
// publicado), excluir (exige digitar o nome do curso; cascata módulos+materiais
// via banco — C6), listar e obter por slug (helpers das rotas / sales page).
//
// C1: o slug deixa de poder mudar quando o curso tem ≥1 material `publicado`.
// A checagem conta materiais pela relação modulo → course_id (US-03/:37-38 e
// regra C1 SPEC-conteudo §4/:97).
//
// C6: a exclusão em cascata (curso → módulos → materiais) é garantida pelo
// banco — `modules.course` e `materials.modulo` têm `onDelete: Cascade`
// (schema.prisma :119 e :166). O serviço apaga a linha do curso e deixa a
// cascata remover módulos/materiais; não há delete manual em transação.
//
// Imagem: aqui valida-se APENAS que `imagem_url` é uma URL http(s) válida. O
// limite de tamanho (≤2MB) é preocupação de ARQUIVO no upload — todo 5 do
// plano s2-conteudo (src/lib/storage) — documentado, não validado aqui.
//
// Dependência de banco INJETÁVEL: produção chama `criarCurso(dados)` (usa o
// singleton @/lib/db); testes injetam um fake tipado via `deps.db` (mesmo
// padrão de src/services/auth/registrar.ts, decisão D29).
import { db as dbPadrao } from "@/lib/db";
import type { courses } from "@/generated/prisma/client";

import { ErroConteudo, erroValidacao } from "./erros";

export interface DbCursos {
  courses: {
    findUnique: (args: {
      where: { id: string } | { slug: string };
    }) => Promise<courses | null>;
    findMany: (args?: {
      orderBy?: { criado_em?: "asc" | "desc" };
    }) => Promise<courses[]>;
    create: (args: {
      data: {
        nome: string;
        descricao: string | null;
        imagem_url: string | null;
        slug: string;
        incluido_assinatura: boolean;
      };
    }) => Promise<courses>;
    update: (args: {
      where: { id: string };
      data: {
        nome?: string;
        descricao?: string | null;
        imagem_url?: string | null;
        slug?: string;
        incluido_assinatura?: boolean;
      };
    }) => Promise<courses>;
    delete: (args: { where: { id: string } }) => Promise<courses>;
  };
  materials: {
    count: (args: {
      where: { modulo: { course_id: string }; status: "publicado" };
    }) => Promise<number>;
  };
}

export interface DadosCriarCurso {
  nome: string;
  descricao?: string | null;
  imagem_url?: string | null;
  /** Override manual do slug (auto-gerado do nome quando ausente). */
  slug?: string;
  incluido_assinatura?: boolean;
}

export interface DadosAtualizarCurso {
  nome?: string;
  descricao?: string | null;
  imagem_url?: string | null;
  slug?: string;
  incluido_assinatura?: boolean;
}

export interface DepsCursos {
  db?: DbCursos;
}

// Slug gerado: minúsculo, sem acentos (NFD), sequências de não-alfanuméricos
// viram um único hífen; hífens nas pontas removidos. Ex.: "Direito
// Constitucional" → "direito-constitucional" (mesma forma do seed "curso-demo").
export function gerarSlug(nome: string): string {
  return nome
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // remove acentos combinantes
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

// Slug manual aceito: apenas minúsculas, dígitos e hífens entre partes.
const SLUG_REGEX = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function validarNome(nome: unknown): string {
  const limpo = typeof nome === "string" ? nome.trim() : "";
  if (limpo.length < 2 || limpo.length > 120) {
    throw erroValidacao("nome", "o nome deve ter entre 2 e 120 caracteres");
  }
  return limpo;
}

/** Descrição opcional: undefined/null/em-branco → null (sem descrição). */
function normalizarTexto(valor: unknown): string | null {
  if (valor === undefined || valor === null) return null;
  const limpo = typeof valor === "string" ? valor.trim() : "";
  return limpo.length > 0 ? limpo : null;
}

/**
 * `imagem_url` opcional: valida APENAS que é uma URL http(s). O limite de
 * tamanho (≤2MB) é validado no upload do arquivo (todo 5 — src/lib/storage).
 */
function validarImagemUrl(valor: unknown): string | null {
  if (valor === undefined || valor === null) return null;
  if (typeof valor !== "string") {
    throw erroValidacao("imagem_url", "informe uma URL válida para a imagem");
  }
  const limpo = valor.trim();
  if (limpo === "") return null; // string vazia = limpar imagem
  let url: URL;
  try {
    url = new URL(limpo);
  } catch {
    throw erroValidacao("imagem_url", "informe uma URL válida para a imagem");
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw erroValidacao("imagem_url", "informe uma URL válida para a imagem");
  }
  return limpo;
}

/**
 * Slug manual (override): undefined = ausente (auto-gera); inválido lança.
 * Retorna o slug validado ou undefined quando não informado.
 */
function validarSlugManual(slug: unknown): string | undefined {
  if (slug === undefined) return undefined;
  if (typeof slug !== "string" || slug.trim() === "") {
    throw erroValidacao("slug", "informe um slug válido");
  }
  const limpo = slug.trim();
  if (!SLUG_REGEX.test(limpo)) {
    throw erroValidacao(
      "slug",
      "o slug deve conter apenas letras minúsculas, números e hífens",
    );
  }
  return limpo;
}

function erroSlugDuplicado(): ErroConteudo {
  return new ErroConteudo({
    code: "slug_duplicado",
    campo: "slug",
    mensagem: "este slug já está em uso",
  });
}

function erroCursoNaoEncontrado(): ErroConteudo {
  return new ErroConteudo({ code: "nao_encontrado", mensagem: "curso não encontrado" });
}

export async function criarCurso(
  dados: DadosCriarCurso,
  deps: DepsCursos = {},
): Promise<courses> {
  const db = deps.db ?? dbPadrao;

  // 1. Validações puras (antes de tocar no banco).
  const nome = validarNome(dados.nome);
  const descricao = normalizarTexto(dados.descricao);
  const imagem_url = validarImagemUrl(dados.imagem_url);
  const slugManual = validarSlugManual(dados.slug);
  const slug = slugManual ?? gerarSlug(nome);
  if (slug.length === 0) {
    throw erroValidacao(
      "slug",
      "não foi possível gerar um slug a partir do nome",
    );
  }

  // 2. Unicidade do slug — checada ANTES do create (erro amigável, sem tentar criar).
  const existente = await db.courses.findUnique({ where: { slug } });
  if (existente) throw erroSlugDuplicado();

  // 3. Create.
  return db.courses.create({
    data: {
      nome,
      descricao,
      imagem_url,
      slug,
      incluido_assinatura: dados.incluido_assinatura ?? false,
    },
  });
}

export async function atualizarCurso(
  id: string,
  dados: DadosAtualizarCurso,
  deps: DepsCursos = {},
): Promise<courses> {
  const db = deps.db ?? dbPadrao;

  // 1. Validações puras (antes de tocar no banco).
  const nome = dados.nome !== undefined ? validarNome(dados.nome) : undefined;
  const descricao =
    dados.descricao !== undefined ? normalizarTexto(dados.descricao) : undefined;
  const imagem_url =
    dados.imagem_url !== undefined ? validarImagemUrl(dados.imagem_url) : undefined;
  const slug = dados.slug !== undefined ? validarSlugManual(dados.slug) : undefined;

  // 2. Existência.
  const curso = await db.courses.findUnique({ where: { id } });
  if (!curso) throw erroCursoNaoEncontrado();

  // 3. C1 — slug imutável após o 1º material publicado (SPEC-conteudo §4 C1).
  if (slug !== undefined && slug !== curso.slug) {
    const publicados = await db.materials.count({
      where: { modulo: { course_id: id }, status: "publicado" },
    });
    if (publicados > 0) {
      throw new ErroConteudo({
        code: "slug_imutavel",
        campo: "slug",
        mensagem: "o slug não pode ser alterado após o primeiro material publicado",
      });
    }
    // Unicidade do novo slug (excluindo o próprio curso).
    const comSlug = await db.courses.findUnique({ where: { slug } });
    if (comSlug && comSlug.id !== id) throw erroSlugDuplicado();
  }

  // 4. Update — só inclui campos informados (undefined = não alterar).
  const data: NonNullable<Parameters<DbCursos["courses"]["update"]>[0]>["data"] = {};
  if (nome !== undefined) data.nome = nome;
  if (descricao !== undefined) data.descricao = descricao;
  if (imagem_url !== undefined) data.imagem_url = imagem_url;
  if (slug !== undefined) data.slug = slug;
  if (dados.incluido_assinatura !== undefined) {
    data.incluido_assinatura = dados.incluido_assinatura;
  }

  return db.courses.update({ where: { id }, data });
}

export async function excluirCurso(
  id: string,
  confirmacaoNome: string,
  deps: DepsCursos = {},
): Promise<courses> {
  const db = deps.db ?? dbPadrao;

  const curso = await db.courses.findUnique({ where: { id } });
  if (!curso) throw erroCursoNaoEncontrado();

  // C6: confirmação explícita digitando o nome do curso (SPEC-conteudo §3.1/:39).
  if (typeof confirmacaoNome !== "string" || confirmacaoNome.trim() !== curso.nome) {
    throw new ErroConteudo({
      code: "confirmacao_necessaria",
      mensagem: "digite o nome do curso para confirmar a exclusão",
    });
  }

  // C6 (cascata): `modules.course` e `materials.modulo` têm `onDelete: Cascade`
  // (schema.prisma :119/:166) — o delete do curso remove módulos e materiais
  // automaticamente no banco. Sem delete manual em $transaction.
  return db.courses.delete({ where: { id } });
}

/** Lista cursos ordenados por criação (helper de rotas admin/aluno). */
export async function listarCursos(deps: DepsCursos = {}): Promise<courses[]> {
  const db = deps.db ?? dbPadrao;
  return db.courses.findMany({ orderBy: { criado_em: "asc" } });
}

/** Busca um curso pelo slug — helper da sales page /cursos/[slug] (US-44). */
export async function obterCursoPorSlug(
  slug: string,
  deps: DepsCursos = {},
): Promise<courses> {
  const db = deps.db ?? dbPadrao;
  const curso = await db.courses.findUnique({ where: { slug } });
  if (!curso) throw erroCursoNaoEncontrado();
  return curso;
}
