// PdfViewer — visualização de material PDF via iframe (todo 9, leitura).
//
// Recebe a URL ASSINADA (C5, 10 min) — emitida pelo serviço de leitura SOMENTE
// após o gating aprovar (R12). Este componente nunca monta URLs: exibe o que
// o servidor já autorizou.
//
// Props:
//   url    — URL assinada do PDF (createSignedUrl, C5)
//   titulo — título do material (acessibilidade do iframe)
export interface PropsPdfViewer {
  url: string;
  titulo: string;
}

export function PdfViewer({ url, titulo }: PropsPdfViewer) {
  return (
    <div id="material-pdf" className="flex flex-col gap-2">
      <iframe
        src={url}
        title={titulo}
        className="h-[70svh] w-full rounded-xl border border-neutral-200 bg-white"
      />
      <p className="text-xs text-neutral-400">
        Link de acesso válido por 10 minutos (C5).
      </p>
    </div>
  );
}
