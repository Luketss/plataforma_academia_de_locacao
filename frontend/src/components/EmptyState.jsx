export default function EmptyState({ icone: Icone, titulo, children }) {
  return (
    <div className="card px-6 py-12 text-center">
      {Icone && <Icone className="w-10 h-10 mx-auto text-mute" />}
      <p className="mt-3 font-semibold text-text">{titulo}</p>
      {children && <div className="mt-1 text-sm text-dim">{children}</div>}
    </div>
  );
}
