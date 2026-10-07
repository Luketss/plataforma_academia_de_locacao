import { createContext, useContext, useEffect, useState } from "react";

const CHAVE = "academia-tema";
const ThemeContext = createContext({ tema: "claro", alternarTema: () => {} });

function temaInicial() {
  try {
    const salvo = localStorage.getItem(CHAVE);
    if (salvo === "claro" || salvo === "escuro") return salvo;
  } catch {
    /* storage indisponível */
  }
  return window.matchMedia?.("(prefers-color-scheme: dark)").matches ? "escuro" : "claro";
}

export function ThemeProvider({ children }) {
  const [tema, setTema] = useState(temaInicial);

  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove("theme-claro", "theme-escuro");
    root.classList.add(`theme-${tema}`);
    root.classList.toggle("dark", tema === "escuro");
    try {
      localStorage.setItem(CHAVE, tema);
    } catch {
      /* storage indisponível */
    }
  }, [tema]);

  const alternarTema = () => setTema((t) => (t === "claro" ? "escuro" : "claro"));

  return <ThemeContext.Provider value={{ tema, alternarTema }}>{children}</ThemeContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useTheme() {
  return useContext(ThemeContext);
}
