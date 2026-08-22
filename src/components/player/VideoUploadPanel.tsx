"use client";

import { useRef, useState } from "react";
import * as tus from "tus-js-client";
import type { VideoStatus } from "@/generated/prisma/client";
import { iniciarUploadVideoAction } from "@/app/admin/materiais/actions";

const MAX_BYTES = 2 * 1024 * 1024 * 1024;
const ACCEPT = ["mp4", "mov", "mkv", "avi"];

/** Identifica o arquivo dentro do vídeo Bunny que recebeu as credenciais. */
export function criarFingerprintUpload(
  materialId: string,
  videoId: string,
  file: Pick<File, "name" | "size" | "lastModified">,
): string {
  return JSON.stringify([
    "concursfoco-video",
    materialId,
    videoId,
    file.name,
    file.size,
    file.lastModified,
  ]);
}

interface Props {
  materialId?: string;
  titulo: string;
  status: VideoStatus | null;
  /** Mensagem persistida pelo callback Bunny; o cliente apenas a exibe. */
  erroPersistido?: string | null;
  disabled?: boolean;
}

export function VideoUploadPanel({ materialId, titulo, status, erroPersistido, disabled }: Props) {
  const uploadRef = useRef<tus.Upload | null>(null);
  const [progress, setProgress] = useState(0);
  const [nome, setNome] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(erroPersistido ?? null);
  const [enviando, setEnviando] = useState(false);
  const [estadoVisual, setEstadoVisual] = useState<VideoStatus | null>(status);

  async function selecionar(file: File | undefined) {
    if (!file || !materialId) return;
    const extensao = file.name.toLowerCase().split(".").pop() ?? "";
    if (!ACCEPT.includes(extensao) || file.size > MAX_BYTES) {
      setErro("Escolha um MP4, MOV, MKV ou AVI de até 2GB.");
      return;
    }
    setNome(file.name);
    setErro(null);
    setProgress(0);
    setEnviando(true);

    const credenciaisForm = new FormData();
    credenciaisForm.set("material_id", materialId);
    credenciaisForm.set("file_name", file.name);
    credenciaisForm.set("mime_type", file.type);
    credenciaisForm.set("size", String(file.size));
    const resposta = await iniciarUploadVideoAction(credenciaisForm);
    if (resposta.erro || !resposta.tus) {
      setErro(resposta.erro?.mensagem ?? "Não foi possível preparar o envio.");
      setEnviando(false);
      return;
    }
    setEstadoVisual("processando");
    const tusCredenciais = resposta.tus;

    const upload = new tus.Upload(file, {
      endpoint: tusCredenciais.endpoint,
      headers: tusCredenciais.headers,
      metadata: { filetype: file.type, title: titulo },
      fingerprint: async () => criarFingerprintUpload(materialId, tusCredenciais.videoId, file),
      removeFingerprintOnSuccess: true,
      retryDelays: [0, 3000, 5000, 10000, 20000],
      onError: () => {
        setEstadoVisual("erro");
        setErro("Não foi possível enviar o vídeo. Você pode tentar novamente.");
        setEnviando(false);
      },
      onProgress: (sent, total) => setProgress(Math.round((sent / total) * 100)),
      onSuccess: () => setEnviando(false),
    });
    uploadRef.current = upload;
    try {
      const anteriores = await upload.findPreviousUploads();
      if (anteriores.length > 0) upload.resumeFromPreviousUpload(anteriores[0]);
    } catch {
      // A ausência do histórico não impede um novo upload.
    }
    upload.start();
  }

  const badge = estadoVisual === "pronto"
    ? "Pronto"
    : estadoVisual === "erro"
      ? "Erro"
      : estadoVisual === "processando"
        ? "Processando"
        : "Aguardando vídeo";
  const badgeClass = estadoVisual === "pronto"
    ? "bg-emerald-100 text-emerald-800"
    : estadoVisual === "erro"
      ? "bg-red-100 text-red-800"
      : "bg-slate-100 text-slate-700";

  return (
    <section aria-labelledby="video-upload-title" className="space-y-4 rounded-xl border border-slate-200 bg-slate-50/70 p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 id="video-upload-title" className="font-semibold text-slate-900">Vídeo da aula</h2>
          <p className="mt-1 text-sm text-slate-500">Envio direto e seguro para o Bunny Stream.</p>
        </div>
        <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${badgeClass}`}>{badge}</span>
      </div>
      {!materialId ? (
        <p className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-800">Salve o material para liberar o envio do vídeo.</p>
      ) : (
        <>
          <label htmlFor="material-video-file" className="block cursor-pointer rounded-lg border-2 border-dashed border-slate-300 bg-white p-5 text-center transition hover:border-blue-500 focus-within:ring-2 focus-within:ring-blue-500">
            <span className="text-sm font-medium text-slate-800">{estadoVisual === "erro" ? "Reenviar vídeo" : "Escolher arquivo de vídeo"}</span>
            <span className="mt-1 block text-xs text-slate-500">MP4, MOV, MKV ou AVI · até 2GB</span>
            <input id="material-video-file" type="file" accept="video/mp4,video/quicktime,video/x-matroska,video/x-msvideo,.mp4,.mov,.mkv,.avi" disabled={disabled || enviando} onChange={(event) => selecionar(event.target.files?.[0])} className="sr-only" />
          </label>
          {nome && <p className="truncate text-sm text-slate-600">{nome}</p>}
          {enviando && <div aria-label={`Enviado ${progress}%`} role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress} className="h-2 overflow-hidden rounded-full bg-slate-200"><div className="h-full bg-blue-600 transition-[width]" style={{ width: `${progress}%` }} /></div>}
          {enviando && <p className="text-xs text-slate-500">Enviando… {progress}%</p>}
          {erro && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800"><strong>Falha na transcodificação:</strong> {erro}</p>}
        </>
      )}
    </section>
  );
}
