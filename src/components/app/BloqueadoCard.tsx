// BloqueadoCard — material sem acesso do aluno (SPEC-frontend.md:121).
//
// Único card para material bloqueado (R12, SPEC-aluno.md:35,:44): ícone de
// cadeado + título + texto de orientação ("assine para acessar"). NUNCA
// recebe nem renderiza conteúdo (sem conteudo_html, sem arquivo_key, sem URL
// assinada, sem link de vídeo, sem gabarito) e NÃO possui link para a rota de
// leitura — a aquisição (CTA "Assinar"/"Comprar" conforme produto) é do S6.
//
// O chamador (página do curso, todo 8; rota de leitura, todo 9) decide o
// bloqueio NO SERVIDOR via gating (podeAcessarMaterial) e passa apenas
// { id, titulo } + o motivo opcional (R12 — exposto como data-motivo para E2E).
//
// Server-safe: sem estado de cliente, sem links.
import { LockKeyhole } from "lucide-react";

import type { MotivoGating } from "@/services/gating";

export interface PropsBloqueadoCard {
  material: {
    id: string;
    titulo: string;
  };
  /** Motivo do gating (R12) — data-motivo para E2E estável (todo 14). */
  motivo?: MotivoGating;
}

export function BloqueadoCard({ material, motivo }: PropsBloqueadoCard) {
  return (
    <div
      data-testid={`bloqueado-${material.id}`}
      data-motivo={motivo ?? "bloqueado"}
      className="flex items-center gap-3 rounded-lg border border-dashed bg-muted/40 p-4"
      aria-label={`Material bloqueado: ${material.titulo}`}
    >
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
        <LockKeyhole aria-hidden="true" className="h-4 w-4" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate font-medium text-foreground">
          {material.titulo}
        </span>
        <span className="block text-xs text-muted-foreground">
          Material bloqueado — assine para acessar
        </span>
      </span>
    </div>
  );
}
