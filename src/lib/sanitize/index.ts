// Sanitizador de HTML por WHITELIST — anti-XSS (C4).
//
// C4 (SPEC-conteudo.md:52-54, US-06): o conteúdo de material `texto`/`resumo` é
// armazenado como HTML e SEMPRE passa por esta função antes de qualquer
// renderização. CO5 (SPEC-comunidade.md:66) reutiliza a mesma função para
// comentários (contrato puro, sem estado, sem I/O).
//
// Estratégia (plano S2 todo 6): whitelist EXPLÍCITA de tags e atributos —
// nada do que não está listado sobrevive. Tags de código (script/style) e
// iframe têm o CONTEÚDO descartado, não só a tag (não-text-tags). Todo `<a>`
// ganha `rel="noopener"` forçado via transformTags (C4). Schemes de URL fora
// de http/https/mailto/tel (ex.: javascript:, data:) fazem o atributo cair
// inteiro. O transform de `rel` roda ANTES do filtro de atributos e
// SOBRESCREVE qualquer rel de entrada — permitir `rel` em `a` é seguro porque
// só o valor forçado "noopener" chega à saída.
import sanitizeHtml from "sanitize-html";

/** Tags permitidas — EXATA do plano S2 todo 6 (h1-h6, p, listas, strong/em,
 * a, img, pre/code, tabela, blockquote). b/i/div/span/iframe/form/svg NÃO entram. */
const TAGS_PERMITIDAS: string[] = [
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "p",
  "ul",
  "ol",
  "li",
  "strong",
  "em",
  "a",
  "img",
  "pre",
  "code",
  "table",
  "thead",
  "tbody",
  "tr",
  "th",
  "td",
  "blockquote",
];

/** Atributos por tag. Só href/src/alt/title/target (nos seus tags) + `rel` no
 * `<a>` (necessário para o noopener forçado sobreviver ao filtro — o transform
 * sobrescreve qualquer rel de entrada antes, então o valor só pode ser
 * "noopener"). Qualquer outro atributo (on*, style, class, width...) é
 * descartado. */
const ATRIBUTOS_PERMITIDOS: Record<string, string[]> = {
  a: ["href", "title", "target", "rel"],
  img: ["src", "alt", "title"],
};

/** Tags cujo CONTEÚDO é descartado quando a tag é removida (script/style/
 * textarea/option são o default da lib; iframe entra pela regra C4 do plano:
 * "iframe content removed"). */
const TAGS_NAO_TEXTO: string[] = ["script", "style", "textarea", "option", "iframe"];

/** Configuração única e imutável — o custo de montá-la é pago uma vez. */
const OPCOES: sanitizeHtml.IOptions = {
  allowedTags: TAGS_PERMITIDAS,
  allowedAttributes: ATRIBUTOS_PERMITIDOS,
  allowedSchemes: ["http", "https", "mailto", "tel"],
  disallowedTagsMode: "discard",
  nonTextTags: TAGS_NAO_TEXTO,
  // C4: rel="noopener" FORÇADO em todo <a> (merge=true sobrescreve o rel de entrada).
  transformTags: { a: sanitizeHtml.simpleTransform("a", { rel: "noopener" }, true) },
};

/**
 * Sanitiza HTML arbitrário contra XSS usando whitelist explícita (C4).
 *
 * - Tags fora da whitelist são removidas; conteúdo de script/style/iframe
 *   também (conteúdo de tags desconhecidas de texto é preservado).
 * - Atributos fora da whitelist (on*, style, class etc.) são descartados.
 * - URLs com scheme fora de http/https/mailto/tel (javascript:, data: etc.)
 *   têm o atributo removido inteiro — inclusive variantes codificadas.
 * - Todo `<a>` sai com `rel="noopener"` (C4), sobrescrevendo rel de entrada.
 *
 * Função pura: mesma entrada → mesma saída; sem estado, sem I/O.
 */
export function sanitizarHtml(html: string): string {
  return sanitizeHtml(html, OPCOES);
}
