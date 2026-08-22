// POST /api/materiais/[id]/video/progresso — posição headless do player.
// A rota só transporta posição; o serviço revalida sessão, dono e gating.
import { NextResponse } from "next/server";

import { auth } from "@/lib/auth/auth";
import { verificarSessaoValida } from "@/lib/auth/verificar-sessao";
import {
  ErroProgresso,
  salvarPosicaoVideo,
} from "@/services/aluno/progresso";

interface Props {
  params: Promise<{ id: string }>;
}

function erro(status: number, mensagem: string): NextResponse {
  return NextResponse.json({ erro: mensagem }, { status });
}

function numero(input: unknown): input is number {
  return typeof input === "number" && Number.isFinite(input);
}

export async function POST(request: Request, { params }: Props): Promise<NextResponse> {
  const session = await auth();
  if (!session?.user || session.user.role !== "aluno") return erro(401, "não autenticado");
  if (!(await verificarSessaoValida(session))) return erro(401, "sessão inválida");

  let corpo: unknown;
  try {
    corpo = await request.json() as unknown;
  } catch {
    return erro(400, "JSON inválido");
  }

  if (typeof corpo !== "object" || corpo === null) return erro(400, "posição inválida");
  const entrada = corpo as { posicaoSegundos?: unknown; duracaoSegundos?: unknown };
  if (!numero(entrada.posicaoSegundos) || entrada.posicaoSegundos < 0) {
    return erro(400, "posição inválida");
  }
  if (entrada.duracaoSegundos !== undefined && entrada.duracaoSegundos !== null && !numero(entrada.duracaoSegundos)) {
    return erro(400, "duração inválida");
  }

  const { id } = await params;
  try {
    const resultado = await salvarPosicaoVideo(
      session.user.id,
      id,
      entrada.posicaoSegundos,
      entrada.duracaoSegundos as number | null | undefined,
    );
    return NextResponse.json(resultado, { status: 200, headers: { "Cache-Control": "no-store" } });
  } catch (cause) {
    if (!(cause instanceof ErroProgresso)) throw cause;
    if (cause.code === "material_nao_encontrado" || cause.code === "curso_nao_encontrado") {
      return erro(404, "material não encontrado");
    }
    if (cause.code === "acesso_negado") return erro(403, "sem acesso ao material");
    if (cause.code === "material_nao_e_video") return erro(400, "o material não é um vídeo");
    return erro(400, "posição inválida");
  }
}
