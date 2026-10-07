import api from "./api";

// Arquivos exigem o token: são buscados como blob via axios (nunca com o
// token na URL) e entregues ao navegador por um object URL.

export async function buscarBlobUrl(url, params) {
  const res = await api.get(url, { params, responseType: "blob" });
  return URL.createObjectURL(res.data);
}

export async function baixarArquivo(url, nomeArquivo) {
  const res = await api.get(url, { responseType: "blob" });
  const href = URL.createObjectURL(res.data);
  const a = document.createElement("a");
  a.href = href;
  a.download = nomeArquivo || "arquivo";
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(href), 10_000);
}
