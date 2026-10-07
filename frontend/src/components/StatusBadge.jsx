import { SparklesIcon, ArrowPathIcon } from "@heroicons/react/20/solid";

/** Selo "Novo" / "Atualizado" calculado pelo backend por usuário. */
export default function StatusBadge({ status }) {
  if (status === "novo")
    return (
      <span className="chip bg-ok-soft text-ok">
        <SparklesIcon className="w-3.5 h-3.5" /> Novo
      </span>
    );
  if (status === "atualizado")
    return (
      <span className="chip bg-accent-soft text-accent">
        <ArrowPathIcon className="w-3.5 h-3.5" /> Atualizado
      </span>
    );
  return null;
}
