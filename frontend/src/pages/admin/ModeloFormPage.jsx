import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeftIcon, ArrowUpTrayIcon, EyeIcon, PaperClipIcon, PencilIcon, TrashIcon } from "@heroicons/react/24/outline";
import api from "../../services/api";
import { useToast } from "../../context/ToastContext";
import { mensagemErro } from "../../utils/erros";
import { formatarData, formatarTamanho } from "../../utils/formatos";
import { juntarPalavrasChave, separarPalavrasChave } from "../../utils/palavrasChave";
import MarkdownLite from "../../components/MarkdownLite";
import Spinner from "../../components/Spinner";

const ACEITOS = ".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.odt,.ods,.txt,.csv,.zip,.png,.jpg,.jpeg,.webp";

const VAZIO = {
  titulo: "",
  categoria_id: "",
  descricao: "",
  palavras: "",
  conteudo: "",
  link_externo: "",
  ativo: true,
  destaque: false,
};

export default function ModeloFormPage() {
  const { id } = useParams();
  const editando = Boolean(id);
  const navigate = useNavigate();
  const { addToast } = useToast();
  const inputArquivo = useRef(null);

  const [form, setForm] = useState(VAZIO);
  const [modelo, setModelo] = useState(null);
  const [categorias, setCategorias] = useState(null);
  const [arquivoNovo, setArquivoNovo] = useState(null);
  const [registrar, setRegistrar] = useState("auto");
  const [nota, setNota] = useState("");
  const [previa, setPrevia] = useState(false);
  const [erro, setErro] = useState("");
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    api
      .get("/categorias", { params: { incluir_inativas: true } })
      .then((r) => setCategorias(r.data.data))
      .catch(() => setCategorias([]));
  }, []);

  useEffect(() => {
    if (!editando) return;
    api
      .get(`/modelos/${id}`, { params: { registrar_visualizacao: false } })
      .then((r) => {
        const m = r.data.data;
        setModelo(m);
        setForm({
          titulo: m.titulo,
          categoria_id: String(m.categoria.id),
          descricao: m.descricao || "",
          palavras: juntarPalavrasChave(m.palavras_chave),
          conteudo: m.conteudo || "",
          link_externo: m.link_externo || "",
          ativo: m.ativo,
          destaque: m.destaque,
        });
      })
      .catch((e) => setErro(mensagemErro(e)));
  }, [editando, id]);

  const set = (campo) => (e) =>
    setForm((f) => ({ ...f, [campo]: e.target.type === "checkbox" ? e.target.checked : e.target.value }));

  const payloadBase = () => ({
    titulo: form.titulo.trim(),
    categoria_id: Number(form.categoria_id),
    descricao: form.descricao.trim() || null,
    palavras_chave: separarPalavrasChave(form.palavras),
    conteudo: form.conteudo.trim() ? form.conteudo : null,
    link_externo: form.link_externo.trim() || null,
    ativo: form.ativo,
    destaque: form.destaque,
  });

  const enviarArquivo = (modeloId, registrarAtualizacao) => {
    const dados = new FormData();
    dados.append("arquivo", arquivoNovo);
    dados.append("registrar_atualizacao", registrarAtualizacao ? "true" : "false");
    return api.post(`/modelos/${modeloId}/arquivo`, dados);
  };

  const salvar = async (e) => {
    e.preventDefault();
    setErro("");
    if (!form.categoria_id) return setErro("Escolha uma categoria.");
    setSalvando(true);
    try {
      if (!editando) {
        const r = await api.post("/modelos", payloadBase());
        // Arquivo enviado junto com a criação continua sendo a versão 1.
        if (arquivoNovo) await enviarArquivo(r.data.data.id, false);
        addToast("Modelo criado.");
        navigate("/admin/modelos");
        return;
      }
      // Uma única nova versão por salvamento, mesmo trocando texto e arquivo juntos.
      const payload = { ...payloadBase(), nota_atualizacao: nota.trim() || null };
      if (registrar === "sim" || (registrar === "auto" && arquivoNovo)) payload.registrar_atualizacao = true;
      else if (registrar === "nao") payload.registrar_atualizacao = false;
      if (registrar === "nao" || !nota.trim()) delete payload.nota_atualizacao;

      const r = await api.put(`/modelos/${id}`, payload);
      let atualizado = r.data.data;
      if (arquivoNovo) atualizado = (await enviarArquivo(id, false)).data.data;

      setModelo(atualizado);
      setArquivoNovo(null);
      setNota("");
      setRegistrar("auto");
      if (inputArquivo.current) inputArquivo.current.value = "";
      addToast(
        atualizado.versao > modelo.versao
          ? `Modelo salvo como versão ${atualizado.versao} — mentorados verão o selo “Atualizado”.`
          : "Modelo salvo."
      );
    } catch (err) {
      setErro(mensagemErro(err));
    } finally {
      setSalvando(false);
    }
  };

  const removerArquivo = async () => {
    try {
      const r = await api.delete(`/modelos/${id}/arquivo`);
      setModelo(r.data.data);
      addToast("Arquivo removido.");
    } catch (err) {
      addToast(mensagemErro(err), "error");
    }
  };

  if (categorias === null || (editando && !modelo && !erro)) return <Spinner />;

  return (
    <form onSubmit={salvar} className="grid gap-6 max-w-4xl">
      <div className="flex items-center justify-between gap-2">
        <Link to="/admin/modelos" className="btn-ghost !px-2">
          <ArrowLeftIcon className="w-4 h-4" /> Modelos
        </Link>
        {editando && modelo && (
          <Link to={`/app/modelos/${id}`} className="btn-ghost">
            <EyeIcon className="w-4 h-4" /> Ver como mentorado
          </Link>
        )}
      </div>

      <div>
        <h1 className="text-2xl font-extrabold">{editando ? "Editar modelo" : "Novo modelo"}</h1>
        {editando && modelo && (
          <p className="text-sm text-dim mt-1">
            Versão {modelo.versao} · conteúdo atualizado em {formatarData(modelo.conteudo_atualizado_em)}
          </p>
        )}
      </div>

      <section className="card p-6 grid gap-4">
        <h2 className="font-bold">Identificação</h2>
        <div>
          <label className="label" htmlFor="titulo">Título *</label>
          <input id="titulo" className="input" required minLength={2} maxLength={200} value={form.titulo} onChange={set("titulo")} />
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="label" htmlFor="categoria">Categoria / assunto *</label>
            <select id="categoria" className="input" required value={form.categoria_id} onChange={set("categoria_id")}>
              <option value="">Selecione…</option>
              {categorias.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nome}
                  {c.ativa ? "" : " (inativa)"}
                </option>
              ))}
            </select>
            {categorias.length === 0 && (
              <p className="text-xs text-dim mt-1">
                Nenhuma categoria ainda. <Link to="/admin/categorias" className="text-brand font-semibold">Criar categoria</Link>
              </p>
            )}
          </div>
          <div>
            <label className="label" htmlFor="palavras">Palavras-chave</label>
            <input
              id="palavras"
              className="input"
              placeholder="contrato, garantia, reajuste"
              value={form.palavras}
              onChange={set("palavras")}
            />
            <p className="text-xs text-mute mt-1">Separe por vírgula. Ajudam na busca.</p>
          </div>
        </div>
        <div>
          <label className="label" htmlFor="descricao">Descrição</label>
          <textarea
            id="descricao"
            rows={3}
            className="input"
            maxLength={5000}
            placeholder="Para que serve este modelo e quando usar."
            value={form.descricao}
            onChange={set("descricao")}
          />
        </div>
        <div className="flex flex-wrap gap-6">
          <label className="inline-flex items-center gap-2 text-sm">
            <input type="checkbox" checked={form.ativo} onChange={set("ativo")} className="w-4 h-4 accent-[var(--brand)]" />
            Ativo (visível para mentorados)
          </label>
          <label className="inline-flex items-center gap-2 text-sm">
            <input type="checkbox" checked={form.destaque} onChange={set("destaque")} className="w-4 h-4 accent-[var(--brand)]" />
            Destaque (aparece primeiro na categoria)
          </label>
        </div>
      </section>

      <section className="card p-6 grid gap-4">
        <div>
          <h2 className="font-bold">Conteúdo</h2>
          <p className="text-sm text-dim">Use texto, um arquivo anexado e/ou um link — ou combine os três.</p>
        </div>

        <div>
          <div className="flex items-center justify-between">
            <label className="label" htmlFor="conteudo">Texto do modelo</label>
            <button type="button" className="btn-ghost !py-1 !px-2 text-xs" onClick={() => setPrevia((p) => !p)}>
              {previa ? <PencilIcon className="w-4 h-4" /> : <EyeIcon className="w-4 h-4" />}
              {previa ? "Editar" : "Pré-visualizar"}
            </button>
          </div>
          {previa ? (
            <div className="rounded-lg border border-border p-4 min-h-[12rem]">
              {form.conteudo.trim() ? <MarkdownLite texto={form.conteudo} /> : <p className="text-sm text-mute">Sem texto.</p>}
            </div>
          ) : (
            <textarea
              id="conteudo"
              rows={14}
              className="input font-mono !text-[13px]"
              value={form.conteudo}
              onChange={set("conteudo")}
              placeholder={"## Título da seção\nTexto do parágrafo com **negrito**.\n- item de lista\n1. item numerado\n[texto do link](https://...)"}
            />
          )}
          <p className="text-xs text-mute mt-1">
            Formatação: <code>## título</code>, <code>**negrito**</code>, <code>- lista</code>, <code>1. lista numerada</code>,{" "}
            <code>[link](https://…)</code>.
          </p>
        </div>

        <div>
          <span className="label">Arquivo</span>
          {modelo?.arquivo && !arquivoNovo && (
            <div className="flex flex-wrap items-center gap-3 rounded-lg border border-border px-3 py-2 text-sm mb-2">
              <PaperClipIcon className="w-4 h-4 text-mute" />
              <span className="font-medium">{modelo.arquivo.nome_original}</span>
              <span className="text-mute">{formatarTamanho(modelo.arquivo.tamanho)}</span>
              <button type="button" className="btn-ghost !py-1 !px-2 text-xs ml-auto hover:!text-danger" onClick={removerArquivo}>
                <TrashIcon className="w-4 h-4" /> Remover
              </button>
            </div>
          )}
          <label className="flex items-center gap-3 rounded-lg border-2 border-dashed border-border-strong px-4 py-4 cursor-pointer hover:border-brand">
            <ArrowUpTrayIcon className="w-5 h-5 text-mute" />
            <span className="text-sm text-dim">
              {arquivoNovo
                ? `${arquivoNovo.name} (${formatarTamanho(arquivoNovo.size)}) — será enviado ao salvar`
                : modelo?.arquivo
                  ? "Substituir arquivo (Word, PDF, Excel, PowerPoint, imagem…)"
                  : "Anexar arquivo (Word, PDF, Excel, PowerPoint, imagem…)"}
            </span>
            <input
              ref={inputArquivo}
              type="file"
              accept={ACEITOS}
              className="sr-only"
              onChange={(e) => setArquivoNovo(e.target.files?.[0] || null)}
            />
          </label>
        </div>

        <div>
          <label className="label" htmlFor="link">Link externo</label>
          <input
            id="link"
            type="url"
            className="input"
            placeholder="https://docs.google.com/…"
            value={form.link_externo}
            onChange={set("link_externo")}
          />
        </div>
      </section>

      {editando && (
        <section className="card p-6 grid gap-3">
          <div>
            <h2 className="font-bold">Registro de atualização</h2>
            <p className="text-sm text-dim">
              Uma nova versão marca o modelo como “Atualizado” para os mentorados que já o tinham aberto.
            </p>
          </div>
          <div className="grid gap-2 text-sm">
            {[
              ["auto", "Automático — nova versão se o texto, o link ou o arquivo mudarem"],
              ["sim", "Registrar como nova versão"],
              ["nao", "Correção pequena — não avisar os mentorados"],
            ].map(([valor, label]) => (
              <label key={valor} className="inline-flex items-center gap-2">
                <input
                  type="radio"
                  name="registrar"
                  value={valor}
                  checked={registrar === valor}
                  onChange={() => setRegistrar(valor)}
                  className="accent-[var(--brand)]"
                />
                {label}
              </label>
            ))}
          </div>
          {registrar !== "nao" && (
            <div>
              <label className="label" htmlFor="nota">O que mudou? (aparece para os mentorados)</label>
              <input
                id="nota"
                className="input"
                maxLength={2000}
                placeholder="Ex.: incluída cláusula de reajuste pelo IPCA"
                value={nota}
                onChange={(e) => setNota(e.target.value)}
              />
            </div>
          )}
        </section>
      )}

      {erro && (
        <p role="alert" className="rounded-lg bg-danger-soft text-danger text-sm px-3 py-2">
          {erro}
        </p>
      )}

      <div className="flex gap-2 sticky bottom-0 py-3 bg-bg">
        <button type="submit" className="btn-primary" disabled={salvando}>
          {salvando ? "Salvando…" : editando ? "Salvar alterações" : "Criar modelo"}
        </button>
        <Link to="/admin/modelos" className="btn-secondary">
          Cancelar
        </Link>
      </div>
    </form>
  );
}
