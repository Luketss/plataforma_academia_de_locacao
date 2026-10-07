export default function Logo({ compacto = false }) {
  return (
    <div className="flex items-center gap-2.5 select-none">
      <svg viewBox="0 0 64 64" className="w-9 h-9 shrink-0" aria-hidden>
        <rect width="64" height="64" rx="14" fill="var(--brand)" />
        <path d="M32 13 12 29h6v20h10V37h8v12h10V29h6z" fill="var(--accent)" />
      </svg>
      {!compacto && (
        <div className="leading-tight">
          <div className="font-display font-extrabold text-[15px] text-text">Academia de Locação</div>
          <div className="text-[11px] uppercase tracking-wider text-mute font-semibold">Biblioteca de modelos</div>
        </div>
      )}
    </div>
  );
}
