import { parseMarkdownLite } from "../utils/markdownLite";

function Inline({ segs }) {
  return segs.map((s, i) => {
    if (s.tipo === "negrito")
      return (
        <strong key={i} className="font-semibold text-text">
          {s.texto}
        </strong>
      );
    if (s.tipo === "link")
      return (
        <a key={i} href={s.href} target="_blank" rel="noopener noreferrer" className="text-brand underline">
          {s.texto}
        </a>
      );
    return <span key={i}>{s.texto}</span>;
  });
}

/** Render do markdown leve. Zero dangerouslySetInnerHTML. */
export default function MarkdownLite({ texto, className = "" }) {
  const blocos = parseMarkdownLite(texto);
  if (blocos.length === 0) return null;
  return (
    <div className={`grid gap-3 text-[15px] leading-relaxed text-dim ${className}`}>
      {blocos.map((b, i) => {
        if (b.tipo === "h2")
          return (
            <h2 key={i} className="text-lg font-bold mt-2">
              <Inline segs={b.inline} />
            </h2>
          );
        if (b.tipo === "h3")
          return (
            <h3 key={i} className="text-base font-bold mt-1">
              <Inline segs={b.inline} />
            </h3>
          );
        if (b.tipo === "lista" || b.tipo === "numerada") {
          const Tag = b.tipo === "lista" ? "ul" : "ol";
          return (
            <Tag key={i} className={`pl-5 grid gap-1 ${b.tipo === "lista" ? "list-disc" : "list-decimal"}`}>
              {b.itens.map((item, j) => (
                <li key={j}>
                  <Inline segs={item} />
                </li>
              ))}
            </Tag>
          );
        }
        return (
          <p key={i}>
            {b.linhas.map((l, j) => (
              <span key={j}>
                {j > 0 && <br />}
                <Inline segs={l} />
              </span>
            ))}
          </p>
        );
      })}
    </div>
  );
}
