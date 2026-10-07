import { createContext, useCallback, useContext, useState } from "react";
import { CheckCircleIcon, ExclamationCircleIcon, XMarkIcon } from "@heroicons/react/24/outline";

const ToastContext = createContext({ addToast: () => {} });

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const remover = useCallback((id) => setToasts((t) => t.filter((x) => x.id !== id)), []);

  const addToast = useCallback(
    (message, type = "success", duration = 3500) => {
      const id = Date.now() + Math.random();
      setToasts((t) => [...t, { id, message, type }]);
      setTimeout(() => remover(id), duration);
    },
    [remover]
  );

  return (
    <ToastContext.Provider value={{ addToast }}>
      {children}
      <div className="fixed bottom-4 right-4 left-4 sm:left-auto z-[60] flex flex-col gap-2 items-end">
        {toasts.map((t) => (
          <div
            key={t.id}
            role="status"
            aria-live="polite"
            className="card flex items-center gap-3 px-4 py-3 w-full sm:w-auto sm:min-w-[280px] max-w-sm"
          >
            {t.type === "error" ? (
              <ExclamationCircleIcon className="w-5 h-5 text-danger shrink-0" />
            ) : (
              <CheckCircleIcon className="w-5 h-5 text-ok shrink-0" />
            )}
            <span className="flex-1 text-sm font-medium">{t.message}</span>
            <button onClick={() => remover(t.id)} className="text-mute hover:text-text" aria-label="Fechar">
              <XMarkIcon className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useToast() {
  return useContext(ToastContext);
}
