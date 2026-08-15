// Página /cadastro — ROTA FINA (parse → service → respond).
//
// Server component sem lógica: apenas metadata + renderização do formulário
// client (cadastro-form.tsx), que chama a server action cadastroAction
// (actions.ts). LGPD em destaque no formulário (SPEC-frontend.md:95).
import type { Metadata } from "next";

import { CadastroForm } from "./cadastro-form";

export const metadata: Metadata = {
  title: "Criar conta | ConcursFoco",
  description: "Crie sua conta na ConcursFoco e comece a estudar.",
};

export default function CadastroPage() {
  return (
    <div className="space-y-6">
      <div className="space-y-1 text-center">
        <h1 className="text-xl font-semibold tracking-tight">Criar conta</h1>
        <p className="text-sm text-muted-foreground">
          comece a estudar para o seu concurso
        </p>
      </div>
      <CadastroForm />
    </div>
  );
}
