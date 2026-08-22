// Helpers de sessão/role — src/lib/auth/index.ts.
//
// NODE-ONLY: importam `auth` de ./auth.ts (que carrega PrismaAdapter + db).
// O proxy NUNCA importa este arquivo (roda no Edge — BLOCKER-1); ele usa
// apenas auth.config.ts. Estes helpers são consumidos por services/auth e por
// route handlers/server components para autorização no servidor (AGENTS.md §6).
import type { Session } from "next-auth";

import type { Role } from "@/generated/prisma/client";

import { auth } from "./auth";

/** Usuário autenticado conforme a augmentação de Session (id, role, tokenVersion). */
export type SessionUser = Session["user"];

/** Sessão atual do Auth.js → `session?.user` ou `null` quando anônimo. */
export async function getSessionUser(): Promise<SessionUser | null> {
  const session = await auth();
  return session?.user ?? null;
}

/**
 * Exige uma role específica. Retorna o usuário da sessão (útil após o gate)
 * ou lança um Error com mensagem clara — services/rotas capturam e
 * redirecionam (401/redirect) conforme a convenção do projeto. Autorização
 * sempre validada no servidor (RBAC, AGENTS.md §6).
 *
 * @param role role exigida (`aluno` | `admin`)
 * @returns SessionUser autenticado com a role exigida
 * @throws Error se não autenticado ou se a role não confere
 */
export async function requireRole(role: Role): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) {
    throw new Error(
      `Acesso negado: é preciso estar autenticado (role exigida: ${role}).`,
    );
  }
  if (user.role !== role) {
    throw new Error(
      `Acesso negado: role '${user.role}' não possui permissão (exigida: ${role}).`,
    );
  }
  return user;
}

/** Conveniência: sessão atual tem role `admin`? (boolean tipado) */
export async function isAdmin(): Promise<boolean> {
  const user = await getSessionUser();
  return user?.role === "admin";
}
