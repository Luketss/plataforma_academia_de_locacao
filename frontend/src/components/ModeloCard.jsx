import { Link } from "react-router-dom";
import { DocumentTextIcon, LinkIcon, PaperClipIcon, StarIcon } from "@heroicons/react/24/outline";
import StatusBadge from "./StatusBadge";
import { formatarData, rotuloTipoArquivo } from "../utils/formatos";

export default function ModeloCard({ modelo, mostrarCategoria = true }) {
  const tipo = rotuloTipoArquivo(modelo.arquivo_tipo);
  return (
    <Link
      to={`/app/modelos/${modelo.id}`}
      className="card block p-4 sm:p-5 hover:border-brand transition group h-full"
    >
      <div className="flex flex-wrap items-center gap-2 text-xs">
        {mostrarCategoria && <span className="chip bg-brand-soft text-brand">{modelo.categoria.nome}</span>}
        <StatusBadge status={modelo.status} />
        {modelo.destaque && (
          <span className="chip bg-panel-2 text-dim">
            <StarIcon className="w-3.5 h-3.5" /> Destaque
          </span>
        )}
      </div>
      <h3 className="mt-2 font-display font-bold text-[17px] leading-snug group-hover:text-brand">{modelo.titulo}</h3>
      {modelo.descricao && <p className="mt-1 text-sm text-dim line-clamp-2">{modelo.descricao}</p>}
      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-mute">
        {tipo && (
          <span className="inline-flex items-center gap-1">
            <PaperClipIcon className="w-3.5 h-3.5" /> {tipo}
          </span>
        )}
        {modelo.tem_conteudo && (
          <span className="inline-flex items-center gap-1">
            <DocumentTextIcon className="w-3.5 h-3.5" /> Texto
          </span>
        )}
        {modelo.tem_link && (
          <span className="inline-flex items-center gap-1">
            <LinkIcon className="w-3.5 h-3.5" /> Link
          </span>
        )}
        <span className="ml-auto">Atualizado em {formatarData(modelo.conteudo_atualizado_em)}</span>
      </div>
    </Link>
  );
}
