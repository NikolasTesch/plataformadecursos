import { requireRole } from "@/lib/auth";
import { buscarPorTexto } from "@/services/aluno/anotacoes";
import { atualizarAnotacaoAction, excluirAnotacaoAction } from "./actions";

export default async function AnotacoesPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const user = await requireRole("aluno");
  const query = (await searchParams).q ?? "";
  const notas = await buscarPorTexto(user.id, query);
  return (
    <main className="mx-auto max-w-3xl space-y-6 px-6 py-10">
      <h1 className="text-2xl font-bold">Minhas anotações</h1>
      <form className="flex gap-2">
        <input name="q" defaultValue={query} placeholder="Buscar nas anotações" className="flex-1 rounded border px-3 py-2" />
        <button className="rounded bg-neutral-900 px-4 py-2 text-white">Buscar</button>
      </form>
      {notas.map((nota) => (
        <form key={nota.id} action={atualizarAnotacaoAction} className="space-y-2 rounded border p-4">
          <input type="hidden" name="nota_id" value={nota.id} />
          <p className="text-sm text-neutral-500">Material: {nota.material_id}</p>
          <textarea name="conteudo" defaultValue={nota.conteudo} maxLength={10000} required className="min-h-24 w-full rounded border p-2" />
          <div className="flex gap-2">
            <button className="rounded bg-neutral-900 px-3 py-1 text-sm text-white">Salvar</button>
            <button formAction={excluirAnotacaoAction} className="rounded border px-3 py-1 text-sm">Excluir</button>
          </div>
        </form>
      ))}
      {notas.length === 0 && <p className="text-neutral-500">Nenhuma anotação encontrada.</p>}
    </main>
  );
}
