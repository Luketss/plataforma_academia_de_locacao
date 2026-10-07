import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  ArrowDownTrayIcon,
  ArrowLeftIcon,
  ArrowTopRightOnSquareIcon,
  ClipboardDocumentIcon,
  EyeIcon,
  EyeSlashIcon,
  InformationCircleIcon,
  PencilSquareIcon,
  PaperClipIcon,
} from "@heroicons/react/24/outline";
import api from "../../services/api";
import { baixarArquivo, buscarBlobUrl } from "../../services/arquivos";
import { useToast } from "../../context/ToastContext";
import { usePermissao } from "../../hooks/usePermissao";
import { mensagemErro } from "../../utils/erros";
import {
  formatarData,
  formatarTamanho,
  podeVisualizarNoNavegador,
  rotuloTipoArquivo,
} from "../../utils/formatos";
import MarkdownLite from "../../components/MarkdownLite";
import StatusBadge from "../../components/StatusBadge";
import Spinner from "../../components/Spinner";
import EmptyState from "../../components/EmptyState";

function Visualizador({ modeloId, arquivo }) {
  const [url, setUrl] = useState(null);
  const [erro, setErro] = useState("");

  useEffect(() => {
    let ativo = true;
    let criada = null;
    buscarBlobUrl(`/modelos/${modeloId}/arquivo`, { inline: true })
      .then((u) => {
        criada = u;
        if (ativo) setUrl(u);
        else URL.revokeObjectURL(u);
      })
      .catch((e) => ativo && setErro(mensagemErro(e)));
    return () => {
      ativo = false;
      if (criada) URL.revokeObjectURL(criada);
    };
  }, [modeloId, arquivo.id]);

  if (erro) return <p className="text-sm text-danger">{erro}</p>;
  if (!url) return <Spinner texto="Abrindo arquivo…" />;
  if (arquivo.content_type.startsWith("image/"))
    return <img src={url} alt={arquivo.nome_original} className="max-w-full rounded-xl border border-border" />;
  return <iframe src={url} title={arquivo.nome_original} className="w-full h-[75vh] rounded-xl border border-border bg-white" />;
}

// key={id}: trocar de modelo remonta a página com estado limpo.
export default function ModeloPage() {
  const { id } = useParams();
  return <ModeloDetalhe key={id} id={id} />;
}

function ModeloDetalhe({ id }) {
  const { addToast } = useToast();
  const podeEditar = usePermissao("modelos", "editar");
  const [modelo, setModelo] = useState(null);
  const [erro, setErro] = useState("");
  const [visualizando, setVisualizando] = useState(false);
  const [baixando, setBaixando] = useState(false);

  useEffect(() => {
    let ativo = true;
    api
      .get(`/modelos/${id}`)
      .then((r) => ativo && setModelo(r.data.data))
      .catch((e) => ativo && setErro(e.response?.status === 404 ? "Modelo não encontrado." : mensagemErro(e)));
    return () => {
      ativo = false;
    };
  }, [id]);

  if (erro)
    return (
      <EmptyState icone={InformationCircleIcon} titulo={erro}>
        <Link to="/app/biblioteca" className="text-brand font-semibold">
          Voltar à biblioteca
        </Link>
      </EmptyState>
    );
  if (!modelo) return <Spinner />;

  const arquivo = modelo.arquivo;
  const baixar = async () => {
    setBaixando(true);
    try {
      await baixarArquivo(`/modelos/${modelo.id}/arquivo`, arquivo.nome_original);
    } catch (e) {
      addToast(mensagemErro(e), "error");
    } finally {
      setBaixando(false);
    }
  };
  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(modelo.conteudo || "");
      addToast("Texto do modelo copiado.");
    } catch {
      addToast("Não foi possível copiar.", "error");
    }
  };

  return (
    <article className="grid gap-6">
      <div className="flex items-center justify-between gap-2">
        <Link to="/app/biblioteca" className="btn-ghost !px-2">
          <ArrowLeftIcon className="w-4 h-4" /> Biblioteca
        </Link>
        {podeEditar && (
          <Link to={`/admin/modelos/${modelo.id}`} className="btn-secondary !py-1.5">
            <PencilSquareIcon className="w-4 h-4" /> Editar
          </Link>
        )}
      </div>

      <header className="card p-6 sm:p-8">
        <div className="flex flex-wrap items-center gap-2">
          <Link
            to={`/app/biblioteca?categoria=${modelo.categoria.id}`}
            className="chip bg-brand-soft text-brand hover:opacity-80"
          >
            {modelo.categoria.nome}
          </Link>
          <StatusBadge status={modelo.status} />
          {!modelo.ativo && <span className="chip bg-danger-soft text-danger">Desativado</span>}
        </div>
        <h1 className="mt-3 text-2xl sm:text-3xl font-extrabold leading-tight">{modelo.titulo}</h1>
        {modelo.descricao && <p className="mt-2 text-dim whitespace-pre-line">{modelo.descricao}</p>}
        <p className="mt-3 text-xs text-mute">
          Versão {modelo.versao} · atualizado em {formatarData(modelo.conteudo_atualizado_em)}
        </p>

        {modelo.nota_atualizacao && modelo.versao > 1 && (
          <div
            className={`mt-4 rounded-xl px-4 py-3 text-sm flex gap-2 ${
              modelo.status === "atualizado" ? "bg-accent-soft text-text" : "bg-panel-2 text-dim"
            }`}
          >
            <InformationCircleIcon className="w-5 h-5 shrink-0 text-accent" />
            <div>
              <span className="font-semibold">O que mudou na versão {modelo.versao}: </span>
              {modelo.nota_atualizacao}
            </div>
          </div>
        )}

        {modelo.palavras_chave.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-1.5">
            {modelo.palavras_chave.map((p) => (
              <Link
                key={p}
                to={`/app/biblioteca?q=${encodeURIComponent(p)}`}
                className="chip bg-panel-2 text-dim hover:text-text font-medium"
              >
                #{p}
              </Link>
            ))}
          </div>
        )}

        <div className="mt-6 flex flex-wrap gap-2">
          {arquivo && (
            <button className="btn-primary" onClick={baixar} disabled={baixando}>
              <ArrowDownTrayIcon className="w-4 h-4" /> {baixando ? "Baixando…" : `Baixar ${rotuloTipoArquivo(arquivo.content_type)}`}
            </button>
          )}
          {arquivo && podeVisualizarNoNavegador(arquivo.content_type) && (
            <button className="btn-secondary" onClick={() => setVisualizando((v) => !v)}>
              {visualizando ? <EyeSlashIcon className="w-4 h-4" /> : <EyeIcon className="w-4 h-4" />}
              {visualizando ? "Fechar visualização" : "Visualizar"}
            </button>
          )}
          {modelo.link_externo && (
            <a href={modelo.link_externo} target="_blank" rel="noopener noreferrer" className="btn-secondary">
              <ArrowTopRightOnSquareIcon className="w-4 h-4" /> Abrir link
            </a>
          )}
          {modelo.tem_conteudo && (
            <button className="btn-secondary" onClick={copiar}>
              <ClipboardDocumentIcon className="w-4 h-4" /> Copiar texto
            </button>
          )}
        </div>
        {arquivo && (
          <p className="mt-2 text-xs text-mute inline-flex items-center gap-1">
            <PaperClipIcon className="w-3.5 h-3.5" /> {arquivo.nome_original} · {formatarTamanho(arquivo.tamanho)}
          </p>
        )}
      </header>

      {visualizando && arquivo && (
        <section className="card p-3 sm:p-4">
          <Visualizador modeloId={modelo.id} arquivo={arquivo} />
        </section>
      )}

      {modelo.tem_conteudo && (
        <section className="card p-6 sm:p-8">
          <MarkdownLite texto={modelo.conteudo} className="text-text" />
        </section>
      )}
    </article>
  );
}
