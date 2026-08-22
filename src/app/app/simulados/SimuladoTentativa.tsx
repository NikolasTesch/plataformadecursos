"use client";
import { useEffect, useState, useTransition } from "react";
import type { TentativaLeitura } from "@/services/simulados";
import { entregarEstado, responderEstado } from "./actions";
export function SimuladoTentativa({ inicial }: { inicial: TentativaLeitura }) {
  const [leitura, setLeitura] = useState(inicial); const [agora, setAgora] = useState(0); const [pendente, start] = useTransition();
  const restante = leitura.estado === "em_andamento" ? Math.max(0, new Date(leitura.deadline).getTime() - agora) : 0;
  const entregar = () => { const f = new FormData(); f.set("tentativa_id", leitura.id); start(async () => { const r = await entregarEstado({ ok: true }, f); if (r.ok && r.dados) setLeitura({ ...leitura, estado: "entregue", ...(r.dados as object) } as unknown as TentativaLeitura); }); };
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { if (leitura.estado !== "em_andamento") return; setAgora(Date.now()); const t = window.setInterval(() => setAgora(Date.now()), 1000); return () => window.clearInterval(t); }, [leitura.estado]);
  // The deadline effect intentionally observes the changing timer value.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { if (leitura.estado === "em_andamento" && restante === 0) entregar(); }, [restante]);
  if (leitura.estado === "entregue") return <section data-testid="correcao-simulado" className="space-y-4"><h2 className="text-xl font-semibold">Correção</h2><p role="status">Nota: <strong>{Math.round(leitura.nota * 100)}%</strong></p>{leitura.questoes.map(q => <div key={q.id} className="rounded border p-4"><p>{q.enunciado}</p><p className="text-sm text-muted-foreground">Resposta: {leitura.respostas[q.id] ?? "Não respondida"}</p></div>)}</section>;
  return <section data-testid="tentativa-simulado" className="space-y-5"><div className="flex items-center justify-between rounded border bg-background p-3"><strong data-testid="cronometro">Tempo: {String(Math.floor(restante / 60000)).padStart(2, "0")}:{String(Math.floor(restante / 1000) % 60).padStart(2, "0")}</strong><button type="button" disabled={pendente || restante === 0} onClick={entregar} className="rounded bg-primary px-3 py-2 text-sm text-primary-foreground">Entregar</button></div>{leitura.questoes.map((q, i) => <fieldset key={q.id} className="space-y-3 rounded-xl border bg-card p-5"><legend className="font-semibold">Questão {i + 1}</legend><p>{q.enunciado}</p>{q.alternativas.map(a => <label key={a.letra} className="flex gap-3 rounded border p-3"><input type="radio" name={q.id} disabled={pendente || restante === 0} onChange={() => { const f = new FormData(); f.set("tentativa_id", leitura.id); f.set("questao_id", q.id); f.set("alternativa", a.letra); start(async () => { await responderEstado({ ok: true }, f); }); }} /><span><b>{a.letra}</b> {a.texto}</span></label>)}</fieldset>)}</section>;
}
