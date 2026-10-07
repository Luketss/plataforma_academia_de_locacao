// Extrai uma mensagem legível de um erro do axios.
export function mensagemErro(err, padrao = "Algo deu errado. Tente novamente.") {
  const data = err?.response?.data;
  if (!err?.response) return "Não foi possível conectar ao servidor.";
  if (typeof data?.detail === "string") return data.detail;
  if (Array.isArray(data?.detail) && data.detail.length) {
    // Erro de validação do FastAPI/Pydantic: [{loc, msg}]
    const primeiro = data.detail[0];
    const campo = Array.isArray(primeiro.loc) ? primeiro.loc[primeiro.loc.length - 1] : null;
    const msg = String(primeiro.msg || "").replace(/^Value error, /, "");
    return campo && campo !== "body" ? `${campo}: ${msg}` : msg;
  }
  return padrao;
}
