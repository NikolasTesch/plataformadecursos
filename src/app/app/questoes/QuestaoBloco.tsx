"use client";

import { useActionState } from "react";
import { favoritaAction, flashcardAction, responderAction, iniciarProvaAction, responderProvaAction, entregarProvaAction } from "./actions";
import type { QuestaoPublica } from "@/services/questoes/navegacao";

type Estado = { ok: boolean; mensagem?: string; dados?: unknown };
type Feedback = { correta: boolean; gabarito: string; comentario_html: string | null };
type Sessao = { id: string; questoes: QuestaoPublica[]; respostas: Record<string, string | null>; entregue: boolean };
type Resultado = { questao_id: string; comentario_html: string | null };

export function QuestaoBloco({ blocoId, questoes, favoritas }: { blocoId: string; questoes: QuestaoPublica[]; favoritas: string[] }) {
  const [resposta, responderForm] = useActionState<Estado, FormData>(responderAction, { ok: false });
  const [flashcard, flashcardForm] = useActionState<Estado, FormData>(flashcardAction, { ok: false });
  const [prova, iniciar] = useActionState<Estado, FormData>(iniciarProvaAction, { ok: false });
  const [sessao, responderProva] = useActionState<Estado, FormData>(responderProvaAction, { ok: false });
  const [resultado, entregar] = useActionState<Estado, FormData>(entregarProvaAction, { ok: false });
  const sessaoAtual = (sessao.dados ?? prova.dados) as Sessao | undefined;
  const feedback = resposta.dados as Feedback | undefined;
  const provaFinalizada = resultado.dados as { acertos: number; total: number; resultados: Resultado[] } | undefined;

  return <section className="space-y-5">
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-card p-4">
      <div><h2 className="font-semibold">Como você quer praticar?</h2><p className="text-sm text-muted-foreground">Estudo mostra o feedback na hora. Prova corrige ao entregar.</p></div>
      <form action={iniciar}><input type="hidden" name="bloco_id" value={blocoId} /><button className="rounded-md border px-3 py-2 text-sm font-medium hover:bg-muted">Iniciar prova</button></form>
    </div>
    {provaFinalizada && <><p role="status" className="rounded-md bg-primary/10 p-3 text-sm font-medium">Resultado: {provaFinalizada.acertos}/{provaFinalizada.total} acertos.</p><div className="space-y-2">{provaFinalizada.resultados.map((item) => item.comentario_html && <p key={item.questao_id} role="status" dangerouslySetInnerHTML={{ __html: item.comentario_html }} />)}</div></>}
    {flashcard.mensagem && <p role="status" className="text-sm text-muted-foreground">{flashcard.mensagem}</p>}
    {questoes.map((questao) => {
      const escolha = sessaoAtual?.respostas[questao.id];
      const emProva = Boolean(sessaoAtual && !sessaoAtual.entregue);
      return <article id={`questao-${questao.id}`} key={questao.id} className="space-y-4 rounded-xl border bg-card p-5 shadow-sm">
        <div className="flex items-start justify-between gap-3"><h3 className="font-semibold leading-6">{questao.ordem}. {questao.enunciado}</h3><form action={favoritaAction}><input type="hidden" name="question_id" value={questao.id} /><input type="hidden" name="bloco_id" value={blocoId} /><input type="hidden" name="favorita" value={favoritas.includes(questao.id) ? "true" : "false"} /><button aria-label={favoritas.includes(questao.id) ? "Desfavoritar questão" : "Favoritar questão"} className="rounded border px-2 py-1 text-xs">{favoritas.includes(questao.id) ? "★ Favorita" : "☆ Favoritar"}</button></form></div>
        <div className="grid gap-2">{questao.alternativas.map((opcao) => <label key={opcao.letra} className="flex cursor-pointer gap-2 rounded-md border p-3 text-sm hover:bg-muted"><input type="radio" name="alternativa" value={opcao.letra} defaultChecked={escolha === opcao.letra} form={`${emProva ? "prova" : "form"}-${questao.id}`} /> <span><b>{opcao.letra}.</b> {opcao.texto}</span></label>)}</div>
        {!emProva ? <form id={`form-${questao.id}`} action={responderForm} className="flex flex-wrap gap-2"><input type="hidden" name="question_id" value={questao.id} /><button className="rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground">Responder</button><button formAction={flashcardForm} className="rounded-md border px-3 py-2 text-sm">Sugerir flashcard</button></form> : <form id={`prova-${questao.id}`} action={responderProva}><input type="hidden" name="sessao_id" value={sessaoAtual?.id} /><input type="hidden" name="question_id" value={questao.id} /><button className="rounded-md border px-3 py-2 text-sm">Salvar resposta</button></form>}
        {feedback && !emProva && <div role="status" className={`rounded-md p-3 text-sm ${feedback.correta ? "bg-emerald-50 text-emerald-800" : "bg-red-50 text-red-800"}`}><strong>{feedback.correta ? "Resposta correta" : `Resposta incorreta — gabarito: ${feedback.gabarito}`}</strong>{feedback.comentario_html && <p className="mt-1" dangerouslySetInnerHTML={{ __html: feedback.comentario_html }} />}</div>}
      </article>;
    })}
    {sessaoAtual && !sessaoAtual.entregue && <form action={entregar}><input type="hidden" name="sessao_id" value={sessaoAtual.id} /><button className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">Entregar prova</button></form>}
  </section>;
}
