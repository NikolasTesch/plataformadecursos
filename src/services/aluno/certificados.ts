// Certificados (US-29): a elegibilidade reutiliza a mesma regra AL1 do
// progresso, e a chave composta do banco torna a emissão regenerável.
import { randomBytes } from "node:crypto";

import { db as dbPadrao } from "@/lib/db";
import { progressoCurso, type DbProgresso } from "@/services/aluno/progresso";

export type CertificadoPublico = {
  codigo: string;
  nome: string;
  curso: string;
  data: Date;
};

export interface DbCertificados extends DbProgresso {
  certificates: {
    findUnique(args: { where: { user_id_course_id?: { user_id: string; course_id: string }; codigo?: string }; select?: Record<string, unknown>; include?: Record<string, unknown> }): Promise<CertificadoRow | null>;
    upsert(args: { where: { user_id_course_id: { user_id: string; course_id: string } }; update: Record<string, never>; create: { user_id: string; course_id: string; codigo: string }; include: CertificadoRelations }): Promise<CertificadoRow>;
  };
}

type CertificadoRow = { codigo: string; gerado_em: Date; user_id?: string; course_id?: string; user?: { nome: string }; course?: { nome: string } };
type CertificadoRelations = { user: { select: { nome: true } }; course: { select: { nome: true } } };
const db = dbPadrao as unknown as DbCertificados;

export class ErroCertificado extends Error {
  constructor(public readonly code: "nao_autenticado" | "curso_nao_encontrado" | "curso_incompleto" | "codigo_invalido") {
    super(code);
    this.name = "ErroCertificado";
  }
}

function exigirUsuario(userId: string): void {
  if (!userId || !userId.trim()) throw new ErroCertificado("nao_autenticado");
}

export async function elegivel(userId: string, courseId: string, banco: DbCertificados = db): Promise<boolean> {
  exigirUsuario(userId);
  const curso = await banco.courses.findUnique({ where: { id: courseId } });
  if (!curso) throw new ErroCertificado("curso_nao_encontrado");
  return (await progressoCurso(userId, courseId, banco)) === 100;
}

export async function emitir(userId: string, courseId: string, banco: DbCertificados = db): Promise<CertificadoPublico> {
  exigirUsuario(userId);
  const curso = await banco.courses.findUnique({ where: { id: courseId } });
  if (!curso) throw new ErroCertificado("curso_nao_encontrado");
  if ((await progressoCurso(userId, courseId, banco)) !== 100) throw new ErroCertificado("curso_incompleto");

  const row = await banco.certificates.upsert({
    where: { user_id_course_id: { user_id: userId, course_id: courseId } },
    update: {},
    create: { user_id: userId, course_id: courseId, codigo: randomBytes(12).toString("base64url") },
    include: { user: { select: { nome: true } }, course: { select: { nome: true } } },
  });
  return { codigo: row.codigo, nome: row.user?.nome ?? "", curso: row.course?.nome ?? "", data: row.gerado_em };
}

export async function verificar(codigo: string, banco: DbCertificados = db): Promise<CertificadoPublico | null> {
  if (!codigo || !/^[A-Za-z0-9_-]{16,64}$/.test(codigo)) return null;
  const row = await banco.certificates.findUnique({
    where: { codigo },
    select: {
      codigo: true,
      gerado_em: true,
      user: { select: { nome: true } },
      course: { select: { nome: true } },
    },
  });
  if (!row?.user || !row.course) return null;
  return { codigo: row.codigo, nome: row.user.nome, curso: row.course.nome, data: row.gerado_em };
}

/** Retorna o certificado para download somente ao titular ainda elegível. */
export async function obterParaDownload(userId: string, codigo: string, banco: DbCertificados = db): Promise<CertificadoPublico | null> {
  exigirUsuario(userId);
  if (!codigo || !/^[A-Za-z0-9_-]{16,64}$/.test(codigo)) return null;
  const row = await banco.certificates.findUnique({
    where: { codigo },
    include: { user: { select: { nome: true } }, course: { select: { nome: true } } },
  });
  if (!row?.user || !row.course || row.user_id !== userId || !row.course_id) return null;
  if (!(await elegivel(userId, row.course_id, banco))) return null;
  return { codigo: row.codigo, nome: row.user.nome, curso: row.course.nome, data: row.gerado_em };
}
