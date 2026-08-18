// GET /api/materiais/[id]/imprimir — impressão de material em PDF (US-41).
//
// GATING-FIRST (R12): impressão é ACESSO AO CONTEÚDO — a rota repete a mesma
// decisão da página de leitura (sessão Node + gating mínimo) ANTES de gerar o
// PDF. Sem autorização → 401, sem conteúdo nenhum.
//
// Contratos:
// - Gating/URL: esta rota NÃO emite URL assinada — gera o PDF direto no
//   servidor (os bytes nunca saem para storage).
// - C8: sem cache persistente — `Cache-Control: no-store`; o PDF é gerado a
//   cada requisição autorizada.
// - C4: o HTML do material é sanitizado dentro de gerarPdfMaterial.
// - Apenas tipos texto/resumo são imprimíveis (pdf/video/questoes → 404).
import { NextResponse } from "next/server";

import { auth } from "@/lib/auth/auth";
import { verificarSessaoValida } from "@/lib/auth/verificar-sessao";
import { db } from "@/lib/db";
import { ErroPdf, gerarPdfMaterial } from "@/lib/pdf";
import { obterMaterial } from "@/services/conteudo/materiais";
import {
  montarEntitlementsGating,
  resolverAcessoMaterial,
  resolverGatingMaterial,
} from "@/services/conteudo/leitura";

interface Props {
  params: Promise<{ id: string }>;
}

function respostaErro(status: number, mensagem: string): NextResponse {
  return NextResponse.json({ erro: mensagem }, { status });
}

export async function GET(_request: Request, { params }: Props) {
  const { id } = await params;

  // 1. Sessão Node (padrão S1).
  const session = await auth();
  if (!session?.user) return respostaErro(401, "não autenticado");
  const sessaoValida = await verificarSessaoValida(session);
  if (!sessaoValida) return respostaErro(401, "sessão inválida");

  // 2. Dados para a DECISÃO.
  const material = await obterMaterial(id);
  if (material === null) return respostaErro(404, "material não encontrado");

  const modulo = await db.modules.findUnique({
    where: { id: material.module_id },
    select: { course_id: true },
  });
  if (modulo === null) return respostaErro(404, "material não encontrado");

  const curso = await db.courses.findUnique({
    where: { id: modulo.course_id },
    select: { id: true, incluido_assinatura: true },
  });
  if (curso === null) return respostaErro(404, "material não encontrado");

  const linhas = await db.entitlements.findMany({
    where: { user_id: session.user.id },
    include: { product: true },
  });

  // 3. GATING-FIRST (R12): decisão idêntica à página de leitura.
  const resultadoGating = resolverGatingMaterial(
    {
      userId: session.user.id,
      material,
      curso,
      entitlements: montarEntitlementsGating(linhas),
      usuario: { id: session.user.id, bloqueado: false },
    },
  );
  const estado = resolverAcessoMaterial({
    sessaoValida: true,
    material,
    resultadoGating,
  });

  if (estado === "nao_encontrado") return respostaErro(404, "material não encontrado");
  if (estado === "bloqueado") return respostaErro(401, "sem acesso ao material");

  // 4. US-41: apenas texto/resumo têm HTML imprimível.
  if (material.tipo !== "texto" && material.tipo !== "resumo") {
    return respostaErro(404, "este material não é imprimível");
  }

  // 5. Geração (C8: sem cache — no-store; C4 sanitiza dentro da lib).
  try {
    const pdf = await gerarPdfMaterial({
      titulo: material.titulo,
      conteudoHtml: material.conteudo_html,
    });
    return new NextResponse(new Uint8Array(pdf), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="material-${material.id}.pdf"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (erro) {
    if (erro instanceof ErroPdf) {
      return respostaErro(500, "falha ao gerar o PDF do material");
    }
    throw erro;
  }
}
