// Testes unitários da geração de PDF de material — US-41 (todo 9 do plano
// s2-conteudo).
//
// Contratos verificados:
//   - gerarPdfMaterial retorna um Buffer que começa com "%PDF" (magic);
//   - o TEXTO do PDF inclui o título e o corpo do material (com acentos pt-BR
//     e símbolos — fonte embutida DejaVu, ver decisão D-P1);
//   - C4: o HTML do banco é sanitizado ANTES de virar texto (vetor XSS não
//     sobrevive; script/style têm o conteúdo descartado);
//   - C8: sem cache — cada chamada gera um PDF novo (bytes diferentes);
//   - erros tipados (ErroPdf TITULO_VAZIO).
//
// Por que um extrator de texto no teste: com fonte embutida, o pdfkit escreve
// o texto como CODES DE GLYPH (hex UTF-16BE) no content stream + um CMap
// ToUnicode por fonte — não dá para fazer `buffer.includes("título")`.
// `extrairTextoPdf` decodifica via CMap (xref → objetos → fontes → CMaps →
// content streams), com compress:false os streams estão em texto puro.
// Pipeline validado por probe antes das assertivas (learning do todo).
import { describe, expect, it } from "vitest";

import { ErroPdf, gerarPdfCertificado, gerarPdfMaterial, htmlParaTextoPuro } from "@/lib/pdf";

// ---------------------------------------------------------------------------
// Helper de teste: extrai o texto de um PDF gerado por pdfkit (compress:false)
// ---------------------------------------------------------------------------

function extrairTextoPdf(buffer: Buffer): string {
  const s = buffer.toString("latin1");
  const xrefIdx = s.lastIndexOf("endobj\nxref\n");
  if (xrefIdx < 0) return "";

  const offsets = [...s.slice(xrefIdx).matchAll(/(\d{10}) (\d{5}) n/g)].map((m) =>
    parseInt(m[1], 10),
  );
  // xref entry i corresponde ao objeto (i+1); 0 = objeto livre.
  const posicoes = offsets.filter((o) => o > 0).sort((a, b) => a - b);
  const objeto = (id: number): string | null => {
    const ini = offsets[id - 1];
    if (ini === undefined || ini === 0) return null;
    let fim = xrefIdx;
    for (const p of posicoes) {
      if (p > ini) {
        fim = p;
        break;
      }
    }
    return s.slice(ini, fim);
  };

  // 1) Page resources: /F{n} → objeto da fonte.
  const fontRes: Record<string, string> = {};
  for (let id = 1; id <= offsets.length; id++) {
    const obj = objeto(id);
    if (!obj) continue;
    for (const m of obj.matchAll(/\/Font <<([\s\S]*?)>>/g)) {
      for (const f of m[1].matchAll(/\/F(\d+) (\d+) 0 R/g)) fontRes[f[1]] = f[2];
    }
  }

  // 2) Fontes Type0: objeto → objeto do ToUnicode.
  const fontObj: Record<string, string> = {};
  for (let id = 1; id <= offsets.length; id++) {
    const obj = objeto(id);
    if (!obj || !obj.includes("/Subtype /Type0")) continue;
    const m = obj.match(/\/ToUnicode (\d+) 0 R/);
    if (m) fontObj[String(id)] = m[1];
  }

  // 3) CMaps (objetos cujo stream contém beginbf): objeto → glyph → char.
  const cmaps: Record<string, Record<string, string>> = {};
  for (let id = 1; id <= offsets.length; id++) {
    const obj = objeto(id);
    if (!obj || !obj.includes("beginbf")) continue;
    const corpo = obj.slice(obj.indexOf("stream\n") + 7, obj.lastIndexOf("endstream"));
    const mapa: Record<string, string> = {};
    for (const b of corpo.matchAll(/beginbfchar([\s\S]*?)endbfchar/g)) {
      for (const e of b[1].matchAll(/<([0-9a-fA-F]+)>\s*<([0-9a-fA-F]+)>/g)) {
        mapa[e[1].toLowerCase()] = String.fromCodePoint(parseInt(e[2], 16));
      }
    }
    for (const b of corpo.matchAll(/beginbfrange([\s\S]*?)endbfrange/g)) {
      for (const e of b[1].matchAll(/<([0-9a-fA-F]+)>\s*<([0-9a-fA-F]+)>\s*\[([\s\S]*?)\]/g)) {
        const ini = parseInt(e[1], 16);
        const chars = [...e[3].matchAll(/<([0-9a-fA-F]+)>/g)].map((c) => c[1]);
        chars.forEach((ch, i) => {
          mapa[(ini + i).toString(16).padStart(4, "0")] = String.fromCodePoint(parseInt(ch, 16));
        });
      }
    }
    cmaps[String(id)] = mapa;
  }

  // 4) Content streams: por bloco BT, o Tf define a fonte ativa dos hex tokens.
  let texto = "";
  for (let id = 1; id <= offsets.length; id++) {
    const obj = objeto(id);
    if (!obj || !obj.includes("BT") || !obj.includes(" TJ")) continue;
    const corpo = obj.slice(obj.indexOf("stream\n") + 7, obj.lastIndexOf("endstream"));
    for (const bloco of corpo.matchAll(/BT([\s\S]*?)ET/g)) {
      const b = bloco[1];
      const tf = b.match(/\/F(\d+) (\d+(?:\.\d+)?) Tf/);
      if (!tf) continue;
      const toUni = fontObj[fontRes[tf[1]]];
      const cmap = toUni !== undefined ? (cmaps[toUni] ?? {}) : {};
      let linha = "";
      for (const h of b.matchAll(/<([0-9a-fA-F]+)>/g)) {
        const hex = h[1];
        if (hex.length % 4 !== 0) continue;
        for (let i = 0; i < hex.length; i += 4) {
          const codigo = hex.slice(i, i + 4).toLowerCase();
          linha += cmap[codigo] ?? "\uFFFD";
        }
      }
      if (linha.length > 0) texto += linha + "\n";
    }
  }
  return texto.trim();
}

// ---------------------------------------------------------------------------
// htmlParaTextoPuro (HTML sanitizado → texto puro)
// ---------------------------------------------------------------------------

describe("htmlParaTextoPuro", () => {
  it("remove tags e mantém o texto, com quebras de bloco", () => {
    const html = "<h1>Título</h1><p>Parágrafo um.</p><p>Parágrafo <strong>dois</strong>.</p>";
    expect(htmlParaTextoPuro(html)).toBe("Título\nParágrafo um.\nParágrafo dois.");
  });

  it("decodifica entidades comuns", () => {
    expect(htmlParaTextoPuro("<p>a &amp; b &lt; c</p>")).toBe("a & b < c");
  });

  it("converte imagem com alt em [alt] e sem alt em [imagem]", () => {
    expect(htmlParaTextoPuro('<p>Veja <img src="x.png" alt="gráfico" /> abaixo</p>')).toBe(
      "Veja [gráfico] abaixo",
    );
    expect(htmlParaTextoPuro("<p>Figura <img src=\"y.png\" /></p>")).toBe("Figura [imagem]");
  });

  it("colapsa espaços múltiplos e linhas vazias", () => {
    expect(htmlParaTextoPuro("<p>um    dois</p><p>  </p><p>três</p>")).toBe("um dois\ntrês");
  });

  it("string vazia → texto vazio", () => {
    expect(htmlParaTextoPuro("")).toBe("");
  });
});

// ---------------------------------------------------------------------------
// gerarPdfMaterial
// ---------------------------------------------------------------------------

describe("gerarPdfMaterial (US-41)", () => {
  it("retorna um Buffer que começa com %PDF (magic)", async () => {
    const pdf = await gerarPdfMaterial({
      titulo: "Meu Título",
      conteudoHtml: "<p>Corpo do material.</p>",
    });
    expect(Buffer.isBuffer(pdf)).toBe(true);
    expect(pdf.subarray(0, 5).toString()).toBe("%PDF-");
    expect(pdf.length).toBeGreaterThan(500);
  });

  it("o texto do PDF inclui o título (fonte embutida, acentos ok)", async () => {
    const pdf = await gerarPdfMaterial({
      titulo: "Meu Título de Teste",
      conteudoHtml: "<p>Corpo.</p>",
    });
    const texto = extrairTextoPdf(pdf);
    expect(texto).toContain("Meu Título de Teste");
  });

  it("o corpo sai com acentos e símbolos pt-BR/Unicode", async () => {
    const pdf = await gerarPdfMaterial({
      titulo: "Português",
      conteudoHtml: "<p>Português — ç ã é (R$ 100,00) e símbolos: → ≤ ½</p>",
    });
    const texto = extrairTextoPdf(pdf);
    expect(texto).toContain("Português — ç ã é (R$ 100,00) e símbolos: → ≤ ½");
  });

  it("C4: vetor XSS não vira texto (script e onerror descartados)", async () => {
    const pdf = await gerarPdfMaterial({
      titulo: "Seguro",
      conteudoHtml:
        '<p>Ok</p><script>alert("xss")</script><img src="x" onerror="alert(1)" /><p style="color:red">Fim</p>',
    });
    const texto = extrairTextoPdf(pdf);
    expect(texto).toContain("Ok");
    expect(texto).toContain("Fim");
    expect(texto).not.toContain("alert");
    expect(texto).not.toContain("xss");
    expect(texto).not.toContain("onerror");
    expect(texto).not.toContain("color");
  });

  it("conteúdo vazio → PDF válido com aviso de material sem conteúdo", async () => {
    const pdf = await gerarPdfMaterial({ titulo: "Vazio", conteudoHtml: null });
    const texto = extrairTextoPdf(pdf);
    expect(pdf.subarray(0, 5).toString()).toBe("%PDF-");
    expect(texto).toContain("material sem conteúdo");
  });

  it("C8: sem cache — duas chamadas geram bytes diferentes (novo documento a cada vez)", async () => {
    const dados = { titulo: "Sem Cache", conteudoHtml: "<p>corpo</p>" };
    const pdf1 = await gerarPdfMaterial(dados);
    const pdf2 = await gerarPdfMaterial(dados);
    // Criação Date + offsets dos objetos mudam a cada documento.
    expect(pdf1.equals(pdf2)).toBe(false);
  });

  it("título vazio → ErroPdf TITULO_VAZIO (erro tipado)", async () => {
    await expect(
      gerarPdfMaterial({ titulo: "   ", conteudoHtml: "<p>x</p>" }),
    ).rejects.toThrowError(ErroPdf);
    await expect(
      gerarPdfMaterial({ titulo: "   ", conteudoHtml: "<p>x</p>" }),
    ).rejects.toMatchObject({ code: "TITULO_VAZIO" });
  });
});

describe("gerarPdfCertificado", () => {
  it("gera PDF mínimo com os quatro dados do certificado", async () => {
    const pdf = await gerarPdfCertificado({
      nome: "Ana",
      curso: "Direito",
      data: new Date("2026-08-18T12:00:00Z"),
      codigo: "codigo-seguro-123456",
    });
    expect(pdf.subarray(0, 5).toString()).toBe("%PDF-");
    expect(pdf.length).toBeGreaterThan(500);
  });
});
