import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  DocumentDuplicateIcon,
  EyeIcon,
  MagnifyingGlassIcon,
  PencilSquareIcon,
  PlusIcon,
  TrashIcon,
} from "@heroicons/react/24/outline";
import api from "../../services/api";
import { useToast } from "../../context/ToastContext";
import { usePermissao } from "../../hooks/usePermissao";
import { useDebounce } from "../../hooks/useDebounce";
import { mensagemErro } from "../../utils/erros";
import { formatarData, rotuloTipoArquivo } from "../../utils/formatos";
import PageHeader from "../../components/PageHeader";
import ConfirmDialog from "../../components/ConfirmDialog";
import EmptyState from "../../components/EmptyState";
import Spinner from "../../components/Spinner";

export default function ModelosAdminPage() {
  const { addToast } = useToast();
  const podeCriar = usePermissao("modelos", "criar");
  const podeEditar = usePermissao("modelos", "editar");
  const podeExcluir = usePermissao("modelos", "excluir");

  const [busca, setBusca] = useState("");
  const q = useDebounce(busca, 300);
  const [categoriaId, setCategoriaId] = useState("");
  const [situacao, setSituacao] = useState("");
  const [categorias, setCategorias] = useState([]);
  const [modelos, setModelos] = useState(null);
  const [excluindo, setExcluindo] = useState(null);

  const carregar = useCallback(() => {
    api
      .get("/modelos", {
        params: {
          q: q || undefined,
          categoria_id: categoriaId || undefined,
          incluir_inativos: true,
          ordenar: "recentes",
          limit: 500,
        },
      })
      .then((r) => setModelos(r.data.items))
      .catch((e) => {
        addToast(mensagemErro(e), "error");
        setModelos([]);
      });
  }, [q, categoriaId, addToast]);

  useEffect(carregar, [carregar]);
  useEffect(() => {
    api
      .get("/categorias", { params: { incluir_inativas: true } })
      .then((r) => setCategorias(r.data.data))
      .catch(() => {});
  }, []);

  const alternarAtivo = async (m) => {
    try {
      await api.put(`/modelos/${m.id}`, { ativo: !m.ativo });
      addToast(m.ativo ? "Modelo desativado (oculto para mentorados)." : "Modelo reativado.");
      carregar();
    } catch (e) {
      addToast(mensagemErro(e), "error");
    }
  };

  const excluir = async () => {
    try {
      await api.delete(`/modelos/${excluindo.id}`);
      addToast("Modelo excluído.");
      setExcluindo(null);
      carregar();
    } catch (e) {
      addToast(mensagemErro(e), "error");
    }
  };

  const visiveis = (modelos || []).filter((m) => (situacao === "" ? true : situacao === "ativos" ? m.ativo : !m.ativo));

  return (
    <div>
      <PageHeader titulo="Modelos" descricao="Crie, atualize, desative ou exclua os modelos da biblioteca.">
        {podeCriar && (
          <Link to="/admin/modelos/novo" className="btn-primary">
            <PlusIcon className="w-4 h-4" /> Novo modelo
          </Link>
        )}
      </PageHeader>

      <div className="card p-3 sm:p-4 flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <MagnifyingGlassIcon className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-mute" />
          <input
            type="search"
            className="input !pl-10"
            placeholder="Buscar por título, palavra-chave, conteúdo…"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            aria-label="Buscar modelos"
          />
        </div>
        <select className="input sm:!w-56" value={categoriaId} onChange={(e) => setCategoriaId(e.target.value)} aria-label="Categoria">
          <option value="">Todas as categorias</option>
          {categorias.map((c) => (
            <option key={c.id} value={c.id}>
              {c.nome}
              {c.ativa ? "" : " (inativa)"}
            </option>
          ))}
        </select>
        <select className="input sm:!w-40" value={situacao} onChange={(e) => setSituacao(e.target.value)} aria-label="Situação">
          <option value="">Todos</option>
          <option value="ativos">Ativos</option>
          <option value="inativos">Desativados</option>
        </select>
      </div>

      <div className="mt-4">
        {modelos === null ? (
          <Spinner />
        ) : visiveis.length === 0 ? (
          <EmptyState icone={DocumentDuplicateIcon} titulo="Nenhum modelo encontrado">
            {podeCriar && "Clique em “Novo modelo” para começar."}
          </EmptyState>
        ) : (
          <div className="card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-panel-2 text-left text-xs uppercase tracking-wider text-mute">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Modelo</th>
                    <th className="px-4 py-3 font-semibold hidden md:table-cell">Categoria</th>
                    <th className="px-4 py-3 font-semibold hidden sm:table-cell">Versão</th>
                    <th className="px-4 py-3 font-semibold hidden lg:table-cell">Atualizado</th>
                    <th className="px-4 py-3 font-semibold">Situação</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {visiveis.map((m) => (
                    <tr key={m.id} className="align-top">
                      <td className="px-4 py-3">
                        <div className="font-semibold text-text">{m.titulo}</div>
                        <div className="text-xs text-mute mt-0.5">
                          {[rotuloTipoArquivo(m.arquivo_tipo), m.tem_conteudo && "Texto", m.tem_link && "Link"]
                            .filter(Boolean)
                            .join(" · ") || "Sem conteúdo"}
                          <span className="md:hidden"> · {m.categoria.nome}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell text-dim">{m.categoria.nome}</td>
                      <td className="px-4 py-3 hidden sm:table-cell text-dim tabular-nums">v{m.versao}</td>
                      <td className="px-4 py-3 hidden lg:table-cell text-dim">{formatarData(m.conteudo_atualizado_em)}</td>
                      <td className="px-4 py-3">
                        {podeEditar ? (
                          <button
                            onClick={() => alternarAtivo(m)}
                            className={`chip ${m.ativo ? "bg-ok-soft text-ok" : "bg-danger-soft text-danger"}`}
                            title={m.ativo ? "Clique para desativar" : "Clique para reativar"}
                          >
                            {m.ativo ? "Ativo" : "Desativado"}
                          </button>
                        ) : (
                          <span className={`chip ${m.ativo ? "bg-ok-soft text-ok" : "bg-danger-soft text-danger"}`}>
                            {m.ativo ? "Ativo" : "Desativado"}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-1">
                          <Link to={`/app/modelos/${m.id}`} className="btn-ghost !p-2" title="Ver como mentorado">
                            <EyeIcon className="w-4 h-4" />
                          </Link>
                          {podeEditar && (
                            <Link to={`/admin/modelos/${m.id}`} className="btn-ghost !p-2" title="Editar">
                              <PencilSquareIcon className="w-4 h-4" />
                            </Link>
                          )}
                          {podeExcluir && (
                            <button className="btn-ghost !p-2 hover:!text-danger" title="Excluir" onClick={() => setExcluindo(m)}>
                              <TrashIcon className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      <ConfirmDialog
        aberto={Boolean(excluindo)}
        titulo="Excluir modelo"
        mensagem={`Excluir definitivamente “${excluindo?.titulo}” e o arquivo anexado? Para apenas ocultar dos mentorados, use “Desativar”.`}
        textoConfirmar="Excluir"
        perigo
        onConfirmar={excluir}
        onFechar={() => setExcluindo(null)}
      />
    </div>
  );
}
