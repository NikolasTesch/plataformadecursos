import { NextResponse } from "next/server";

import { auth } from "@/lib/auth/auth";
import { verificarSessaoValida } from "@/lib/auth/verificar-sessao";
import { gerarPdfCertificado } from "@/lib/pdf";
import { obterParaDownload } from "@/services/aluno/certificados";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ codigo: string }> },
): Promise<NextResponse> {
  const session = await auth();
  if (!session?.user || !(await verificarSessaoValida(session))) {
    return NextResponse.json({ erro: "não autenticado" }, { status: 401 });
  }

  const { codigo } = await params;
  const certificado = await obterParaDownload(session.user.id, codigo);
  if (!certificado) return NextResponse.json({ erro: "certificado não encontrado" }, { status: 404 });

  const pdf = await gerarPdfCertificado(certificado);
  return new NextResponse(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="certificado-${certificado.codigo}.pdf"`,
      "Cache-Control": "no-store",
    },
  });
}
