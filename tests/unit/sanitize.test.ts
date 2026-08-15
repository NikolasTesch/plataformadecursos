// Testes unitários do sanitizador de HTML (todo 6 — S2): whitelist anti-XSS (C4).
//
// C4 (SPEC-conteudo.md:52-54, US-06): conteúdo armazenado como HTML e
// renderização SANITIZADA — whitelist de tags/atributos; links com
// rel="noopener". CO5 (SPEC-comunidade.md:66) reutiliza a mesma lib na
// sanitização de comentários (contrato puro, sem estado).
//
// Whitelist EXATA do plano (s2-conteudo.md todo 6): h1-h6, p, ul/ol/li, strong,
// em, a, img, pre, code, table/thead/tbody/tr/th/td, blockquote. NADA além —
// b/i/div/span/iframe/form/svg/script/style NÃO entram. Atributos permitidos:
// href, src, alt, title, target (nos seus tags) + rel (só o noopener forçado).
import { describe, expect, it } from "vitest";

import { sanitizarHtml } from "@/lib/sanitize";

describe("sanitizarHtml — scripts/styles/iframes removidos COM conteúdo (C4)", () => {
  it("remove <script> inteiro, incluindo o conteúdo", () => {
    expect(sanitizarHtml("<script>alert(1)</script>")).toBe("");
  });

  it("remove <script> em maiúsculas (parser case-insensitive)", () => {
    expect(sanitizarHtml("<SCRIPT>alert(1)</SCRIPT>")).toBe("");
  });

  it("remove <style> inteiro, incluindo o conteúdo", () => {
    expect(sanitizarHtml("<style>body{display:none}</style>")).toBe("");
  });

  it("remove <iframe> inteiro, incluindo o conteúdo", () => {
    expect(sanitizarHtml('<iframe src="https://evil.example">conteudo</iframe>')).toBe("");
  });

  it("remove o script no meio do texto sem deixar rastro", () => {
    expect(sanitizarHtml("<p>antes<script>alert(1)</script>depois</p>")).toBe("<p>antesdepois</p>");
  });
});

describe("sanitizarHtml — event handlers on* removidos (C4)", () => {
  it("remove onerror de <img> mas mantém a imagem com src", () => {
    expect(sanitizarHtml('<img src="x" onerror="alert(1)">')).toBe('<img src="x" />');
  });

  it("remove onclick de <p> mas mantém o texto", () => {
    expect(sanitizarHtml('<p onclick="x()">texto</p>')).toBe("<p>texto</p>");
  });

  it("remove on* aninhados em tags permitidas", () => {
    expect(sanitizarHtml('<p onclick="a()"><strong onclick="b()">texto</strong></p>')).toBe(
      "<p><strong>texto</strong></p>",
    );
  });
});

describe("sanitizarHtml — javascript: neutralizado (C4)", () => {
  it("remove href javascript: (href inteiro cai por scheme não permitido)", () => {
    expect(sanitizarHtml('<a href="javascript:alert(1)">x</a>')).toBe('<a rel="noopener">x</a>');
  });

  it("remove href javascript: codificado em entidade (&#x6a;avascript:)", () => {
    expect(sanitizarHtml('<a href="&#x6a;avascript:alert(1)">x</a>')).toBe('<a rel="noopener">x</a>');
  });

  it("remove src data: de <img> (scheme fora da whitelist)", () => {
    expect(sanitizarHtml('<img src="data:text/html;base64,PHNjcmlwdD4=" alt="x">')).toBe('<img alt="x" />');
  });

  it("mantém mailto: (scheme permitido)", () => {
    expect(sanitizarHtml('<a href="mailto:x@y.com">email</a>')).toBe(
      '<a href="mailto:x@y.com" rel="noopener">email</a>',
    );
  });
});

describe("sanitizarHtml — rel=noopener forçado em TODO <a> (C4)", () => {
  it("adiciona rel=noopener em link externo (saída EXATA)", () => {
    expect(sanitizarHtml('<a href="https://ok.com">x</a>')).toBe(
      '<a href="https://ok.com" rel="noopener">x</a>',
    );
  });

  it("SOBRESCREVE rel existente (nofollow vira noopener)", () => {
    expect(sanitizarHtml('<a href="https://ok.com" rel="nofollow">x</a>')).toBe(
      '<a href="https://ok.com" rel="noopener">x</a>',
    );
  });

  it("mantém target=_blank e adiciona rel=noopener", () => {
    expect(sanitizarHtml('<a href="https://ok.com" target="_blank">x</a>')).toBe(
      '<a href="https://ok.com" target="_blank" rel="noopener">x</a>',
    );
  });

  it("adiciona rel=noopener também em link sem href", () => {
    expect(sanitizarHtml("<a>x</a>")).toBe('<a rel="noopener">x</a>');
  });
});

describe("sanitizarHtml — whitelist de tags permitidas preserva conteúdo (C4)", () => {
  it("preserva h1 a h6", () => {
    expect(sanitizarHtml("<h1>t</h1>")).toBe("<h1>t</h1>");
    expect(sanitizarHtml("<h2>titulo</h2>")).toBe("<h2>titulo</h2>");
    expect(sanitizarHtml("<h6>t</h6>")).toBe("<h6>t</h6>");
  });

  it("preserva ul/ol/li", () => {
    expect(sanitizarHtml("<ul><li>a</li><li>b</li></ul>")).toBe("<ul><li>a</li><li>b</li></ul>");
    expect(sanitizarHtml("<ol><li>1</li></ol>")).toBe("<ol><li>1</li></ol>");
  });

  it("preserva tabela completa (table/thead/tbody/tr/th/td)", () => {
    const tabela = "<table><thead><tr><th>h1</th></tr></thead><tbody><tr><td>c1</td></tr></tbody></table>";
    expect(sanitizarHtml(tabela)).toBe(tabela);
  });

  it("preserva strong/em (negrito/itálico do editor)", () => {
    expect(sanitizarHtml("<p><strong>n</strong> e <em>i</em></p>")).toBe(
      "<p><strong>n</strong> e <em>i</em></p>",
    );
  });

  it("preserva pre/code (bloco de código)", () => {
    expect(sanitizarHtml("<pre><code>const x = 1;</code></pre>")).toBe(
      "<pre><code>const x = 1;</code></pre>",
    );
  });

  it("preserva blockquote", () => {
    expect(sanitizarHtml("<blockquote>citação</blockquote>")).toBe("<blockquote>citação</blockquote>");
  });

  it("preserva img com src/alt permitidos", () => {
    expect(sanitizarHtml('<img src="https://cdn.com/a.png" alt="figura">')).toBe(
      '<img src="https://cdn.com/a.png" alt="figura" />',
    );
  });
});

describe("sanitizarHtml — tags FORA da whitelist removidas (C4)", () => {
  it("remove <b> (plano lista strong/em — b NÃO entra) mas mantém o texto", () => {
    expect(sanitizarHtml("<b>texto</b>")).toBe("texto");
  });

  it("remove <i> (plano lista strong/em — i NÃO entra) mas mantém o texto", () => {
    expect(sanitizarHtml("<i>itálico</i>")).toBe("itálico");
  });

  it("remove <div> e <span> mantendo o texto", () => {
    expect(sanitizarHtml('<div onclick="x()">bloco</div><span>sp</span>')).toBe("blocosp");
  });

  it("remove <form> mantendo o texto interno", () => {
    expect(sanitizarHtml('<form action="x">conteudo</form>')).toBe("conteudo");
  });

  it("remove <svg> e seus filhos (sem conteúdo de texto)", () => {
    expect(sanitizarHtml('<svg><circle r="5"/></svg>')).toBe("");
  });

  it("remove <svg> mantendo apenas texto visível", () => {
    expect(sanitizarHtml("<svg>texto</svg>")).toBe("texto");
  });
});

describe("sanitizarHtml — entradas sem HTML (robustez)", () => {
  it("string vazia retorna vazia", () => {
    expect(sanitizarHtml("")).toBe("");
  });

  it("texto simples passa intacto", () => {
    expect(sanitizarHtml("texto simples")).toBe("texto simples");
  });

  it("escapa < e & fora de tags (vira texto)", () => {
    expect(sanitizarHtml("a & b < c")).toBe("a &amp; b &lt; c");
  });
});
