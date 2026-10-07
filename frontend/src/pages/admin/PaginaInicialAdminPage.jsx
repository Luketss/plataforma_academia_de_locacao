import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowUpTrayIcon, EyeIcon, TrashIcon } from "@heroicons/react/24/outline";
import api from "../../services/api";
import { useToast } from "../../context/ToastContext";
import { mensagemErro } from "../../utils/erros";
import { formatarDataHora } from "../../utils/formatos";
import PageHeader from "../../components/PageHeader";
import FotoMentor from "../../components/FotoMentor";
import Spinner from "../../components/Spinner";

const CAMPOS_TEXTO = [
  ["mentor_curriculo", "Currículo / apresentação profissional", 8],
  ["academia_apresentacao", "Apresentação da Academia de Locação", 6],
  ["metodologia", "Metodologia", 6],
  ["objetivo_plataforma", "Objetivo da plataforma / como usar", 4],
];

export default function PaginaInicialAdminPage() {
  const { addToast } = useToast();
  const inputFoto = useRef(null);
  const [conteudo, setConteudo] = useState(null);
  const [form, setForm] = useState({});
  const [salvando, setSalvando] = useState(false);
  const [enviandoFoto, setEnviandoFoto] = useState(false);

  const aplicar = (c) => {
    setConteudo(c);
    setForm({
      mentor_nome: c.mentor_nome || "",
      mentor_titulo: c.mentor_titulo || "",
      ...Object.fromEntries(CAMPOS_TEXTO.map(([k]) => [k, c[k] || ""])),
    });
  };

  useEffect(() => {
    api
      .get("/conteudo")
      .then((r) => aplicar(r.data.data))
      .catch((e) => addToast(mensagemErro(e), "error"));
  }, [addToast]);

  const salvar = async (e) => {
    e.preventDefault();
    setSalvando(true);
    try {
      const dados = Object.fromEntries(Object.entries(form).map(([k, v]) => [k, v.trim() || null]));
      const r = await api.put("/conteudo", dados);
      aplicar(r.data.data);
      addToast("Página inicial atualizada.");
    } catch (err) {
      addToast(mensagemErro(err), "error");
    } finally {
      setSalvando(false);
    }
  };

  const enviarFoto = async (arquivo) => {
    if (!arquivo) return;
    setEnviandoFoto(true);
    try {
      const dados = new FormData();
      dados.append("arquivo", arquivo);
      const r = await api.post("/conteudo/foto", dados);
      setConteudo(r.data.data);
      addToast("Foto atualizada.");
    } catch (err) {
      addToast(mensagemErro(err), "error");
    } finally {
      setEnviandoFoto(false);
      if (inputFoto.current) inputFoto.current.value = "";
    }
  };

  const removerFoto = async () => {
    try {
      const r = await api.delete("/conteudo/foto");
      setConteudo(r.data.data);
      addToast("Foto removida.");
    } catch (err) {
      addToast(mensagemErro(err), "error");
    }
  };

  if (!conteudo) return <Spinner />;

  return (
    <form onSubmit={salvar} className="max-w-4xl">
      <PageHeader
        titulo="Página inicial"
        descricao={`Textos que os mentorados veem ao entrar.${conteudo.atualizado_em ? ` Última alteração: ${formatarDataHora(conteudo.atualizado_em)}.` : ""}`}
      >
        <Link to="/app" className="btn-secondary">
          <EyeIcon className="w-4 h-4" /> Ver página
        </Link>
      </PageHeader>

      <div className="grid gap-6">
        <section className="card p-6 grid sm:grid-cols-[auto_1fr] gap-6">
          <div className="grid gap-2 justify-items-center">
            <FotoMentor temFoto={conteudo.tem_foto} versao={conteudo.atualizado_em} className="w-36 h-36" />
            <label className="btn-secondary !py-1.5 cursor-pointer">
              <ArrowUpTrayIcon className="w-4 h-4" /> {enviandoFoto ? "Enviando…" : conteudo.tem_foto ? "Trocar foto" : "Enviar foto"}
              <input
                ref={inputFoto}
                type="file"
                accept=".png,.jpg,.jpeg,.webp"
                className="sr-only"
                onChange={(e) => enviarFoto(e.target.files?.[0])}
                disabled={enviandoFoto}
              />
            </label>
            {conteudo.tem_foto && (
              <button type="button" className="btn-ghost !py-1 text-xs hover:!text-danger" onClick={removerFoto}>
                <TrashIcon className="w-4 h-4" /> Remover
              </button>
            )}
          </div>
          <div className="grid gap-4 content-start">
            <div>
              <label className="label" htmlFor="mentor_nome">Nome do mentor</label>
              <input id="mentor_nome" className="input" maxLength={150} value={form.mentor_nome} onChange={(e) => setForm({ ...form, mentor_nome: e.target.value })} />
            </div>
            <div>
              <label className="label" htmlFor="mentor_titulo">Título / cargo</label>
              <input
                id="mentor_titulo"
                className="input"
                maxLength={200}
                placeholder="Ex.: Fundador da Academia de Locação"
                value={form.mentor_titulo}
                onChange={(e) => setForm({ ...form, mentor_titulo: e.target.value })}
              />
            </div>
          </div>
        </section>

        <section className="card p-6 grid gap-5">
          {CAMPOS_TEXTO.map(([chave, label, linhas]) => (
            <div key={chave}>
              <label className="label" htmlFor={chave}>{label}</label>
              <textarea id={chave} rows={linhas} className="input" value={form[chave]} onChange={(e) => setForm({ ...form, [chave]: e.target.value })} />
            </div>
          ))}
          <p className="text-xs text-mute">
            Formatação: <code>## título</code>, <code>**negrito**</code>, <code>- lista</code>, <code>[link](https://…)</code>.
          </p>
        </section>

        <div className="flex gap-2 sticky bottom-0 py-3 bg-bg">
          <button className="btn-primary" disabled={salvando}>{salvando ? "Salvando…" : "Salvar página inicial"}</button>
        </div>
      </div>
    </form>
  );
}
