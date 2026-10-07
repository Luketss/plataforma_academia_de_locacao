// Parser puro do markdown leve usado no conteúdo dos modelos e da página inicial
// (mesma gramática do observatório, com links e listas numeradas):
// "# "/"## "/"### " títulos, "- " ou "* " itens, "1. " itens numerados,
// linha em branco separa parágrafos, **negrito**, [texto](https://link).
// Sem HTML: o que não casa com a gramática é texto literal.

const RE_INLINE = /\*\*([^*]+)\*\*|\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g;

export function parseInline(texto) {
  const segmentos = [];
  let ultimo = 0;
  let m;
  RE_INLINE.lastIndex = 0;
  while ((m = RE_INLINE.exec(texto)) !== null) {
    if (m.index > ultimo) segmentos.push({ tipo: "texto", texto: texto.slice(ultimo, m.index) });
    if (m[1] !== undefined) segmentos.push({ tipo: "negrito", texto: m[1] });
    else segmentos.push({ tipo: "link", texto: m[2], href: m[3] });
    ultimo = m.index + m[0].length;
  }
  if (ultimo < texto.length) segmentos.push({ tipo: "texto", texto: texto.slice(ultimo) });
  if (segmentos.length === 0) segmentos.push({ tipo: "texto", texto: "" });
  return segmentos;
}

export function parseMarkdownLite(texto) {
  const blocos = [];
  if (!texto) return blocos;

  let paragrafo = null;
  let lista = null;
  const fechaParagrafo = () => {
    if (paragrafo) blocos.push(paragrafo);
    paragrafo = null;
  };
  const fechaLista = () => {
    if (lista) blocos.push(lista);
    lista = null;
  };
  const item = (tipo, conteudo) => {
    fechaParagrafo();
    if (!lista || lista.tipo !== tipo) {
      fechaLista();
      lista = { tipo, itens: [] };
    }
    lista.itens.push(parseInline(conteudo));
  };

  for (const linha of texto.split(/\r?\n/)) {
    const t = linha.trim();
    if (t === "") {
      fechaParagrafo();
      fechaLista();
      continue;
    }
    const titulo = /^(#{1,3}) (.*)$/.exec(t);
    if (titulo) {
      fechaParagrafo();
      fechaLista();
      blocos.push({ tipo: titulo[1].length === 3 ? "h3" : "h2", inline: parseInline(titulo[2]) });
      continue;
    }
    if (/^[-*] /.test(t)) {
      item("lista", t.slice(2));
      continue;
    }
    const numerado = /^\d+[.)] (.*)$/.exec(t);
    if (numerado) {
      item("numerada", numerado[1]);
      continue;
    }
    fechaLista();
    if (!paragrafo) paragrafo = { tipo: "paragrafo", linhas: [] };
    paragrafo.linhas.push(parseInline(t));
  }
  fechaParagrafo();
  fechaLista();
  return blocos;
}
