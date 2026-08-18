// /app/cursos/[slug]/materiais/[id] — leitura de material (todo 9 do plano
// s2-conteudo).
//
// ROTA FINA + GATING-FIRST (R12): sessão Node (auth + verificarSessaoValida,
// padrão S1) → monta material/curso/entitlements → `resolverLeituraMaterial`
// decide ANTES de qualquer conteúdo. A URL assinada (C5, 10 min) só existe no
// ramo "conteudo" e para tipo pdf — este arquivo nunca chama storage.
//
// Renderização por tipo:
//   texto/resumo → HTML sanitizado (C4 — sanitizarHtml na renderização) +
//                  botão "Imprimir" (US-41, /api/materiais/[id]/imprimir)
//   pdf          → PdfViewer com a URL assinada (C5)
//   video        → placeholder estrutural (S5 implementa o player)
//   questoes     → placeholder estrutural (S4 implementa o bloco)
//   bloqueado    → BloqueadoCard (R12 — zero conteúdo)
//   não encontrado / slug fora do curso → 404
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

import { BloqueadoCard } from "@/components/app/BloqueadoCard";
import { PdfViewer } from "@/components/app/pdf-viewer";
import { auth } from "@/lib/auth/auth";
import { verificarSessaoValida } from "@/lib/auth/verificar-sessao";
import { db } from "@/lib/db";
import { sanitizarHtml } from "@/lib/sanitize";
import { ErroConteudo } from "@/services/conteudo/erros";
import { obterCursoPorSlug } from "@/services/conteudo/cursos";
import {
  montarEntitlementsGating,
  resolverLeituraMaterial,
} from "@/services/conteudo/leitura";
import { obterMaterial } from "@/services/conteudo/materiais";
import { obterProgressoMaterial, progressoCurso } from "@/services/aluno/progresso";
import { ProgressoToggle } from "@/components/app/ProgressoToggle";
import { criarAnotacaoAction } from "@/app/app/anotacoes/actions";
import { listarPorMaterial } from "@/services/aluno/anotacoes";

interface Props {
  params: Promise<{ slug: string; id: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const material = await obterMaterial(id);
  return {
    title: material ? `${material.titulo} | ConcursFoco` : "Material | ConcursFoco",
  };
}

// Estilo mínimo do conteúdo sanitizado (C4) — headings/listas/tabelas perdem
// o reset do Tailwind (preflight) sem estas regras. O 5º layout (leitura
// imersiva) e o prose completo são do slice de frontend.
const ESTILO_CONTEUDO = `
  .conteudo-material { font-size: 1rem; line-height: 1.75; color: #171717; }
  .conteudo-material h1, .conteudo-material h2, .conteudo-material h3,
  .conteudo-material h4, .conteudo-material h5, .conteudo-material h6 {
    font-weight: 700; line-height: 1.3; margin: 1.5em 0 0.5em; color: #0a0a0a;
  }
  .conteudo-material h1 { font-size: 1.5rem; }
  .conteudo-material h2 { font-size: 1.3rem; }
  .conteudo-material h3 { font-size: 1.15rem; }
  .conteudo-material p { margin: 0.75em 0; }
  .conteudo-material ul, .conteudo-material ol { margin: 0.75em 0; padding-left: 1.5em; }
  .conteudo-material ul { list-style: disc; }
  .conteudo-material ol { list-style: decimal; }
  .conteudo-material a { color: #2563eb; text-decoration: underline; }
  .conteudo-material img { max-width: 100%; height: auto; border-radius: 0.5rem; }
  .conteudo-material pre { background: #f5f5f5; padding: 0.75rem; border-radius: 0.5rem;
    overflow-x: auto; font-size: 0.875rem; margin: 0.75em 0; }
  .conteudo-material code { font-family: ui-monospace, monospace; font-size: 0.9em; }
  .conteudo-material pre code { font-size: 0.875rem; }
  .conteudo-material blockquote { border-left: 3px solid #d4d4d4; padding-left: 1rem;
    color: #525252; margin: 0.75em 0; }
  .conteudo-material table { border-collapse: collapse; width: 100%; margin: 0.75em 0; }
  .conteudo-material th, .conteudo-material td { border: 1px solid #e5e5e5;
    padding: 0.375rem 0.75rem; text-align: left; }
  .conteudo-material th { background: #fafafa; font-weight: 600; }
`;

export default async function PaginaLeituraMaterial({ params }: Props) {
  const { slug, id } = await params;

  // 1. Sessão Node (padrão S1 — revogação A3 via tokenVersion/bloqueado).
  const session = await auth();
  if (!session?.user) redirect("/login");
  const sessaoValida = await verificarSessaoValida(session);
  if (!sessaoValida) redirect("/login");

  // 2. Dados para a DECISÃO (nada de conteúdo ainda).
  let curso;
  let material;
  try {
    [curso, material] = await Promise.all([obterCursoPorSlug(slug), obterMaterial(id)]);
  } catch (erro) {
    // Curso inexistente (obterCursoPorSlug lança ErroConteudo nao_encontrado).
    if (erro instanceof ErroConteudo && erro.code === "nao_encontrado") notFound();
    throw erro;
  }
  if (material === null) notFound();

  // O material pertence ao curso do slug? (segmento da URL é contrato)
  const modulo = await db.modules.findUnique({
    where: { id: material.module_id },
    select: { course_id: true },
  });
  if (modulo === null || modulo.course_id !== curso.id) notFound();

  const linhas = await db.entitlements.findMany({
    where: { user_id: session.user.id },
    include: { product: true },
  });

  // 3. GATING-FIRST: decisão pura (R12) + URL assinada só no ramo permitido (C5).
  const resultado = await resolverLeituraMaterial(
    {
      userId: session.user.id,
      sessaoValida,
      material,
      curso: { id: curso.id, incluido_assinatura: curso.incluido_assinatura },
      entitlements: montarEntitlementsGating(linhas),
    },
  );

  if (resultado.estado === "nao_encontrado") notFound();

  if (resultado.estado === "bloqueado") {
    return (
      <main className="mx-auto max-w-[72ch] px-6 py-10">
        <BloqueadoCard
          material={{ id: material.id, titulo: material.titulo }}
          motivo={resultado.motivo}
        />
      </main>
    );
  }

  // 4. Conteúdo autorizado — renderização por tipo.
  const m = resultado.material;
  const [concluido, percentual, notas] = await Promise.all([
    obterProgressoMaterial(session.user.id, m.id),
    progressoCurso(session.user.id, curso.id),
    listarPorMaterial(session.user.id, m.id),
  ]);
  return (
    <main className="mx-auto max-w-[72ch] px-6 py-10">
      <header className="mb-8">
        <p className="text-sm text-neutral-500">{curso.nome}</p>
        <h1 id="material-titulo" className="mt-1 text-2xl font-bold tracking-tight">
          {m.titulo}
        </h1>
        {m.tipo === "resumo" && (
          <span className="mt-2 inline-block rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-800">
            Resumo
          </span>
        )}
        <p className="mt-2 text-sm text-neutral-500">
          Progresso do curso: {percentual}% {concluido ? "· concluído" : ""}
        </p>
      </header>

      {(m.tipo === "texto" || m.tipo === "resumo") && (
        <>
          {/* US-41: impressão → PDF gerado no servidor com gating próprio (R12) */}
          <a
            id="material-imprimir"
            href={`/api/materiais/${m.id}/imprimir`}
            target="_blank"
            rel="noopener noreferrer"
            className="mb-6 inline-flex items-center gap-2 rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-700"
          >
            Imprimir
          </a>
          {/* C4: NUNCA renderizar conteudo_html cru — sempre sanitizarHtml */}
          <style>{ESTILO_CONTEUDO}</style>
          <article
            id="material-conteudo"
            className="conteudo-material"
            dangerouslySetInnerHTML={{ __html: sanitizarHtml(m.conteudo_html ?? "") }}
          />
        </>
      )}

      {m.tipo === "pdf" &&
        (resultado.urlPdf !== null ? (
          <PdfViewer url={resultado.urlPdf} titulo={m.titulo} />
        ) : (
          <p className="text-sm text-neutral-500">Arquivo indisponível.</p>
        ))}

      {m.tipo === "video" && (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-neutral-300 p-10 text-center">
          <p className="text-sm text-neutral-500">
            Vídeo disponível no S5 (player Bunny Stream).
          </p>
        </div>
      )}

      {m.tipo === "questoes" && (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-neutral-300 p-10 text-center">
          <p className="text-sm text-neutral-500">
            Bloco de questões disponível no S4.
          </p>
        </div>
      )}
      <ProgressoToggle materialId={m.id} cursoSlug={slug} concluido={concluido} />
      <section className="mt-8 space-y-3 border-t pt-6">
        <h2 className="text-lg font-semibold">Minha anotação</h2>
        {notas.map((nota) => <p key={nota.id} className="whitespace-pre-wrap rounded border p-3 text-sm">{nota.conteudo}</p>)}
        <form action={criarAnotacaoAction} className="space-y-2">
          <input type="hidden" name="material_id" value={m.id} />
          <input type="hidden" name="caminho" value={`/app/cursos/${slug}/materiais/${m.id}`} />
          <textarea name="conteudo" maxLength={10000} required placeholder="Escreva uma anotação (máx. 10.000 caracteres)" className="min-h-28 w-full rounded border p-3" />
          <button className="rounded bg-neutral-900 px-4 py-2 text-sm text-white">Adicionar anotação</button>
        </form>
      </section>
    </main>
  );
}
