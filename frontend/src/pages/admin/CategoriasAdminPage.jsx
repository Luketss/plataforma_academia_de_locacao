import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { PencilSquareIcon, PlusIcon, TagIcon, TrashIcon } from "@heroicons/react/24/outline";
import api from "../../services/api";
import { useToast } from "../../context/ToastContext";
import { usePermissao } from "../../hooks/usePermissao";
import { mensagemErro } from "../../utils/erros";
import PageHeader from "../../components/PageHeader";
import Modal from "../../components/Modal";
import ConfirmDialog from "../../components/ConfirmDialog";
import EmptyState from "../../components/EmptyState";
import Spinner from "../../components/Spinner";

const VAZIA = { nome: "", descricao: "", ordem: 0, ativa: true };

function FormCategoria({ inicial, onSalvar, onCancelar }) {
  const [form, setForm] = useState(inicial);
  const [erro, setErro] = useState("");
  const [salvando, setSalvando] = useState(false);

  const enviar = async (e) => {
    e.preventDefault();
    setErro("");
    setSalvando(true);
    try {
      await onSalvar({
        nome: form.nome.trim(),
        descricao: form.descricao?.trim() || null,
        ordem: Number(form.ordem) || 0,
        ativa: form.ativa,
      });
    } catch (err) {
      setErro(mensagemErro(err));
      setSalvando(false);
    }
  };

  return (
    <form onSubmit={enviar} className="grid gap-4">
      <div>
        <label className="label" htmlFor="cat-nome">Nome *</label>
        <input
          id="cat-nome"
          className="input"
          required
          minLength={2}
          maxLength={120}
          value={form.nome}
          onChange={(e) => setForm({ ...form, nome: e.target.value })}
        />
      </div>
      <div>
        <label className="label" htmlFor="cat-desc">Descrição</label>
        <textarea
          id="cat-desc"
          className="input"
          rows={3}
          value={form.descricao || ""}
          onChange={(e) => setForm({ ...form, descricao: e.target.value })}
        />
      </div>
      <div className="grid grid-cols-2 gap-4 items-end">
        <div>
          <label className="label" htmlFor="cat-ordem">Ordem de exibição</label>
          <input
            id="cat-ordem"
            type="number"
            className="input"
            value={form.ordem}
            onChange={(e) => setForm({ ...form, ordem: e.target.value })}
          />
        </div>
        <label className="inline-flex items-center gap-2 text-sm pb-2">
          <input
            type="checkbox"
            checked={form.ativa}
            onChange={(e) => setForm({ ...form, ativa: e.target.checked })}
            className="w-4 h-4 accent-[var(--brand)]"
          />
          Ativa
        </label>
      </div>
      {erro && <p role="alert" className="rounded-lg bg-danger-soft text-danger text-sm px-3 py-2">{erro}</p>}
      <div className="flex justify-end gap-2">
        <button type="button" className="btn-secondary" onClick={onCancelar}>Cancelar</button>
        <button className="btn-primary" disabled={salvando}>{salvando ? "Salvando…" : "Salvar"}</button>
      </div>
    </form>
  );
}

export default function CategoriasAdminPage() {
  const { addToast } = useToast();
  const podeCriar = usePermissao("categorias", "criar");
  const podeEditar = usePermissao("categorias", "editar");
  const podeExcluir = usePermissao("categorias", "excluir");
  const [categorias, setCategorias] = useState(null);
  const [editando, setEditando] = useState(null); // {} = nova, objeto = edição
  const [excluindo, setExcluindo] = useState(null);

  const carregar = useCallback(() => {
    api
      .get("/categorias", { params: { incluir_inativas: true } })
      .then((r) => setCategorias(r.data.data))
      .catch((e) => {
        addToast(mensagemErro(e), "error");
        setCategorias([]);
      });
  }, [addToast]);

  useEffect(carregar, [carregar]);

  const salvar = async (dados) => {
    if (editando.id) await api.put(`/categorias/${editando.id}`, dados);
    else await api.post("/categorias", dados);
    addToast(editando.id ? "Categoria atualizada." : "Categoria criada.");
    setEditando(null);
    carregar();
  };

  const excluir = async () => {
    try {
      await api.delete(`/categorias/${excluindo.id}`);
      addToast("Categoria excluída.");
      setExcluindo(null);
      carregar();
    } catch (e) {
      addToast(mensagemErro(e), "error");
      setExcluindo(null);
    }
  };

  return (
    <div>
      <PageHeader titulo="Categorias" descricao="Assuntos que organizam a biblioteca. Categorias inativas ficam ocultas junto com seus modelos.">
        {podeCriar && (
          <button className="btn-primary" onClick={() => setEditando({ ...VAZIA, ordem: (categorias?.length || 0) * 10 })}>
            <PlusIcon className="w-4 h-4" /> Nova categoria
          </button>
        )}
      </PageHeader>

      {categorias === null ? (
        <Spinner />
      ) : categorias.length === 0 ? (
        <EmptyState icone={TagIcon} titulo="Nenhuma categoria cadastrada">Crie a primeira para organizar os modelos.</EmptyState>
      ) : (
        <div className="card divide-y divide-border">
          {categorias.map((c) => (
            <div key={c.id} className="flex items-center gap-4 px-4 sm:px-5 py-4">
              <div className="w-10 text-xs text-mute tabular-nums text-right">{c.ordem}</div>
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-semibold">{c.nome}</span>
                  {!c.ativa && <span className="chip bg-danger-soft text-danger">Inativa</span>}
                </div>
                {c.descricao && <p className="text-sm text-dim truncate">{c.descricao}</p>}
              </div>
              <Link to={`/admin/modelos`} className="hidden sm:block text-sm text-dim whitespace-nowrap">
                {c.total_modelos} {c.total_modelos === 1 ? "modelo" : "modelos"}
              </Link>
              <div className="flex gap-1">
                {podeEditar && (
                  <button className="btn-ghost !p-2" title="Editar" onClick={() => setEditando(c)}>
                    <PencilSquareIcon className="w-4 h-4" />
                  </button>
                )}
                {podeExcluir && (
                  <button className="btn-ghost !p-2 hover:!text-danger" title="Excluir" onClick={() => setExcluindo(c)}>
                    <TrashIcon className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal aberto={Boolean(editando)} titulo={editando?.id ? "Editar categoria" : "Nova categoria"} onFechar={() => setEditando(null)}>
        {editando && <FormCategoria inicial={editando} onSalvar={salvar} onCancelar={() => setEditando(null)} />}
      </Modal>

      <ConfirmDialog
        aberto={Boolean(excluindo)}
        titulo="Excluir categoria"
        mensagem={
          excluindo?.total_modelos
            ? `“${excluindo?.nome}” tem modelos. Mova-os para outra categoria antes de excluir, ou desative a categoria.`
            : `Excluir a categoria “${excluindo?.nome}”?`
        }
        textoConfirmar="Excluir"
        perigo
        onConfirmar={excluir}
        onFechar={() => setExcluindo(null)}
      />
    </div>
  );
}
