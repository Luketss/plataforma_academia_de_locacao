import { useState } from "react";
import api from "../../services/api";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import { mensagemErro } from "../../utils/erros";

export default function ContaPage() {
  const { user } = useAuth();
  const { addToast } = useToast();
  const [form, setForm] = useState({ atual: "", nova: "", confirmacao: "" });
  const [erro, setErro] = useState("");
  const [enviando, setEnviando] = useState(false);

  const enviar = async (e) => {
    e.preventDefault();
    setErro("");
    if (form.nova.length < 8) return setErro("A nova senha precisa de pelo menos 8 caracteres.");
    if (form.nova !== form.confirmacao) return setErro("A confirmação não confere com a nova senha.");
    setEnviando(true);
    try {
      await api.post("/auth/alterar-senha", { senha_atual: form.atual, nova_senha: form.nova });
      setForm({ atual: "", nova: "", confirmacao: "" });
      addToast("Senha alterada com sucesso.");
    } catch (err) {
      setErro(mensagemErro(err));
    } finally {
      setEnviando(false);
    }
  };

  const campo = (chave, label, autoComplete) => (
    <div>
      <label className="label" htmlFor={chave}>
        {label}
      </label>
      <input
        id={chave}
        type="password"
        className="input"
        autoComplete={autoComplete}
        required
        value={form[chave]}
        onChange={(e) => setForm((f) => ({ ...f, [chave]: e.target.value }))}
      />
    </div>
  );

  return (
    <div className="max-w-xl grid gap-6">
      <h1 className="text-2xl font-extrabold">Minha conta</h1>
      <section className="card p-6 grid gap-1 text-sm">
        <div className="font-semibold text-base">{user?.nome}</div>
        <div className="text-dim">{user?.email}</div>
        <div className="text-mute">{user?.role_label}</div>
      </section>
      <form onSubmit={enviar} className="card p-6 grid gap-4">
        <h2 className="text-lg font-bold">Alterar senha</h2>
        {campo("atual", "Senha atual", "current-password")}
        {campo("nova", "Nova senha (mín. 8 caracteres)", "new-password")}
        {campo("confirmacao", "Confirme a nova senha", "new-password")}
        {erro && (
          <p role="alert" className="rounded-lg bg-danger-soft text-danger text-sm px-3 py-2">
            {erro}
          </p>
        )}
        <div>
          <button className="btn-primary" disabled={enviando}>
            {enviando ? "Salvando…" : "Alterar senha"}
          </button>
        </div>
      </form>
    </div>
  );
}
