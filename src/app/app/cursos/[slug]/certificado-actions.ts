"use server";

import { redirect } from "next/navigation";

import { requireRole } from "@/lib/auth";
import { emitir } from "@/services/aluno/certificados";

export async function emitirCertificadoAction(formData: FormData): Promise<void> {
  const user = await requireRole("aluno");
  const courseId = String(formData.get("course_id") ?? "");
  if (!courseId) redirect("/app/cursos");
  const certificado = await emitir(user.id, courseId);
  redirect(`/verificar/${certificado.codigo}`);
}
