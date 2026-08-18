import { notFound } from "next/navigation";

import { verificar } from "@/services/aluno/certificados";

export default async function VerificarCertificado({ params }: { params: Promise<{ codigo: string }> }) {
  const { codigo } = await params;
  const certificado = await verificar(codigo);
  if (!certificado) notFound();
  return (
    <main className="mx-auto max-w-xl space-y-4 px-6 py-16">
      <p className="text-sm text-muted-foreground">Certificado válido</p>
      <h1 className="text-2xl font-bold">{certificado.nome}</h1>
      <p>Concluiu o curso <strong>{certificado.curso}</strong>.</p>
      <p className="text-sm text-muted-foreground">Concluído em {certificado.data.toLocaleDateString("pt-BR")}</p>
    </main>
  );
}
