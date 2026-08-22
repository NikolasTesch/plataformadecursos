import Link from "next/link";
import { redirect } from "next/navigation";
import { BloqueadoCard } from "@/components/app/BloqueadoCard";
import { auth } from "@/lib/auth/auth";
import { verificarSessaoValida } from "@/lib/auth/verificar-sessao";
import { listarErros } from "@/services/questoes/erros";
import { listarFavoritas } from "@/services/questoes/favoritas";
import { listarBlocosQuestoesAluno, obterBlocoQuestaoAluno } from "@/services/questoes/navegacao";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default async function QuestoesPage({ searchParams }: { searchParams: Promise<{ area?: string }> }) {
  const session = await auth();
  if (!session || !(await verificarSessaoValida(session)) || session.user.role !== "aluno") redirect("/login");
  const user = session.user; const area = (await searchParams).area ?? "blocos";
  const [blocos, erros, favoritas] = await Promise.all([listarBlocosQuestoesAluno(user.id), area === "erros" ? listarErros(user.id) : Promise.resolve([]), area === "favoritas" ? listarFavoritas(user.id) : Promise.resolve([])]);
  const favoritasComBloco = await Promise.all(favoritas.map(async (item) => ({ item, bloco: await obterBlocoQuestaoAluno(user.id, item.question_id) })));
  const abas = [["blocos", "Blocos", "/app/questoes"], ["erros", "Meus erros", "/app/questoes?area=erros"], ["favoritas", "Favoritas", "/app/questoes?area=favoritas"]] as const;
  return <main className="mx-auto w-full max-w-4xl space-y-7 px-4 py-8 lg:px-8"><header><p className="text-sm text-muted-foreground">Área do aluno</p><h1 className="mt-1 text-2xl font-bold tracking-tight">Questões</h1><p className="mt-1 text-sm text-muted-foreground">Pratique por bloco, revise seus erros e guarde questões favoritas.</p></header><nav aria-label="Áreas de questões" className="flex gap-2 overflow-x-auto border-b pb-2 text-sm">{abas.map(([chave, label, href]) => <Link key={chave} className={area === chave ? "border-b-2 border-primary px-3 py-2 font-semibold" : "px-3 py-2 text-muted-foreground"} href={href}>{label}</Link>)}</nav>
    {area === "erros" ? <div className="space-y-3">{erros.map((item) => <Link key={item.question_id} href={`/app/questoes/${item.questao.material_id}#questao-${item.question_id}`} className="block rounded-lg border bg-card p-4 hover:bg-muted"><p className="font-medium">Questão para revisar</p><p className="text-sm text-muted-foreground">{item.total_erros} erro(s) · {Math.round(item.taxa_acerto * 100)}% de acerto</p></Link>)}{erros.length === 0 && <p className="text-sm text-muted-foreground">Você não tem erros pendentes.</p>}</div> : area === "favoritas" ? <div className="space-y-3">{favoritasComBloco.filter(({ bloco }) => bloco?.permitido).map(({ item, bloco }) => <Link key={item.question_id} href={`/app/questoes/${bloco?.id}#questao-${item.question_id}`} className="block rounded-lg border bg-card p-4 hover:bg-muted"><p className="font-medium">Questão favorita</p><p className="text-sm text-muted-foreground">Abrir para responder</p></Link>)}{favoritas.length === 0 && <p className="text-sm text-muted-foreground">Nenhuma questão favorita.</p>}</div> : <div className="space-y-3">{blocos.map((bloco) => bloco.permitido ? <Link key={bloco.id} href={`/app/questoes/${bloco.id}`} className="block rounded-lg border bg-card p-4 shadow-sm hover:bg-muted"><p className="font-medium">{bloco.titulo}</p><p className="text-sm text-muted-foreground">{bloco.curso}</p></Link> : <BloqueadoCard key={bloco.id} material={{ id: bloco.id, titulo: bloco.titulo }} motivo={bloco.motivo} />)}{blocos.length === 0 && <p className="text-sm text-muted-foreground">Nenhum bloco publicado.</p>}</div>}
  </main>;
}
