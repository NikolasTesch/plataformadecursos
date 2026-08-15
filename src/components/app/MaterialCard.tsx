// MaterialCard — card de material da área do aluno (SPEC-frontend.md:120).
//
// Renderiza UM material com acesso LIBERADO: ícone do tipo
// (pdf|texto|video|questoes|resumo), título e status (`disponivel` ou
// `amostra` — badge). O card é um LINK para a rota de leitura
// `/app/cursos/{cursoSlug}/materiais/{id}` (URL limpa, SPEC-aluno.md:36) —
// a rota de leitura (todo 9) revalida o gating antes de servir conteúdo.
//
// MATERIAL SEM ACESSO NÃO USA ESTE CARD: usa o BloqueadoCard (R12) — nunca
// renderizar conteúdo/link aqui para material bloqueado. O status `concluido`
// (progresso) chega no S3 (SPEC-aluno.md:34).
//
// Server-safe: não usa estado de cliente — apenas Link (next/link).
import Link from "next/link";
import {
  ChevronRight,
  FileStack,
  FileText,
  FileType,
  ListChecks,
  PlaySquare,
  type LucideIcon,
} from "lucide-react";

import { cn } from "@/lib/utils";
import type { MaterialTipo } from "@/generated/prisma/client";

/** Status de acesso exibido pelo card — `concluido` é do S3 (progresso). */
export type StatusMaterialCard = "disponivel" | "amostra";

export interface PropsMaterialCard {
  /** Slug do curso — monta o link da rota de leitura (SPEC-aluno.md:36). */
  cursoSlug: string;
  material: {
    id: string;
    titulo: string;
    tipo: MaterialTipo;
  };
  status: StatusMaterialCard;
}

const ICONE_TIPO: Record<MaterialTipo, LucideIcon> = {
  texto: FileText,
  pdf: FileType,
  video: PlaySquare,
  questoes: ListChecks,
  resumo: FileStack,
};

const LABEL_TIPO: Record<MaterialTipo, string> = {
  pdf: "PDF",
  texto: "Texto",
  video: "Vídeo",
  questoes: "Questões",
  resumo: "Resumo",
};

export function MaterialCard({ cursoSlug, material, status }: PropsMaterialCard) {
  const IconeTipo = ICONE_TIPO[material.tipo];

  return (
    <Link
      href={`/app/cursos/${cursoSlug}/materiais/${material.id}`}
      data-testid={`material-${material.id}`}
      className="group flex items-center gap-3 rounded-lg border bg-card p-4 shadow-sm transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
        <IconeTipo aria-hidden="true" className="h-4 w-4" />
      </span>

      <span className="min-w-0 flex-1">
        <span className="block truncate font-medium text-foreground">
          {material.titulo}
        </span>
        <span className="block text-xs text-muted-foreground">
          {LABEL_TIPO[material.tipo]}
        </span>
      </span>

      {status === "amostra" && (
        <span
          data-testid={`amostra-${material.id}`}
          className={cn(
            "shrink-0 rounded-full border border-primary/40 bg-primary/10",
            "px-2 py-0.5 text-xs font-medium text-primary",
          )}
        >
          Amostra
        </span>
      )}

      <ChevronRight
        aria-hidden="true"
        className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5"
      />
    </Link>
  );
}
