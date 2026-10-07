export default function Spinner({ texto = "Carregando…" }) {
  return (
    <div className="flex items-center justify-center gap-3 py-16 text-dim text-sm" role="status">
      <span className="w-5 h-5 rounded-full border-2 border-border-strong border-t-brand animate-spin" />
      {texto}
    </div>
  );
}
