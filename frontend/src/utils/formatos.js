const fmtData = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
const fmtDataHora = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

export function formatarData(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "—" : fmtData.format(d);
}

export function formatarDataHora(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "—" : fmtDataHora.format(d);
}

export function formatarTamanho(bytes) {
  if (bytes == null) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1).replace(".", ",")} MB`;
}

const TIPOS = [
  [/pdf/, "PDF"],
  [/wordprocessingml|msword|opendocument\.text/, "Word"],
  [/spreadsheetml|ms-excel|opendocument\.spreadsheet|csv/, "Planilha"],
  [/presentationml|ms-powerpoint/, "Apresentação"],
  [/^image\//, "Imagem"],
  [/zip/, "ZIP"],
  [/text\/plain/, "Texto"],
];

export function rotuloTipoArquivo(contentType) {
  if (!contentType) return null;
  const achado = TIPOS.find(([re]) => re.test(contentType));
  return achado ? achado[1] : "Arquivo";
}

export function podeVisualizarNoNavegador(contentType) {
  return contentType === "application/pdf" || /^image\/(png|jpeg|webp)$/.test(contentType || "");
}

// "2026-10-07T00:00:00Z" ⇄ "2026-10-07" (input type=date). Expiração = fim do dia local.
export function isoParaInputData(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function inputDataParaIso(valor) {
  if (!valor) return null;
  const [a, m, d] = valor.split("-").map(Number);
  return new Date(a, m - 1, d, 23, 59, 59).toISOString();
}
