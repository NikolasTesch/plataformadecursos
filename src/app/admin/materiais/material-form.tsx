// Formulário de MATERIAL por tipo (client) — US-05/06/09/40.
//
// UX sugar sobre as server actions de materiais/actions.ts. O formulário se
// adapta ao TIPO:
//   - texto/resumo → textarea para conteudo_html (HTML simples; o editor
//     rich-text completo é slice de frontend — decisão do plano S2, todo 12);
//   - pdf → upload presigned DIRETO: valida %PDF- (C3, espelho UX) + limite
//     100MB, pede a URL pré-assinada (action → storage), faz PUT do arquivo
//     direto na URL (bytes nunca passam pelo servidor) e guarda a arquivo_key;
//   - video → upload direto Bunny/TUS (a action devolve apenas credenciais);
//   - questoes → aviso estrutural (formulário real é S4).
//
// Regras de negócio TODAS no serviço: estrutura por tipo, C2 (máx. 1 amostra
// por curso — erro exibido como alerta), R11 (vídeo com erro não publica),
// R5 (despublicação imediata). O envio manual do FormData (aoEnviar) existe
// para controlar exatamente quais campos vão (status só quando mudou — um
// save comum nunca despublica por acidente).
//
// Seletores estáveis para E2E: #material-titulo, #material-tipo,
// #material-conteudo, #material-amostra, #material-ordem, #material-status,
// #material-arquivo, #material-pdf, #material-video-provider,
// #material-video-status; erros com role="alert".
"use client";

import Link from "next/link";
import { useEffect, useState, useTransition } from "react";
import { cn } from "@/lib/utils";
import type {
  MaterialStatus,
  MaterialTipo,
  VideoStatus,
} from "@/generated/prisma/client";

import {
  atualizarMaterialAction,
  criarMaterialAction,
  criarPresignUploadAction,
  despublicarMaterialAction,
  publicarMaterialAction,
  type EstadoMaterial,
} from "./actions";
import { VideoUploadPanel } from "@/components/player/VideoUploadPanel";

const ESTADO_INICIAL: EstadoMaterial = {};

const CLASSE_INPUT =
  "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 " +
  "text-sm shadow-sm transition-colors placeholder:text-muted-foreground " +
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring " +
  "disabled:cursor-not-allowed disabled:opacity-50";

const CLASSE_TEXTAREA =
  "flex min-h-48 w-full rounded-md border border-input bg-transparent px-3 py-2 " +
  "text-sm shadow-sm transition-colors placeholder:text-muted-foreground " +
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring " +
  "disabled:cursor-not-allowed disabled:opacity-50";

const LABEL_TIPO: Record<MaterialTipo, string> = {
  pdf: "PDF",
  texto: "Texto",
  video: "Vídeo",
  questoes: "Questões",
  resumo: "Resumo",
};

/** Espelho do MAX_PDF_BYTES do storage (C3) — o servidor revalida no presign. */
const LIMITE_PDF_BYTES = 100 * 1024 * 1024;

/** Espelho da validação de magic bytes do storage (C3): %PDF- na 1ª janela. */
function temMagicPdf(bytes: Uint8Array): boolean {
  const alvo = "%PDF-";
  const janela = Math.min(bytes.length, 1024);
  for (let i = 0; i + alvo.length <= janela; i++) {
    let bateu = true;
    for (let j = 0; j < alvo.length; j++) {
      if (bytes[i + j] !== alvo.charCodeAt(j)) {
        bateu = false;
        break;
      }
    }
    if (bateu) return true;
  }
  return false;
}

export interface MaterialFormDados {
  /** Presente apenas em edição (novo → undefined). */
  id?: string;
  module_id: string;
  curso_id: string;
  curso_nome: string;
  modulo_nome: string;
  tipo: MaterialTipo;
  titulo?: string;
  ordem?: number;
  status?: MaterialStatus;
  amostra?: boolean;
  conteudo_html?: string | null;
  arquivo_key?: string | null;
  video_provider_id?: string | null;
  video_status?: VideoStatus | null;
  video_erro?: string | null;
  publicado_em?: string | null;
}

interface Props {
  dados: MaterialFormDados;
}

type EstadoArquivo =
  | { fase: "nada" | "enviando" | "pronto"; nome?: string; erro?: string }
  | { fase: "erro"; nome?: string; erro: string };

export function MaterialForm({ dados }: Props) {
  const modo = dados.id !== undefined ? "editar" : "novo";
  const actionEnviar =
    modo === "novo" ? criarMaterialAction : atualizarMaterialAction;

  // Estado de erro/pendência local: a action é chamada DIRETA (aoEnviar) para
  // termos acesso ao resultado (ok/erro) além do estado — useActionState não
  // devolve o retorno da action ao chamador.
  const [state, setState] = useState<EstadoMaterial>(ESTADO_INICIAL);
  const [pendente, setPendente] = useState(false);

  const [titulo, setTitulo] = useState(dados.titulo ?? "");
  const [tipo, setTipo] = useState<MaterialTipo>(dados.tipo);
  const [ordem, setOrdem] = useState(
    dados.ordem !== undefined ? String(dados.ordem) : "",
  );
  const statusInicial = dados.status ?? "rascunho";
  const [status, setStatus] = useState<MaterialStatus>(statusInicial);
  const [amostra, setAmostra] = useState(dados.amostra ?? false);
  const [conteudoHtml, setConteudoHtml] = useState(dados.conteudo_html ?? "");
  const [arquivo, setArquivo] = useState<EstadoArquivo>(
    dados.arquivo_key
      ? { fase: "pronto", nome: dados.arquivo_key }
      : { fase: "nada" },
  );
  const [erroPublicacao, setErroPublicacao] = useState<string | null>(null);
  const [salvoEm, setSalvoEm] = useState<number | null>(null);
  const [pendentePublicar, iniciarPublicar] = useTransition();

  // Aviso efêmero de sucesso (auto-esconde; setState assíncrono dentro do
  // timeout é permitido pela regra de hooks — o disparo é no handler aoEnviar).
  useEffect(() => {
    if (salvoEm === null) return;
    const t = setTimeout(() => setSalvoEm(null), 2500);
    return () => clearTimeout(t);
  }, [salvoEm]);

  const erroCampo = (campo: string) =>
    state.erro?.campo === campo ? state.erro.mensagem : undefined;
  const erroTitulo = erroCampo("titulo");
  const erroOrdem = erroCampo("ordem");
  const erroAmostra = erroCampo("amostra");
  const erroConteudo = erroCampo("conteudo_html");
  const erroArquivoKey = erroCampo("arquivo_key");

  function montarFormData(): FormData {
    const fd = new FormData();
    if (modo === "editar") fd.set("id", dados.id as string);
    fd.set("module_id", dados.module_id);
    fd.set("curso_id", dados.curso_id);
    fd.set("titulo", titulo);
    fd.set("tipo", tipo);
    if (ordem.trim() !== "") fd.set("ordem", ordem);
    // Status apenas quando mudou (ou na criação) — save comum não publica/despublica.
    if (modo === "novo" || status !== statusInicial) fd.set("status", status);
    if (amostra) fd.set("amostra", "on");
    if (tipo === "texto" || tipo === "resumo") {
      fd.set("conteudo_html", conteudoHtml);
    }
    if (tipo === "pdf") {
      const chave =
        arquivo.fase === "pronto"
          ? (arquivo.nome ?? "")
          : (dados.arquivo_key ?? "");
      if (chave !== "") fd.set("arquivo_key", chave);
    }
    if (tipo === "video") {
      // IDs e status são exclusivamente controlados pela action de upload e
      // pelo webhook Bunny; nunca entram no formulário genérico.
    }
    return fd;
  }

  async function aoEnviar(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErroPublicacao(null);
    setSalvoEm(null);
    // Validação nativa (required) roda antes do submit event; o envio manual
    // do FormData permite mandar apenas os campos que devem mudar.
    setPendente(true);
    setState(ESTADO_INICIAL);
    const resultado = await actionEnviar(ESTADO_INICIAL, montarFormData());
    setPendente(false);
    setState(resultado);
    if (resultado.ok) setSalvoEm(Date.now());
  }

  async function aoSelecionarPdf(arquivoEscolhido: File | undefined) {
    if (!arquivoEscolhido) return;
    // C3 no cliente (espelho UX): magic bytes %PDF- + limite 100MB. O servidor
    // revalida — limite no presign (action), magic bytes no endpoint stub (dev).
    if (arquivoEscolhido.size > LIMITE_PDF_BYTES) {
      setArquivo({
        fase: "erro",
        erro: "o arquivo excede o limite de 100MB",
      });
      return;
    }
    const cabecalho = new Uint8Array(
      await arquivoEscolhido.slice(0, 1024).arrayBuffer(),
    );
    if (!temMagicPdf(cabecalho)) {
      setArquivo({
        fase: "erro",
        nome: arquivoEscolhido.name,
        erro: "o arquivo precisa ser um PDF válido (cabeçalho %PDF-)",
      });
      return;
    }

    setArquivo({ fase: "enviando", nome: arquivoEscolhido.name });

    // Chave do objeto: materials/{cursoId}/{id}.pdf — id provisório (uuid) na
    // criação; o id real do material na edição (fluxo documentado no notepad).
    const chave = `materials/${dados.curso_id}/${
      modo === "novo" ? crypto.randomUUID() : dados.id
    }.pdf`;

    const fd = new FormData();
    fd.set("key", chave);
    fd.set("mimeType", arquivoEscolhido.type || "application/pdf");
    fd.set("size", String(arquivoEscolhido.size));

    const presign = await criarPresignUploadAction(fd);
    if (presign.erro || !presign.uploadUrl) {
      setArquivo({
        fase: "erro",
        nome: arquivoEscolhido.name,
        erro: presign.erro ?? "falha ao preparar o upload",
      });
      return;
    }

    // PUT DIRETO na URL pré-assinada (presigned direct — bytes nunca passam
    // pelo servidor da aplicação; em dev o stub responde em /stub-storage).
    const resposta = await fetch(presign.uploadUrl, {
      method: "PUT",
      headers: { "Content-Type": "application/pdf" },
      body: arquivoEscolhido,
    });
    if (!resposta.ok) {
      setArquivo({
        fase: "erro",
        nome: arquivoEscolhido.name,
        erro: "falha no envio do arquivo para o storage",
      });
      return;
    }

    setArquivo({ fase: "pronto", nome: chave });
  }

  async function publicar() {
    setErroPublicacao(null);
    setSalvoEm(null);
    const resultado = await publicarMaterialAction(dados.id as string);
    if (resultado.erro) setErroPublicacao(resultado.erro.mensagem);
    else setStatus("publicado");
  }

  async function despublicar() {
    setErroPublicacao(null);
    setSalvoEm(null);
    const resultado = await despublicarMaterialAction(dados.id as string);
    if (resultado.erro) setErroPublicacao(resultado.erro.mensagem);
    else setStatus("rascunho");
  }

  return (
    <form onSubmit={aoEnviar} className="space-y-5">
      <div className="space-y-1.5">
        <label htmlFor="material-titulo" className="text-sm font-medium">
          Título <span className="text-destructive">*</span>
        </label>
        <input
          id="material-titulo"
          name="titulo"
          type="text"
          required
          value={titulo}
          onChange={(e) => setTitulo(e.target.value)}
          disabled={pendente}
          aria-invalid={erroTitulo !== undefined}
          aria-describedby={erroTitulo ? "material-titulo-erro" : undefined}
          className={cn(CLASSE_INPUT, erroTitulo && "border-destructive")}
        />
        {erroTitulo && (
          <p id="material-titulo-erro" className="text-xs text-destructive">
            {erroTitulo}
          </p>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="space-y-1.5">
          <label htmlFor="material-tipo" className="text-sm font-medium">
            Tipo
          </label>
          <select
            id="material-tipo"
            name="tipo"
            value={tipo}
            onChange={(e) => setTipo(e.target.value as MaterialTipo)}
            disabled={pendente}
            className={CLASSE_INPUT}
          >
            {(
              ["texto", "resumo", "pdf", "video", "questoes"] as const
            ).map((t) => (
              <option key={t} value={t}>
                {LABEL_TIPO[t]}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1.5">
          <label htmlFor="material-ordem" className="text-sm font-medium">
            Ordem
          </label>
          <input
            id="material-ordem"
            name="ordem"
            type="number"
            min={1}
            value={ordem}
            onChange={(e) => setOrdem(e.target.value)}
            disabled={pendente}
            placeholder="automática"
            aria-invalid={erroOrdem !== undefined}
            className={cn(CLASSE_INPUT, erroOrdem && "border-destructive")}
          />
          {erroOrdem && (
            <p className="text-xs text-destructive">{erroOrdem}</p>
          )}
        </div>

        <div className="space-y-1.5">
          <label htmlFor="material-status" className="text-sm font-medium">
            Status
          </label>
          <select
            id="material-status"
            value={status}
            onChange={(e) => setStatus(e.target.value as MaterialStatus)}
            disabled={pendente}
            className={CLASSE_INPUT}
          >
            <option value="rascunho">rascunho</option>
            <option value="publicado">publicado</option>
          </select>
          <p className="text-xs text-muted-foreground">
            {modo === "editar" && status !== statusInicial
              ? "status mudará ao salvar"
              : "transição explícita pelos botões abaixo"}
          </p>
        </div>
      </div>

      <label className="flex items-start gap-2 text-sm">
        <input
          id="material-amostra"
          type="checkbox"
          checked={amostra}
          onChange={(e) => setAmostra(e.target.checked)}
          disabled={pendente}
          className={cn(
            "mt-0.5 h-4 w-4 rounded border-input accent-primary",
            erroAmostra && "border-destructive",
          )}
        />
        <span>
          <span className="font-medium">Material de amostra</span>
          <span className="block text-xs text-muted-foreground">
            liberado para visitantes (R4) — máximo de 1 por curso (C2)
          </span>
        </span>
      </label>
      {erroAmostra && (
        <div
          role="alert"
          className="rounded-md border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive"
        >
          {erroAmostra}
        </div>
      )}

      {(tipo === "texto" || tipo === "resumo") && (
        <div className="space-y-1.5">
          <label htmlFor="material-conteudo" className="text-sm font-medium">
            Conteúdo ({tipo === "resumo" ? "resumo" : "texto"} — HTML simples)
          </label>
          <textarea
            id="material-conteudo"
            name="conteudo_html"
            value={conteudoHtml}
            onChange={(e) => setConteudoHtml(e.target.value)}
            disabled={pendente}
            placeholder={
              tipo === "resumo"
                ? "<h2>Tópicos</h2><p>…</p>"
                : "<h2>Título</h2><p>parágrafo…</p>"
            }
            aria-invalid={erroConteudo !== undefined}
            className={cn(CLASSE_TEXTAREA, erroConteudo && "border-destructive")}
          />
          {erroConteudo ? (
            <p className="text-xs text-destructive">{erroConteudo}</p>
          ) : (
            <p className="text-xs text-muted-foreground">
              tags básicas (h1–h6, p, ul/ol/li, strong, em, a, img…); o HTML é
              sanitizado no servidor antes de exibir (C4)
            </p>
          )}
        </div>
      )}

      {tipo === "pdf" && (
        <div className="space-y-1.5">
          <label htmlFor="material-pdf" className="text-sm font-medium">
            Arquivo PDF
          </label>
          <input
            id="material-pdf"
            name="arquivo"
            type="file"
            accept="application/pdf"
            disabled={pendente || arquivo.fase === "enviando"}
            onChange={(e) => aoSelecionarPdf(e.target.files?.[0])}
            className="text-sm file:mr-3 file:rounded-md file:border-0 file:bg-primary file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-primary-foreground disabled:opacity-50"
          />
          {arquivo.fase === "enviando" && (
            <p className="text-xs text-muted-foreground">
              enviando {arquivo.nome}…
            </p>
          )}
          {arquivo.fase === "erro" && (
            <p role="alert" className="text-xs text-destructive">
              {arquivo.erro}
            </p>
          )}
          {arquivo.fase === "pronto" && (
            <p className="text-xs text-muted-foreground">
              arquivo pronto: <code>{arquivo.nome}</code>
            </p>
          )}
          {erroArquivoKey && (
            <p role="alert" className="text-xs text-destructive">
              {erroArquivoKey}
            </p>
          )}
          <p className="text-xs text-muted-foreground">
            validação por magic bytes (%PDF-), máx. 100MB (C3); upload direto
            ao storage via URL pré-assinada
          </p>
        </div>
      )}

      {tipo === "video" && (
        <VideoUploadPanel
          materialId={dados.id}
          titulo={titulo || dados.titulo || "Videoaula"}
          status={dados.video_status ?? null}
          erroPersistido={dados.video_erro}
          disabled={pendente || modo === "novo"}
        />
      )}

      {tipo === "questoes" && (
        <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
          Material de <strong>questões</strong>: a estrutura (título/ordem/
          status/amostra) já funciona; o formulário completo de questões chega
          no S4.
        </div>
      )}

      {state.erro && state.erro.campo === undefined && (
        <div
          role="alert"
          className="rounded-md border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive"
        >
          {state.erro.mensagem}
        </div>
      )}
      {erroPublicacao && (
        <div
          role="alert"
          className="rounded-md border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive"
        >
          {erroPublicacao}
        </div>
      )}
      {salvoEm !== null && (
        <div
          role="status"
          className="rounded-md border border-emerald-600/40 bg-emerald-600/10 px-3 py-2 text-sm text-emerald-700"
        >
          alterações salvas
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="submit"
          disabled={pendente}
          className={cn(
            "inline-flex h-9 items-center justify-center rounded-md",
            "bg-primary px-4 text-sm font-medium text-primary-foreground",
            "shadow-sm transition-colors hover:bg-primary/90",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            "disabled:cursor-not-allowed disabled:opacity-50",
          )}
        >
          {pendente
            ? "Salvando…"
            : modo === "novo"
              ? "Criar material"
              : "Salvar alterações"}
        </button>

        {modo === "editar" && (
          <>
            {status === "rascunho" && (
              <button
                type="button"
                disabled={pendentePublicar}
                onClick={() => iniciarPublicar(publicar)}
                className="inline-flex h-9 items-center justify-center rounded-md bg-emerald-600 px-4 text-sm font-medium text-white shadow-sm transition-colors hover:bg-emerald-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
              >
                {pendentePublicar ? "Publicando…" : "Publicar"}
              </button>
            )}
            {status === "publicado" && (
              <button
                type="button"
                disabled={pendentePublicar}
                onClick={() => iniciarPublicar(despublicar)}
                className="inline-flex h-9 items-center justify-center rounded-md border border-amber-600/50 px-4 text-sm font-medium text-amber-700 transition-colors hover:bg-amber-600/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
              >
                {pendentePublicar ? "Despublicando…" : "Despublicar"}
              </button>
            )}
            {dados.publicado_em && (
              <span className="text-xs text-muted-foreground">
                publicado em {dados.publicado_em}
              </span>
            )}
          </>
        )}

        <Link
          href={`/admin/cursos/${dados.curso_id}`}
          className="inline-flex h-9 items-center justify-center rounded-md border border-input bg-transparent px-4 text-sm font-medium transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          Voltar ao curso
        </Link>
      </div>
    </form>
  );
}
