// Verificação NODE da sessão — verificar-sessao.ts.
//
// Executa UMA leitura no banco (users por session.user.id) e compara
// tokenVersion + bloqueado (SPEC-auth A3). É o enforcement em Node da
// revogação de sessões JWT: quando o admin bloqueia um usuário, o tokenVersion
// é incrementado e todo JWT emitido antes daquele bump passa a ser inválido.
//
// NUNCA chamado no middleware/Edge (BLOCKER-1): middleware só checa presença
// de JWT + role de forma otimista. Este helper é usado em services, route
// handlers e server components (todos 12/13).
import type { Session } from "next-auth";

import { db } from "@/lib/db";

export async function verificarSessaoValida(
  session: Session | null | undefined,
): Promise<boolean> {
  if (!session?.user?.id) return false;

  const user = await db.users.findUnique({
    where: { id: session.user.id },
    select: { tokenVersion: true, bloqueado: true },
  });

  if (!user) return false;

  return user.tokenVersion === session.user.tokenVersion && !user.bloqueado;
}
