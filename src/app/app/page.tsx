import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth/auth";
import { verificarSessaoValida } from "@/lib/auth/verificar-sessao";
import { listarCursosAluno } from "@/services/aluno/navegacao";

export const metadata: Metadata = { title: "Início | ConcursFoco" };

export default async function AppHomePage() {
  const session = await auth();
  if (!session || !(await verificarSessaoValida(session))) redirect("/login");
  const cursos = await listarCursosAluno(session.user.id);
  return <main className="mx-auto w-full max-w-6xl space-y-10 px-4 py-8 lg:px-8">
    <header className="max-w-2xl"><p className="text-sm font-semibold uppercase tracking-[0.18em] text-primary">Bom estudo</p><h1 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">Olá, {session.user.name?.split(" ")[0] || "aluno"}.</h1><p className="mt-3 text-muted-foreground">Escolha um curso e avance um passo hoje.</p></header>
    <section aria-labelledby="cursos-titulo"><div className="mb-4 flex items-end justify-between gap-4"><div><h2 id="cursos-titulo" className="text-xl font-bold">Seus cursos</h2><p className="text-sm text-muted-foreground">Acompanhe seu progresso</p></div><Link href="/app/cursos" className="text-sm font-semibold text-primary hover:underline">Ver todos</Link></div>
      {cursos.length === 0 ? <div role="status" className="rounded-2xl border border-dashed bg-card p-10 text-center"><p className="font-semibold">Nenhum curso disponível ainda</p><p className="mt-1 text-sm text-muted-foreground">Quando um curso for publicado, ele aparecerá aqui.</p></div> : <div className="grid gap-4 md:grid-cols-2">{cursos.map(({ curso, percentual }) => <Link key={curso.id} href={`/app/cursos/${curso.slug}`} className="group rounded-2xl border bg-card p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" data-testid={`home-curso-${curso.slug}`}><div className="flex items-start justify-between gap-4"><div><h3 className="font-bold group-hover:text-primary">{curso.nome}</h3>{curso.descricao && <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{curso.descricao}</p>}</div><span className="text-2xl font-black text-primary">{percentual}%</span></div><div className="mt-5 h-2 overflow-hidden rounded-full bg-muted" role="progressbar" aria-label={`Progresso em ${curso.nome}`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={percentual}><div className="h-full rounded-full bg-primary transition-all" style={{ width: `${percentual}%` }} /></div><p className="mt-2 text-xs text-muted-foreground">{percentual === 100 ? "Curso concluído" : "Continue sua jornada"}</p></Link>)}</div>}
    </section>
  </main>;
}
