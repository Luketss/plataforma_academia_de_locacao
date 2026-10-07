export default function PageHeader({ titulo, descricao, children }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6">
      <div>
        <h1 className="text-2xl font-extrabold">{titulo}</h1>
        {descricao && <p className="text-dim mt-1 text-sm">{descricao}</p>}
      </div>
      {children && <div className="flex flex-wrap gap-2">{children}</div>}
    </div>
  );
}
