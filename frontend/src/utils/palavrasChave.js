// "contrato, garantia;  reajuste" → ["contrato", "garantia", "reajuste"] (sem duplicatas, sem acento na comparação)
const semAcento = (s) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

export function separarPalavrasChave(texto) {
  const vistos = new Set();
  const saida = [];
  for (const parte of String(texto || "").split(/[,;\n]/)) {
    const limpa = parte.trim().replace(/\s+/g, " ");
    const chave = semAcento(limpa);
    if (limpa && !vistos.has(chave)) {
      vistos.add(chave);
      saida.push(limpa);
    }
  }
  return saida;
}

export function juntarPalavrasChave(lista) {
  return (lista || []).join(", ");
}
