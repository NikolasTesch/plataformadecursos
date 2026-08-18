"use client";

export default function AppError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <main role="alert" className="mx-auto max-w-xl px-4 py-16 text-center"><h1 className="text-2xl font-bold">Não foi possível carregar esta área</h1><p className="mt-2 text-sm text-muted-foreground">Tente novamente. Seus dados continuam protegidos.</p><button type="button" onClick={reset} className="mt-6 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">Tentar novamente</button></main>;
}
