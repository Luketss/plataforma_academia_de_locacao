import { useEffect } from "react";
import { XMarkIcon } from "@heroicons/react/24/outline";

export default function Modal({ aberto, titulo, onFechar, children, largura = "max-w-lg" }) {
  useEffect(() => {
    if (!aberto) return;
    const esc = (e) => e.key === "Escape" && onFechar();
    document.addEventListener("keydown", esc);
    return () => document.removeEventListener("keydown", esc);
  }, [aberto, onFechar]);

  if (!aberto) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onFechar} aria-hidden />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={titulo}
        className={`card relative w-full ${largura} max-h-[92vh] overflow-y-auto rounded-b-none sm:rounded-2xl`}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-border sticky top-0 bg-panel">
          <h2 className="text-lg font-bold">{titulo}</h2>
          <button onClick={onFechar} className="btn-ghost !p-1.5" aria-label="Fechar">
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}
