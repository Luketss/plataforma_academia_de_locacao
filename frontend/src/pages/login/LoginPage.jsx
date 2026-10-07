import { useState } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { LockClosedIcon } from "@heroicons/react/24/outline";
import { useAuth } from "../../context/AuthContext";
import { mensagemErro } from "../../utils/erros";
import Logo from "../../components/Logo";
import ThemeToggle from "../../components/ThemeToggle";

export default function LoginPage() {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState("");
  const [enviando, setEnviando] = useState(false);

  const destino = location.state?.de || "/app";
  if (user) return <Navigate to={destino} replace />;

  const enviar = async (e) => {
    e.preventDefault();
    setErro("");
    setEnviando(true);
    try {
      await login(email.trim(), senha);
      navigate(destino, { replace: true });
    } catch (err) {
      setErro(err.response?.status === 429 ? "Muitas tentativas. Aguarde um minuto." : mensagemErro(err));
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      <section
        className="hidden lg:flex flex-col justify-between p-12 text-white"
        style={{ background: "var(--hero-grad)" }}
      >
        <div className="text-sm font-semibold uppercase tracking-widest opacity-80">Academia de Locação</div>
        <div>
          <h1 className="font-display text-4xl font-extrabold leading-tight text-white">
            Todos os modelos da mentoria,
            <br />
            sempre na versão mais atual.
          </h1>
          <p className="mt-4 max-w-md text-white/80">
            Contratos, vistorias, notificações e roteiros organizados por assunto e prontos para usar.
          </p>
        </div>
        <div className="text-xs text-white/60">Acesso exclusivo para mentorados.</div>
      </section>

      <section className="flex flex-col">
        <div className="flex justify-end p-4">
          <ThemeToggle />
        </div>
        <div className="flex-1 flex items-center justify-center px-4 pb-16">
          <form onSubmit={enviar} className="w-full max-w-sm">
            <Logo />
            <h2 className="mt-8 text-2xl font-extrabold">Entrar</h2>
            <p className="mt-1 text-sm text-dim">Use o e-mail e a senha enviados pela equipe da mentoria.</p>

            <label className="label mt-6" htmlFor="email">
              E-mail
            </label>
            <input
              id="email"
              type="email"
              autoComplete="username"
              required
              className="input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />

            <label className="label mt-4" htmlFor="senha">
              Senha
            </label>
            <input
              id="senha"
              type="password"
              autoComplete="current-password"
              required
              className="input"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
            />

            {erro && (
              <p role="alert" className="mt-4 rounded-lg bg-danger-soft text-danger text-sm px-3 py-2">
                {erro}
              </p>
            )}

            <button type="submit" className="btn-primary w-full mt-6 !py-2.5" disabled={enviando}>
              <LockClosedIcon className="w-4 h-4" />
              {enviando ? "Entrando…" : "Entrar"}
            </button>
            <p className="mt-6 text-xs text-mute text-center">
              Esqueceu a senha? Fale com a equipe da mentoria para redefinir.
            </p>
          </form>
        </div>
      </section>
    </div>
  );
}
