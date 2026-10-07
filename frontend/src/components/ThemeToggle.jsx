import { MoonIcon, SunIcon } from "@heroicons/react/24/outline";
import { useTheme } from "../context/ThemeContext";

export default function ThemeToggle() {
  const { tema, alternarTema } = useTheme();
  const escuro = tema === "escuro";
  return (
    <button
      onClick={alternarTema}
      className="btn-ghost !p-2"
      title={escuro ? "Tema claro" : "Tema escuro"}
      aria-label={escuro ? "Usar tema claro" : "Usar tema escuro"}
    >
      {escuro ? <SunIcon className="w-5 h-5" /> : <MoonIcon className="w-5 h-5" />}
    </button>
  );
}
