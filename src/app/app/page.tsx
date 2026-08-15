// Stub da área do aluno (/app) — S3 será o dashboard real.
//
// ROTA FINA + verificação Node (BLOCKER-1): middleware já checa presença de
// JWT (Edge); AQUI a sessão é verificada de novo contra o banco via
// verificarSessaoValida (tokenVersion + bloqueado, SPEC-auth A3) — sessão
// revogada/usuário bloqueado → redirect /login. Nada de dashboard neste slice.
import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { auth } from "@/lib/auth/auth";
import { verificarSessaoValida } from "@/lib/auth/verificar-sessao";

export const metadata: Metadata = {
  title: "Área do aluno | ConcursFoco",
};

export default async function AppHomePage() {
  const session = await auth();
  if (!session) redirect("/login");
  const sessaoValida = await verificarSessaoValida(session);
  if (!sessaoValida) redirect("/login");

  return (
    <main className="flex min-h-svh flex-col items-center justify-center gap-3">
      <h1 className="text-3xl font-bold tracking-tight">Área do aluno</h1>
      <p className="text-lg text-neutral-500">
        em breve — S3 (cursos, materiais e progresso)
      </p>
      <p className="text-sm text-neutral-500">
        Olá, {session.user.name}
      </p>
    </main>
  );
}
