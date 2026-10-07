import { mensagemErro } from "./erros";
import { formatarTamanho, inputDataParaIso, isoParaInputData, rotuloTipoArquivo } from "./formatos";
import { separarPalavrasChave } from "./palavrasChave";

describe("mensagemErro", () => {
  it("usa detail string, lista do pydantic ou padrão", () => {
    expect(mensagemErro({ response: { data: { detail: "Falhou" } } })).toBe("Falhou");
    expect(
      mensagemErro({ response: { data: { detail: [{ loc: ["body", "titulo"], msg: "Value error, curto" }] } } })
    ).toBe("titulo: curto");
    expect(mensagemErro({})).toBe("Não foi possível conectar ao servidor.");
    expect(mensagemErro({ response: { data: {} } }, "x")).toBe("x");
  });
});

describe("formatos", () => {
  it("formata tamanhos", () => {
    expect(formatarTamanho(500)).toBe("500 B");
    expect(formatarTamanho(2048)).toBe("2 KB");
    expect(formatarTamanho(1.5 * 1024 * 1024)).toBe("1,5 MB");
  });

  it("rotula tipos de arquivo", () => {
    expect(rotuloTipoArquivo("application/pdf")).toBe("PDF");
    expect(rotuloTipoArquivo("application/vnd.openxmlformats-officedocument.wordprocessingml.document")).toBe("Word");
    expect(rotuloTipoArquivo("application/vnd.ms-excel")).toBe("Planilha");
    expect(rotuloTipoArquivo(null)).toBe(null);
  });

  it("converte data do input ida e volta", () => {
    expect(isoParaInputData(inputDataParaIso("2026-12-31"))).toBe("2026-12-31");
    expect(inputDataParaIso("")).toBe(null);
  });
});

describe("separarPalavrasChave", () => {
  it("separa por vírgula/ponto e vírgula e remove duplicatas sem acento", () => {
    expect(separarPalavrasChave("Contrato, garantia; contrato ,  Garantía,")).toEqual(["Contrato", "garantia"]);
  });
});
