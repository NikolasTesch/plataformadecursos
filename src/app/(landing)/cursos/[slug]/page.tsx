// Sales page pública do curso — /cursos/[slug] (US-44, SPEC-conteudo §3.8).
//
// ROTA FINA (AGENTS.md §6): busca os dados (obterCursoPublico) e renderiza;
// toda regra de negócio vive nos helpers puros (./helpers.ts — C9/C10/preço),
// testados unitariamente em tests/unit/sales-page.test.ts.
//
// SSG/ISR (SPEC-landing R-L6:74): generateStaticParams lista os cursos com
// ≥1 material publicado; `revalidate = 3600` regrava a página no fundo a
// cada hora (DECISÃO 2026-08-15 — ver notepad): equilíbrio entre frescor
// (novo curso publicado aparece em ≤1h — C10) e custo de revalidação;
// páginas servidas estáticas mantêm a navegação P95 < 2s.
//
// R12/C9: a grade NUNCA envia conteúdo — o select do Prisma traz só
// { id, titulo, tipo, amostra } e montarGradeCurso constrói shape novo com
// esses campos (defesa em profundidade). Amostra (R4) é o ÚNICO material com
// link (para a página do material — /app/* redireciona a visitante não
// autenticado para /login via middleware; a rota de leitura chega no todo 9).
//
// C10: curso sem nenhum material publicado → 404 (notFound), nunca "curso
// vazio" público.
//
// Preço (S2): products.tipo=venda_unica NÃO tem campo de preço no schema do
// S1 (modelo-de-dados.md:147-151 só tem preços de assinatura) — o campo
// chega no S6 (SPEC-pagamentos). Em S2: venda_unica ativo ⇒ CTA "Comprar
// curso" (link, sem valor); badge "Incluído na assinatura" quando
// incluido_assinatura; formatarPreco já pronto/testado para o S6.
//
// CTAs são LINKS APENAS (sem lógica de pagamento — S6): trial → /precos,
// assinar → /precos#precos, comprar → /checkout?curso=slug (rota chega no
// S6; link login-gated per D-P2).
import { cache } from "react";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  BookOpen,
  FileText,
  FileType,
  ListChecks,
  Lock,
  Play,
  Star,
  type LucideIcon,
} from "lucide-react";

import { db } from "@/lib/db";
import { sanitizarHtml } from "@/lib/sanitize";
import {
  condicaoCursoVisivel,
  montarGradeCurso,
  obterBadgePreco,
  type CursoSales,
  type ItemGradeCurso,
  type ModuloGrade,
} from "./helpers";

/** ISR: página regravada no fundo a cada 1h (decisão 2026-08-15, notepad). */
export const revalidate = 3600;

interface Props {
  params: Promise<{ slug: string }>;
}

interface DadosSalesCurso {
  curso: CursoSales;
  totalPublicados: number;
  modulos: ModuloGrade[];
  produtoVendaUnicaAtivo: boolean;
  reviews: { id: string; nota: number; comentario: string | null; autor: string }[];
  mediaReviews: number | null;
  totalReviews: number;
}

/**
 * Busca única dos dados públicos do curso (memoizada por render via `cache`
 * do React — generateMetadata e a página compartilham a mesma consulta).
 * O select dos materiais traz SÓ { id, titulo, tipo, amostra } — R12: o
 * conteúdo (conteudo_html/arquivo_key) nem chega a ser lido do banco.
 */
const obterCursoPublico = cache(
  async (slug: string): Promise<DadosSalesCurso | null> => {
    const curso = await db.courses.findUnique({
      where: { slug },
      include: {
        modules: {
          orderBy: { ordem: "asc" },
          include: {
            materials: {
              where: { status: "publicado" }, // R5: rascunho invisível
              orderBy: { ordem: "asc" },
              select: { id: true, titulo: true, tipo: true, amostra: true },
            },
          },
        },
        products: {
          where: { tipo: "venda_unica", status: "ativo" },
          select: { id: true },
        },
        course_reviews: {
          where: { status: "aprovado" }, // só aprovadas aparecem (US-48)
          orderBy: { criado_em: "desc" },
          take: 3, // até 3 comentários recentes
          select: {
            id: true,
            nota: true,
            comentario: true,
            user: { select: { nome: true } },
          },
        },
      },
    });
    if (!curso) return null;

    // C10: total de materiais publicados = soma dos materiais (a include já
    // filtra status publicado por módulo).
    const totalPublicados = curso.modules.reduce(
      (soma, modulo) => soma + modulo.materials.length,
      0,
    );

    // Média + contagem de TODAS as aprovadas (não só das 3 exibidas).
    const agregado = await db.course_reviews.aggregate({
      where: { course_id: curso.id, status: "aprovado" },
      _avg: { nota: true },
      _count: true,
    });

    return {
      curso: {
        slug: curso.slug,
        nome: curso.nome,
        descricao: curso.descricao,
        imagem_url: curso.imagem_url,
        incluido_assinatura: curso.incluido_assinatura,
      },
      totalPublicados,
      modulos: curso.modules,
      produtoVendaUnicaAtivo: curso.products.length > 0,
      reviews: curso.course_reviews.map((r) => ({
        id: r.id,
        nota: r.nota,
        comentario: r.comentario,
        autor: r.user.nome,
      })),
      mediaReviews: agregado._avg.nota,
      totalReviews: agregado._count,
    };
  },
);

/**
 * generateStaticParams (SSG/ISR): slugs dos cursos com ≥1 material publicado
 * (publicado-only — C10). Slugs fora da lista são gerados on-demand e
 * retornam 404 quando o curso não existe ou está vazio.
 */
export async function generateStaticParams(): Promise<{ slug: string }[]> {
  const cursos = await db.courses.findMany({
    where: {
      modules: { some: { materials: { some: { status: "publicado" } } } },
    },
    select: { slug: true },
  });
  return cursos.map((curso) => ({ slug: curso.slug }));
}

/** SEO por rota (R-L6:71-75): title/description únicos + Open Graph. */
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const dados = await obterCursoPublico(slug);
  // C10: curso inexistente ou sem material publicado não tem página.
  if (!dados || !condicaoCursoVisivel(dados.curso, dados.totalPublicados)) {
    notFound();
  }

  const { curso } = dados;
  const descricao =
    curso.descricao ??
    `${curso.nome} — materiais, resumos e questões para concursos públicos no ConcursFoco.`;
  const title = `${curso.nome} | ConcursFoco`;

  return {
    title,
    description: descricao,
    alternates: { canonical: `/cursos/${curso.slug}` },
    openGraph: {
      title,
      description: descricao,
      siteName: "ConcursFoco",
      type: "website",
      ...(curso.imagem_url ? { images: [{ url: curso.imagem_url }] } : {}),
    },
  };
}

const ROTULO_TIPO: Record<ItemGradeCurso["tipo"], string> = {
  pdf: "PDF",
  texto: "Texto",
  video: "Vídeo",
  questoes: "Questões",
  resumo: "Resumo",
};

const ICONE_TIPO: Record<ItemGradeCurso["tipo"], LucideIcon> = {
  pdf: FileText,
  texto: FileType,
  video: Play,
  questoes: ListChecks,
  resumo: BookOpen,
};

/** Item da grade (C9): título + tipo; amostra vira link (R4), bloqueado vira
 * cadeado + texto — SEM link (nunca leva ao conteúdo). */
function MaterialItem({
  material,
  cursoSlug,
}: {
  material: ItemGradeCurso;
  cursoSlug: string;
}) {
  const Icone = ICONE_TIPO[material.tipo];
  return (
    <li className="flex items-center gap-3 rounded-md border bg-card px-3 py-2.5 shadow-sm">
      <Icone className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
      <span className="min-w-0 flex-1 truncate text-sm font-medium">
        {material.titulo}
      </span>
      <span className="shrink-0 text-xs text-muted-foreground">
        {ROTULO_TIPO[material.tipo]}
      </span>
      {material.amostra ? (
        // R4: única exceção — a amostra do curso é legível. A rota de leitura
        // (todo 9) valida gating; visitante sem sessão é redirecionado ao
        // login pelo middleware (roteiro de amostra, notepad).
        <Link
          href={`/app/cursos/${cursoSlug}/materiais/${material.id}`}
          className="shrink-0 text-xs font-medium text-primary hover:underline"
        >
          Ler amostra grátis
        </Link>
      ) : (
        <span className="inline-flex shrink-0 items-center gap-1 text-xs text-muted-foreground">
          <Lock className="h-3 w-3" aria-hidden />
          Assine para acessar
        </span>
      )}
    </li>
  );
}

export default async function SalesCursoPage({ params }: Props) {
  const { slug } = await params;
  const dados = await obterCursoPublico(slug);
  if (!dados) notFound();

  // C10: curso rascunho (sem material publicado) → 404.
  if (!condicaoCursoVisivel(dados.curso, dados.totalPublicados)) notFound();

  const grade = montarGradeCurso(dados.modulos);
  const badge = obterBadgePreco({
    incluido_assinatura: dados.curso.incluido_assinatura,
    produto_venda_unica_ativo: dados.produtoVendaUnicaAtivo,
    preco_venda_unica_cents: null, // campo de preço da venda única chega no S6
  });
  const mediaFormatada =
    dados.mediaReviews !== null
      ? dados.mediaReviews.toFixed(1).replace(".", ",")
      : null;

  // Dados estruturados Course (R-L6:73) — mínimo: name/description/provider.
  // `offers` é omitido até o S6 ter preço de venda única (R-L6 "if price
  // known" — sem preço, sem offers).
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Course",
    name: dados.curso.nome,
    description: dados.curso.descricao ?? undefined,
    provider: { "@type": "Organization", name: "ConcursFoco" },
  };

  return (
    <article className="space-y-10">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* Cabeçalho: nome, descrição, imagem e badge de preço */}
      <div className="flex flex-wrap items-start justify-between gap-6">
        <div className="min-w-0 max-w-2xl">
          <h1 className="text-3xl font-bold tracking-tight">
            {dados.curso.nome}
          </h1>
          {dados.curso.descricao && (
            <p className="mt-2 text-muted-foreground">{dados.curso.descricao}</p>
          )}
          {badge && (
            <span className="mt-3 inline-flex items-center rounded-full border border-primary/40 bg-primary/10 px-3 py-1 text-sm font-medium text-primary">
              {badge}
            </span>
          )}
        </div>
        {dados.curso.imagem_url && (
          <Image
            src={dados.curso.imagem_url}
            alt=""
            width={256}
            height={160}
            unoptimized
            className="h-40 w-64 rounded-lg border object-cover"
          />
        )}
      </div>

      {/* CTAs — LINKS APENAS (S6 implementa checkout/pagamento) */}
      <div className="flex flex-wrap items-center gap-3">
        <Link
          href="/precos"
          className="inline-flex h-10 items-center justify-center rounded-md bg-primary px-5 text-sm font-medium text-primary-foreground shadow-sm transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          Começar trial grátis
        </Link>
        <Link
          href="/precos#precos"
          className="inline-flex h-10 items-center justify-center rounded-md border border-input bg-background px-5 text-sm font-medium shadow-sm transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          Assinar e acessar
        </Link>
        {dados.produtoVendaUnicaAtivo && (
          <Link
            href={`/checkout?curso=${dados.curso.slug}`}
            className="inline-flex h-10 items-center justify-center rounded-md border border-input bg-background px-5 text-sm font-medium shadow-sm transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            Comprar curso
          </Link>
        )}
      </div>

      {/* Grade resumida (C9): títulos + tipos — NUNCA conteúdo (R12) */}
      <section aria-labelledby="grade" className="space-y-4">
        <div>
          <h2 id="grade" className="text-xl font-semibold tracking-tight">
            O que você vai estudar
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {dados.totalPublicados}{" "}
            {dados.totalPublicados === 1 ? "material publicado" : "materiais publicados"}{" "}
            — conteúdo completo para assinantes
          </p>
        </div>
        {grade.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            materiais em breve
          </p>
        ) : (
          <ol className="space-y-6">
            {grade.map((modulo) => (
              <li key={modulo.id}>
                <h3 className="text-base font-semibold">{modulo.nome}</h3>
                <ul className="mt-2 space-y-2">
                  {modulo.materiais.map((material) => (
                    <MaterialItem
                      key={material.id}
                      material={material}
                      cursoSlug={dados.curso.slug}
                    />
                  ))}
                </ul>
              </li>
            ))}
          </ol>
        )}
      </section>

      {/* Avaliações aprovadas (US-47/48) — LEITURA APENAS, sem formulário */}
      {dados.totalReviews > 0 && (
        <section aria-labelledby="avaliacoes" className="border-t pt-8">
          <h2 id="avaliacoes" className="text-xl font-semibold tracking-tight">
            Avaliações
          </h2>
          <p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
            <Star className="h-4 w-4 fill-amber-400 text-amber-400" aria-hidden />
            <span className="font-semibold text-foreground">
              {mediaFormatada}
            </span>
            <span aria-hidden>·</span>
            <span>
              {dados.totalReviews}{" "}
              {dados.totalReviews === 1 ? "avaliação" : "avaliações"}
            </span>
          </p>
          <ul className="mt-4 space-y-3">
            {dados.reviews.map((review) => (
              <li key={review.id} className="rounded-md border bg-card p-3">
                {/* CO8: comentário sanitizado na renderização (C4/whitelist) */}
                <p
                  className="text-sm"
                  dangerouslySetInnerHTML={{
                    __html: sanitizarHtml(review.comentario ?? ""),
                  }}
                />
                <p className="mt-1 text-xs text-muted-foreground">
                  {review.autor} · nota {review.nota}
                </p>
              </li>
            ))}
          </ul>
        </section>
      )}
    </article>
  );
}
