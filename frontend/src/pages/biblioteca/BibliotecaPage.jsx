import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { BookOpenIcon, MagnifyingGlassIcon, XMarkIcon } from "@heroicons/react/24/outline";
import api from "../../services/api";
import { useDebounce } from "../../hooks/useDebounce";
import { agruparPorCategoria } from "../../utils/biblioteca";
import { mensagemErro } from "../../utils/erros";
import ModeloCard from "../../components/ModeloCard";
import EmptyState from "../../components/EmptyState";
import Spinner from "../../components/Spinner";

const FILTROS_STATUS = [
  { valor: "", label: "Todos" },
  { valor: "novo", label: "Novos" },
  { valor: "atualizado", label: "Atualizados" },
];

export default function BibliotecaPage() {
  const [params, setParams] = useSearchParams();
  const q = params.get("q") || "";
  const categoriaId = params.get("categoria") || "";
  const status = params.get("status") || "";

  const [texto, setTexto] = useState(q);
  // URL → campo (voltar/avançar do navegador): ajuste durante o render.
  const [qAnterior, setQAnterior] = useState(q);
  if (q !== qAnterior) {
    setQAnterior(q);
    if (texto.trim() !== q) setTexto(q);
  }
  const textoDebounced = useDebounce(texto, 300);
  const [categorias, setCategorias] = useState([]);
  const chave = JSON.stringify([q, categoriaId, status]);
  const [resultado, setResultado] = useState({ chave: null, itens: [], erro: "" });
  const carregando = resultado.chave !== chave;
  const modelos = carregando ? null : resultado.itens;
  const erro = carregando ? "" : resultado.erro;

  const atualizarParam = (chave, valor) => {
    const novo = new URLSearchParams(params);
    if (valor) novo.set(chave, valor);
    else novo.delete(chave);
    setParams(novo, { replace: true });
  };

  // Campo de busca → URL (com debounce).
  useEffect(() => {
    if (textoDebounced.trim() !== q) atualizarParam("q", textoDebounced.trim());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [textoDebounced]);

  useEffect(() => {
    api.get("/categorias").then((r) => setCategorias(r.data.data)).catch(() => setCategorias([]));
  }, []);

  useEffect(() => {
    let ativo = true;
    api
      .get("/modelos", {
        params: { q: q || undefined, categoria_id: categoriaId || undefined, status: status || undefined, limit: 500 },
      })
      .then((r) => ativo && setResultado({ chave, itens: r.data.items, erro: "" }))
      .catch((e) => ativo && setResultado({ chave, itens: [], erro: mensagemErro(e) }));
    return () => {
      ativo = false;
    };
  }, [chave, q, categoriaId, status]);

  const grupos = useMemo(() => agruparPorCategoria(modelos), [modelos]);
  const filtrando = Boolean(q || status);
  const categoriaAtual = categorias.find((c) => String(c.id) === categoriaId);
  const totalGeral = categorias.reduce((s, c) => s + c.total_modelos, 0);

  const itemCategoria = (id, nome, total) => {
    const ativo = categoriaId === (id ? String(id) : "");
    return (
      <button
        key={id || "todas"}
        onClick={() => atualizarParam("categoria", id ? String(id) : "")}
        className={`w-full flex items-center justify-between gap-2 px-3 py-2 rounded-lg text-sm text-left transition ${
          ativo ? "bg-brand-soft text-brand font-semibold" : "text-dim hover:bg-panel-2 hover:text-text"
        }`}
        aria-pressed={ativo}
      >
        <span className="truncate">{nome}</span>
        <span className="text-xs text-mute tabular-nums">{total}</span>
      </button>
    );
  };

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold">Biblioteca de modelos</h1>
          <p className="text-dim mt-1">Encontre modelos por assunto, categoria ou palavra-chave.</p>
        </div>
      </div>

      <div className="mt-6 relative">
        <MagnifyingGlassIcon className="w-5 h-5 absolute left-3.5 top-1/2 -translate-y-1/2 text-mute" />
        <input
          type="search"
          className="input !pl-11 !py-3 !text-base"
          placeholder="Ex.: contrato, vistoria de saída, notificação…"
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          aria-label="Buscar por palavra-chave"
        />
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        {FILTROS_STATUS.map((f) => (
          <button
            key={f.valor || "todos"}
            onClick={() => atualizarParam("status", f.valor)}
            aria-pressed={status === f.valor}
            className={`chip !px-3 !py-1.5 border transition ${
              status === f.valor
                ? "bg-brand text-brand-ink border-brand"
                : "bg-panel text-dim border-border-strong hover:text-text"
            }`}
          >
            {f.label}
          </button>
        ))}
        {/* Categorias em linha no mobile; no desktop ficam na lateral. */}
        <select
          className="input !w-auto lg:hidden"
          value={categoriaId}
          onChange={(e) => atualizarParam("categoria", e.target.value)}
          aria-label="Categoria"
        >
          <option value="">Todas as categorias</option>
          {categorias.map((c) => (
            <option key={c.id} value={c.id}>
              {c.nome} ({c.total_modelos})
            </option>
          ))}
        </select>
        {(q || status || categoriaId) && (
          <button className="btn-ghost !py-1.5 !px-2 text-xs" onClick={() => (setTexto(""), setParams({}, { replace: true }))}>
            <XMarkIcon className="w-4 h-4" /> Limpar filtros
          </button>
        )}
      </div>

      <div className="mt-6 grid lg:grid-cols-[240px_1fr] gap-6 items-start">
        <aside className="hidden lg:block card p-3 sticky top-20">
          <p className="px-3 pt-1 pb-2 text-xs font-bold uppercase tracking-wider text-mute">Assuntos</p>
          {itemCategoria("", "Todos os assuntos", totalGeral)}
          {categorias.map((c) => itemCategoria(c.id, c.nome, c.total_modelos))}
        </aside>

        <section aria-live="polite">
          {modelos === null ? (
            <Spinner />
          ) : erro ? (
            <EmptyState icone={BookOpenIcon} titulo="Não foi possível carregar a biblioteca">
              {erro}
            </EmptyState>
          ) : modelos.length === 0 ? (
            <EmptyState icone={MagnifyingGlassIcon} titulo="Nenhum modelo encontrado">
              Tente outras palavras ou limpe os filtros.
            </EmptyState>
          ) : (
            <>
              <p className="text-sm text-dim mb-3">
                {modelos.length} {modelos.length === 1 ? "modelo" : "modelos"}
                {categoriaAtual ? ` em ${categoriaAtual.nome}` : ""}
                {q ? ` para “${q}”` : ""}
              </p>
              {filtrando || categoriaId ? (
                <div className="grid md:grid-cols-2 gap-3">
                  {modelos.map((m) => (
                    <ModeloCard key={m.id} modelo={m} mostrarCategoria={!categoriaId} />
                  ))}
                </div>
              ) : (
                <div className="grid gap-8">
                  {grupos.map((g) => {
                    const cat = categorias.find((c) => c.id === g.categoria.id);
                    return (
                      <div key={g.categoria.id}>
                        <h2 className="text-lg font-extrabold">{g.categoria.nome}</h2>
                        {cat?.descricao && <p className="text-sm text-dim">{cat.descricao}</p>}
                        <div className="mt-3 grid md:grid-cols-2 gap-3">
                          {g.modelos.map((m) => (
                            <ModeloCard key={m.id} modelo={m} mostrarCategoria={false} />
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </section>
      </div>
    </div>
  );
}
