import type { ReactNode } from "react";
import Link from "next/link";
import { Award, BookOpen, FileText, Home, ListChecks } from "lucide-react";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth/auth";
import { verificarSessaoValida } from "@/lib/auth/verificar-sessao";

const links = [{ href: "/app", label: "Início", icon: Home }, { href: "/app/cursos", label: "Cursos", icon: BookOpen }, { href: "/app/questoes", label: "Questões", icon: ListChecks }, { href: "/app/anotacoes", label: "Anotações", icon: FileText }, { href: "/app/cursos", label: "Certificados", icon: Award }];

export default async function AppLayout({ children }: { children: ReactNode }) {
  const session = await auth();
  if (!session || !(await verificarSessaoValida(session))) redirect("/login");
  const nome = session.user.name?.trim() || "Aluno";
  return <div className="min-h-svh bg-muted/30">
    <aside className="fixed inset-y-0 left-0 hidden w-64 flex-col border-r bg-card px-4 py-6 lg:flex">
      <Link href="/app" className="px-3 text-xl font-black tracking-tight text-primary">Concurs<span className="text-foreground">Foco</span></Link>
      <p className="mb-8 mt-1 px-3 text-xs uppercase tracking-[0.18em] text-muted-foreground">Seu ritmo, seu foco</p>
      <nav aria-label="Navegação principal" className="space-y-1">{links.map(({ href, label, icon: Icon }, index) => <Link key={`${href}-${label}`} href={href} className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors hover:bg-accent ${index === 0 ? "bg-primary text-primary-foreground hover:bg-primary/90" : "text-muted-foreground"}`}><Icon aria-hidden="true" className="h-4 w-4" />{label}</Link>)}</nav>
      <div className="mt-auto rounded-xl bg-primary/5 p-4 text-sm"><p className="font-semibold">Olá, {nome.split(" ")[0]}</p><p className="mt-1 text-xs text-muted-foreground">Continue de onde parou.</p></div>
    </aside>
    <div className="lg:pl-64"><header className="sticky top-0 z-10 border-b bg-background/90 px-4 py-3 backdrop-blur lg:px-8"><div className="mx-auto flex max-w-6xl items-center justify-between"><Link href="/app" className="text-lg font-black tracking-tight lg:hidden">Concurs<span className="text-primary">Foco</span></Link><p className="hidden text-sm text-muted-foreground lg:block">Área do aluno</p><div className="flex items-center gap-3 text-sm"><span className="hidden text-muted-foreground sm:inline">{nome}</span><span aria-hidden="true" className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">{nome[0]?.toUpperCase()}</span></div></div></header><div className="pb-20">{children}</div><nav aria-label="Navegação móvel" className="fixed inset-x-0 bottom-0 z-20 grid grid-cols-4 border-t bg-background/95 p-2 backdrop-blur lg:hidden">{links.map(({ href, label, icon: Icon }) => <Link key={`mobile-${label}`} href={href} className="flex flex-col items-center gap-1 py-1 text-[11px] text-muted-foreground"><Icon aria-hidden="true" className="h-4 w-4" />{label}</Link>)}</nav></div>
  </div>;
}
