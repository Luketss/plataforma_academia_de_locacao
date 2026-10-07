import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowRightIcon, MagnifyingGlassIcon } from "@heroicons/react/24/outline";
import api from "../../services/api";
import { useAuth } from "../../context/AuthContext";
import MarkdownLite from "../../components/MarkdownLite";
import FotoMentor from "../../components/FotoMentor";
import StatusBadge from "../../components/StatusBadge";
import Spinner from "../../components/Spinner";
import { formatarData } from "../../utils/formatos";

function Secao({ titulo, texto }) {
  if (!texto) return null;
  return (
    <section className="card p-6 sm:p-8">
      <h2 className="text-xl font-extrabold">{titulo}</h2>
      <MarkdownLite texto={texto} className="mt-3" />
    </section>
  );
}

export default function HomePage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [conteudo, setConteudo] = useState(null);
  const [novidades, setNovidades] = useState([]);
  const [busca, setBusca] = useState("");

  useEffect(() => {
    api.get("/conteudo").then((r) => setConteudo(r.data.data)).catch(() => setConteudo({}));
    api
      .get("/modelos", { params: { ordenar: "recentes", limit: 200 } })
      .then((r) => setNovidades(r.data.items.filter((m) => m.status).slice(0, 6)))
      .catch(() => setNovidades([]));
  }, []);

  if (!conteudo) return <Spinner />;

  const primeiroNome = (user?.nome || "").split(" ")[0];
  const urlBusca = `/app/biblioteca${busca.trim() ? `?q=${encodeURIComponent(busca.trim())}` : ""}`;

  return (
    <div className="grid gap-6">
      <section className="rounded-3xl p-6 sm:p-10 text-white overflow-hidden" style={{ background: "var(--hero-grad)" }}>
        <p className="text-sm font-semibold text-white/70">Olá, {primeiroNome} 👋</p>
        <h1 className="mt-1 font-display text-2xl sm:text-4xl font-extrabold text-white max-w-2xl">
          Sua biblioteca de modelos da Academia de Locação
        </h1>
        <form
          className="mt-6 flex flex-col sm:flex-row gap-2 max-w-xl"
          onSubmit={(e) => {
            e.preventDefault();
            navigate(urlBusca);
          }}
        >
          <div className="relative flex-1">
            <MagnifyingGlassIcon className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-mute" />
            <input
              className="input !pl-10 !py-2.5 !bg-white !text-slate-900 !border-transparent"
              placeholder="Buscar modelo por assunto ou palavra-chave"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              aria-label="Buscar modelos"
            />
          </div>
          <button type="submit" className="btn !bg-[#f2b544] !text-[#17202b] !py-2.5 hover:opacity-90">
            {busca.trim() ? "Buscar" : "Abrir biblioteca"} <ArrowRightIcon className="w-4 h-4" />
          </button>
        </form>
      </section>

      {novidades.length > 0 && (
        <section className="card p-6">
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-lg font-extrabold">Novidades para você</h2>
            <Link to="/app/biblioteca?status=novo" className="text-sm font-semibold text-brand">
              Ver todas
            </Link>
          </div>
          <ul className="mt-4 grid sm:grid-cols-2 gap-3">
            {novidades.map((m) => (
              <li key={m.id}>
                <Link
                  to={`/app/modelos/${m.id}`}
                  className="block rounded-xl border border-border p-4 hover:border-brand transition h-full"
                >
                  <div className="flex items-center gap-2">
                    <StatusBadge status={m.status} />
                    <span className="text-xs text-mute">{formatarData(m.conteudo_atualizado_em)}</span>
                  </div>
                  <div className="mt-2 font-semibold">{m.titulo}</div>
                  <div className="text-xs text-dim mt-0.5">{m.categoria.nome}</div>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="card p-6 sm:p-8 grid sm:grid-cols-[auto_1fr] gap-6 sm:gap-8 items-start">
        <FotoMentor temFoto={conteudo.tem_foto} versao={conteudo.atualizado_em} className="w-32 h-32 sm:w-44 sm:h-44" />
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-accent">Seu mentor</p>
          <h2 className="mt-1 text-2xl font-extrabold">{conteudo.mentor_nome || "Mentor"}</h2>
          {conteudo.mentor_titulo && <p className="text-dim font-medium">{conteudo.mentor_titulo}</p>}
          <MarkdownLite texto={conteudo.mentor_curriculo} className="mt-4" />
        </div>
      </section>

      <div className="grid lg:grid-cols-2 gap-6">
        <Secao titulo="A Academia de Locação" texto={conteudo.academia_apresentacao} />
        <Secao titulo="Metodologia" texto={conteudo.metodologia} />
      </div>
      <Secao titulo="Como usar esta plataforma" texto={conteudo.objetivo_plataforma} />
    </div>
  );
}
