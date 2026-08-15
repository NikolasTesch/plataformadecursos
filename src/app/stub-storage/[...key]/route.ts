// PUT /stub-storage/[...key] — receptor do upload presigned em MODO STUB.
//
// Em produção (R2), o PUT presigned vai direto ao Cloudflare — este endpoint
// não existe lá. No dev/CI sem credenciais (STORAGE_DRIVER=stub), a URL
// gerada pelo stub (http://127.0.0.1:3000/stub-storage/{key} — STUB_BASE_URL
// em src/lib/storage) aponta para esta rota, que persiste os bytes via
// `StubStorageDriver.salvarArquivo` (extensão do driver). Fluxo documentado
// no README de src/lib/storage e no notepad s2-conteudo.
//
// Fino: requireRole(admin) → validação C3 (magic bytes %PDF- + 100MB — o stub
// simula o object store) → persistência local. Não é regra de negócio.
import { NextResponse } from "next/server";

import { requireRole } from "@/lib/auth";
import {
  StubStorageDriver,
  getStorage,
  validarUploadPdf,
} from "@/lib/storage";

interface Props {
  params: Promise<{ key: string[] }>;
}

export async function PUT(request: Request, { params }: Props) {
  try {
    await requireRole("admin");
  } catch {
    return NextResponse.json({ erro: "acesso negado" }, { status: 401 });
  }

  // Endpoint existe APENAS no modo stub (em R2 o upload vai direto ao bucket).
  const storage = getStorage();
  if (!(storage instanceof StubStorageDriver)) {
    return NextResponse.json(
      { erro: "storage não está em modo stub" },
      { status: 404 },
    );
  }

  const { key } = await params;
  const chave = key.join("/");

  const bytes = new Uint8Array(await request.arrayBuffer());
  try {
    validarUploadPdf(bytes, bytes.length);
  } catch {
    return NextResponse.json(
      { erro: "arquivo inválido (PDF esperado, máx. 100MB — C3)" },
      { status: 400 },
    );
  }

  await storage.salvarArquivo(chave, bytes);
  return new NextResponse(null, { status: 200 });
}
