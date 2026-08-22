import { notFound } from "next/navigation";
import { BloqueadoCard } from "@/components/app/BloqueadoCard";
import { requireRole } from "@/lib/auth";
import { listarFavoritas } from "@/services/questoes/favoritas";
import { obterBlocoQuestaoAluno } from "@/services/questoes/navegacao";
import { QuestaoBloco } from "../QuestaoBloco";

export default async function QuestaoPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireRole("aluno"); const { id } = await params; const bloco = await obterBlocoQuestaoAluno(user.id, id); if (!bloco) notFound();
  if (!bloco.permitido) return <main className="mx-auto max-w-3xl px-4 py-10"><BloqueadoCard material={{ id: bloco.id, titulo: bloco.titulo }} motivo={bloco.motivo} /></main>;
  const favoritas = await listarFavoritas(user.id); const ids = favoritas.map(({ question_id }) => question_id);
  return <main className="mx-auto w-full max-w-3xl space-y-7 px-4 py-8"><header><p className="text-sm text-muted-foreground">{bloco.curso}</p><h1 className="mt-1 text-2xl font-bold tracking-tight">{bloco.titulo}</h1></header><QuestaoBloco blocoId={bloco.id} questoes={bloco.questoes} favoritas={ids} /></main>;
}
