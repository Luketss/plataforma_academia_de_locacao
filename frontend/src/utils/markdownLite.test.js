import { parseInline, parseMarkdownLite } from "./markdownLite";

describe("parseInline", () => {
  it("separa negrito e links http(s)", () => {
    expect(parseInline("Veja **isto** em [site](https://x.com/a).")).toEqual([
      { tipo: "texto", texto: "Veja " },
      { tipo: "negrito", texto: "isto" },
      { tipo: "texto", texto: " em " },
      { tipo: "link", texto: "site", href: "https://x.com/a" },
      { tipo: "texto", texto: "." },
    ]);
  });

  it("não transforma links com esquema perigoso", () => {
    const segs = parseInline("[x](javascript:alert(1))");
    expect(segs.every((s) => s.tipo === "texto")).toBe(true);
  });
});

describe("parseMarkdownLite", () => {
  it("monta títulos, listas e parágrafos", () => {
    const blocos = parseMarkdownLite("# Título\n- a\n- b\n\n1. um\n2. dois\nlinha 1\nlinha 2");
    expect(blocos.map((b) => b.tipo)).toEqual(["h2", "lista", "numerada", "paragrafo"]);
    expect(blocos[1].itens).toHaveLength(2);
    expect(blocos[3].linhas).toHaveLength(2);
  });

  it("texto vazio não gera blocos", () => {
    expect(parseMarkdownLite("")).toEqual([]);
    expect(parseMarkdownLite(null)).toEqual([]);
  });
});
