"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { atualizarQuestaoAction, criarQuestaoAction, excluirQuestaoAction, type EstadoQuestao } from "./actions";

type Alternativa = { letra: "A" | "B" | "C" | "D" | "E"; texto: string };
type Questao = { id: string; enunciado: string; alternativas: unknown; gabarito: string; comentario_html: string | null; ordem: number };
const LETRAS = ["A", "B", "C", "D", "E"] as const;
const input = "flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm";

function normalizar(valor: unknown): Alternativa[] {
  if (!Array.isArray(valor)) return LETRAS.slice(0, 4).map((letra) => ({ letra, texto: "" }));
  return LETRAS.slice(0, valor.length).map((letra, i) => ({ letra, texto: typeof (valor[i] as { texto?: unknown })?.texto === "string" ? (valor[i] as { texto: string }).texto : "" }));
}

export function QuestoesManager({ materialId, iniciais }: { materialId: string; iniciais: Questao[] }) {
  const [questoes, setQuestoes] = useState(iniciais);
  const [editando, setEditando] = useState<string | null>(null);
  const [estado, setEstado] = useState<EstadoQuestao>({});
  const [enunciado, setEnunciado] = useState("");
  const [alternativas, setAlternativas] = useState<Alternativa[]>(normalizar(null));
  const [gabarito, setGabarito] = useState("A");
  const [comentario, setComentario] = useState("");

  function limpar() { setEditando(null); setEnunciado(""); setAlternativas(normalizar(null)); setGabarito("A"); setComentario(""); setEstado({}); }
  function editar(q: Questao) { setEditando(q.id); setEnunciado(q.enunciado); setAlternativas(normalizar(q.alternativas)); setGabarito(q.gabarito); setComentario(q.comentario_html ?? ""); setEstado({}); }
  async function salvar(e: React.FormEvent) {
    e.preventDefault(); const fd = new FormData(); if (editando) fd.set("id", editando); fd.set("material_id", materialId); fd.set("enunciado", enunciado); fd.set("alternativas", JSON.stringify(alternativas)); fd.set("gabarito", gabarito); fd.set("comentario_html", comentario);
    const resultado = editando ? await atualizarQuestaoAction(fd) : await criarQuestaoAction(fd); setEstado(resultado);
    if (resultado.ok) window.location.reload();
  }
  async function excluir(id: string) { if (!window.confirm("Excluir esta questão?")) return; const resultado = await excluirQuestaoAction(id); setEstado(resultado); if (resultado.ok) setQuestoes(questoes.filter((q) => q.id !== id)); }
  return <section className="space-y-4 border-t pt-6" aria-labelledby="questoes-titulo">
    <h2 id="questoes-titulo" className="text-lg font-semibold">Questões do material</h2>
    {questoes.map((q) => <div key={q.id} className="rounded-md border p-4"><p className="font-medium">{q.ordem}. {q.enunciado}</p><p className="text-sm text-muted-foreground">Gabarito: {q.gabarito}</p><div className="mt-2 flex gap-2"><button type="button" className="text-sm underline" onClick={() => editar(q)}>Editar</button><button type="button" className="text-sm text-destructive underline" onClick={() => excluir(q.id)}>Excluir</button></div></div>)}
    <form onSubmit={salvar} className="space-y-3 rounded-md border p-4">
      <h3 className="font-medium">{editando ? "Editar questão" : "Nova questão"}</h3>
      <textarea required value={enunciado} onChange={(e) => setEnunciado(e.target.value)} placeholder="Enunciado obrigatório" className={cn(input, "h-24 py-2")} />
      {alternativas.map((a, i) => <div key={a.letra} className="flex gap-2"><span className="pt-2 font-medium">{a.letra}</span><input required value={a.texto} onChange={(e) => setAlternativas(alternativas.map((item, index) => index === i ? { ...item, texto: e.target.value } : item))} className={input} placeholder={`Alternativa ${a.letra}`} /></div>)}
      <button type="button" className="text-sm underline" onClick={() => alternativas.length === 4 && setAlternativas([...alternativas, { letra: "E", texto: "" }])}>{alternativas.length === 4 ? "Adicionar alternativa E" : "5 alternativas"}</button>
      <select value={gabarito} onChange={(e) => setGabarito(e.target.value)} className={input}>{alternativas.map((a) => <option key={a.letra} value={a.letra}>Gabarito: {a.letra}</option>)}</select>
      <textarea value={comentario} onChange={(e) => setComentario(e.target.value)} placeholder="Comentário opcional (HTML sanitizado)" className={cn(input, "h-20 py-2")} />
      {estado.erro && <p role="alert" className="text-sm text-destructive">{estado.erro.mensagem}</p>}
      <div className="flex gap-2"><button type="submit" className="rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground">{editando ? "Salvar questão" : "Criar questão"}</button>{editando && <button type="button" className="text-sm underline" onClick={limpar}>Cancelar</button>}</div>
    </form>
  </section>;
}
