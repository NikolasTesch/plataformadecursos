// Página /login — ROTA FINA (parse → service → respond).
//
// Server component sem lógica: apenas metadata + renderização do formulário
// client (login-form.tsx), que chama a server action loginAction (actions.ts).
import type { Metadata } from "next";

import { LoginForm } from "./login-form";

export const metadata: Metadata = {
  title: "Entrar | ConcursFoco",
  description: "Acesse sua conta na ConcursFoco.",
};

export default function LoginPage() {
  return (
    <div className="space-y-6">
      <div className="space-y-1 text-center">
        <h1 className="text-xl font-semibold tracking-tight">Entrar</h1>
        <p className="text-sm text-muted-foreground">
          acesse sua conta para continuar
        </p>
      </div>
      <LoginForm />
    </div>
  );
}
