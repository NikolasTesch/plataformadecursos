import { redirect } from "next/navigation";
import { auth } from "@/lib/auth/auth";
import { verificarSessaoValida } from "@/lib/auth/verificar-sessao";
import { listarSimulados, listarTentativas, obterTentativaParaResponder } from "@/services/simulados";
import { iniciarSimuladoForm } from "../actions";
import { SimuladoTentativa } from "../SimuladoTentativa";
export const dynamic = "force-dynamic";
export default async function Page({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ tentativa?: string }> }) {
  const s = await auth(); if (!s || !(await verificarSessaoValida(s)) || s.user.role !== "aluno") redirect("/login");
  const { id } = await params; const query = await searchParams; const simulado = (await listarSimulados(undefined)).find(x => x.id === id); if (!simulado) redirect("/app/simulados");
  const tentativa = query.tentativa ? await obterTentativaParaResponder(s.user.id, query.tentativa) : null; const historico = await listarTentativas(s.user.id, id);
  return <main className="mx-auto max-w-4xl space-y-7 px-4 py-8 lg:px-8"><header><p className="text-sm text-muted-foreground">Simulado</p><h1 className="text-2xl font-bold">{simulado.titulo}</h1><p className="text-sm text-muted-foreground">{simulado.duracao_minutos} minutos · {simulado.instrucoes ?? "Leia as questões e entregue ao finalizar."}</p></header>{tentativa ? <SimuladoTentativa inicial={tentativa} /> : <form action={iniciarSimuladoForm} className="rounded-xl border bg-card p-5"><input type="hidden" name="simulado_id" value={id}/><button data-testid="iniciar-simulado" className="rounded bg-primary px-4 py-2 text-sm text-primary-foreground">Iniciar nova tentativa</button></form>}<section aria-labelledby="historico"><h2 id="historico" className="font-semibold">Histórico</h2><div className="mt-3 space-y-2">{historico.map(h => <div data-testid="tentativa-historico" key={h.id} className="rounded border p-4 text-sm">{h.entregue_em ? new Date(h.entregue_em).toLocaleString("pt-BR") : "Em andamento"}<strong className="ml-3">{h.status === "entregue" ? `${Math.round((h.nota ?? 0) * 100)}%` : "—"}</strong></div>)}</div></section></main>;
}
