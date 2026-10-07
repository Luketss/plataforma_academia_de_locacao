import { useState } from "react";
import Modal from "./Modal";

export default function ConfirmDialog({ aberto, titulo, mensagem, textoConfirmar = "Confirmar", perigo, onConfirmar, onFechar }) {
  const [enviando, setEnviando] = useState(false);
  const confirmar = async () => {
    setEnviando(true);
    try {
      await onConfirmar();
    } finally {
      setEnviando(false);
    }
  };
  return (
    <Modal aberto={aberto} titulo={titulo} onFechar={onFechar} largura="max-w-md">
      <p className="text-sm text-dim">{mensagem}</p>
      <div className="mt-6 flex justify-end gap-2">
        <button className="btn-secondary" onClick={onFechar} disabled={enviando}>
          Cancelar
        </button>
        <button className={perigo ? "btn-danger" : "btn-primary"} onClick={confirmar} disabled={enviando}>
          {enviando ? "Aguarde…" : textoConfirmar}
        </button>
      </div>
    </Modal>
  );
}
