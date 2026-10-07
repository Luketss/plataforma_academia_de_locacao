import { useEffect, useState } from "react";
import { UserCircleIcon } from "@heroicons/react/24/solid";
import { buscarBlobUrl } from "../services/arquivos";

/** Foto do mentor (endpoint autenticado → blob URL). `versao` força recarregar. */
export default function FotoMentor({ temFoto, versao, className = "w-40 h-40" }) {
  const [url, setUrl] = useState(null);

  useEffect(() => {
    if (!temFoto) return;
    let ativo = true;
    let criada = null;
    buscarBlobUrl("/conteudo/foto")
      .then((u) => {
        criada = u;
        if (ativo) setUrl(u);
        else URL.revokeObjectURL(u);
      })
      .catch(() => ativo && setUrl(null));
    return () => {
      ativo = false;
      if (criada) URL.revokeObjectURL(criada);
    };
  }, [temFoto, versao]);

  if (!temFoto || !url)
    return (
      <div className={`${className} rounded-2xl bg-panel-2 flex items-center justify-center`}>
        <UserCircleIcon className="w-2/3 h-2/3 text-mute" />
      </div>
    );
  return <img src={url} alt="Foto do mentor" className={`${className} rounded-2xl object-cover`} />;
}
