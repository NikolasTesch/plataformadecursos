// Bloqueio/desbloqueio de usuário (US-20) — bloqueio.ts. Ação administrativa
// INTERNA (ainda sem UI — a interface de gestão é US-20 pendente).
//
// A3/E2E-A1: bloquear incrementa o `tokenVersion` — o bump É o mecanismo de
// revogação: invalida TODOS os JWTs emitidos antes do bloqueio imediatamente.
// A verificação em runtime é feita em Node pelo verificarSessaoValida
// (src/lib/auth/verificar-sessao.ts) a cada requisição protegida — nunca no
// middleware/Edge (BLOCKER-1). Desbloquear apenas limpa a flag `bloqueado`,
// SEM rotacionar o tokenVersion (US-20: desbloqueio não exige nova senha nem
// re-login).
import { db } from "@/lib/db";
import type { Prisma, users } from "@/generated/prisma/client";

import { ErroAuth } from "./erros";

/** Dependências injetáveis (testabilidade): banco + adminId (RBAC). */
export interface SetBloqueadoDeps {
  db?: {
    users: {
      update(args: Prisma.usersUpdateArgs): Promise<users>;
    };
  };
  adminId?: string;
}

/**
 * Bloqueia ou desbloqueia um usuário.
 * - `bloqueado: true` → bump de tokenVersion (revoga todas as sessões, A3) +
 *   flag bloqueado.
 * - `bloqueado: false` → apenas `bloqueado: false` (tokenVersion intocado).
 * - Guard: o admin não pode bloquear a si mesmo (US-20).
 * Retorna o usuário atualizado.
 */
export async function setBloqueado(
  userId: string,
  bloqueado: boolean,
  deps: SetBloqueadoDeps = {},
): Promise<users> {
  const client = deps.db ?? db;

  // US-20: "Admin não pode bloquear a si mesmo". Guard só no bloqueio —
  // desbloquear a si mesmo é permitido (não faz sentido o contrário).
  if (bloqueado && deps.adminId !== undefined && deps.adminId === userId) {
    throw new ErroAuth({
      code: "self_block",
      mensagem: "não é possível bloquear a si mesmo",
    });
  }

  // A3: o bump do tokenVersion É a revogação (E2E-A1 — sessões ativas caem).
  const data = bloqueado
    ? { tokenVersion: { increment: 1 }, bloqueado: true }
    : { bloqueado: false };

  return client.users.update({ where: { id: userId }, data });
}
