import { useCallback, useEffect, useState } from "react";
import {
  LockClosedIcon,
  LockOpenIcon,
  MagnifyingGlassIcon,
  PencilSquareIcon,
  PlusIcon,
  SparklesIcon,
  TrashIcon,
  UsersIcon,
} from "@heroicons/react/24/outline";
import api from "../../services/api";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import { usePermissao } from "../../hooks/usePermissao";
import { useDebounce } from "../../hooks/useDebounce";
import { mensagemErro } from "../../utils/erros";
import { formatarData, formatarDataHora, inputDataParaIso, isoParaInputData } from "../../utils/formatos";
import { gerarSenha } from "../../utils/senha";
import PageHeader from "../../components/PageHeader";
import Modal from "../../components/Modal";
import ConfirmDialog from "../../components/ConfirmDialog";
import EmptyState from "../../components/EmptyState";
import Spinner from "../../components/Spinner";

function FormUsuario({ usuario, roles, proprio, onSalvar, onCancelar }) {
  const novo = !usuario.id;
  const [form, setForm] = useState({
    nome: usuario.nome || "",
    email: usuario.email || "",
    senha: "",
    role: usuario.role || "USUARIO",
    ativo: usuario.ativo ?? true,
    expira: isoParaInputData(usuario.acesso_expira_em),
  });
  const [erro, setErro] = useState("");
  const [salvando, setSalvando] = useState(false);
  const atribuiveis = roles.filter((r) => r.atribuivel || r.nome === usuario.role);

  const enviar = async (e) => {
    e.preventDefault();
    setErro("");
    setSalvando(true);
    const dados = {
      nome: form.nome.trim(),
      email: form.email.trim(),
      role: form.role,
      ativo: form.ativo,
      acesso_expira_em: inputDataParaIso(form.expira),
    };
    if (form.senha) dados.senha = form.senha;
    if (proprio) {
      delete dados.role;
      delete dados.ativo;
      delete dados.acesso_expira_em;
    }
    try {
      await onSalvar(dados, form.senha);
    } catch (err) {
      setErro(mensagemErro(err));
      setSalvando(false);
    }
  };

  return (
    <form onSubmit={enviar} className="grid gap-4">
      <div>
        <label className="label" htmlFor="u-nome">Nome *</label>
        <input id="u-nome" className="input" required minLength={2} value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} />
      </div>
      <div>
        <label className="label" htmlFor="u-email">E-mail (login) *</label>
        <input id="u-email" type="email" className="input" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
      </div>
      <div>
        <label className="label" htmlFor="u-senha">{novo ? "Senha provisória *" : "Nova senha (deixe em branco para manter)"}</label>
        <div className="flex gap-2">
          <input
            id="u-senha"
            type="text"
            autoComplete="off"
            className="input font-mono"
            required={novo}
            minLength={8}
            value={form.senha}
            onChange={(e) => setForm({ ...form, senha: e.target.value })}
          />
          <button type="button" className="btn-secondary !px-3 shrink-0" title="Gerar senha" onClick={() => setForm({ ...form, senha: gerarSenha() })}>
            <SparklesIcon className="w-4 h-4" /> Gerar
          </button>
        </div>
        <p className="text-xs text-mute mt-1">Mínimo de 8 caracteres. Envie ao mentorado por um canal seguro.</p>
      </div>
      {!proprio && (
        <>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="label" htmlFor="u-role">Papel</label>
              <select id="u-role" className="input" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} disabled={atribuiveis.length <= 1}>
                {atribuiveis.map((r) => (
                  <option key={r.nome} value={r.nome}>{r.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label" htmlFor="u-expira">Acesso até (opcional)</label>
              <input id="u-expira" type="date" className="input" value={form.expira} onChange={(e) => setForm({ ...form, expira: e.target.value })} />
            </div>
          </div>
          <label className="inline-flex items-center gap-2 text-sm">
            <input type="checkbox" checked={form.ativo} onChange={(e) => setForm({ ...form, ativo: e.target.checked })} className="w-4 h-4 accent-[var(--brand)]" />
            Acesso liberado
          </label>
        </>
      )}
      {erro && <p role="alert" className="rounded-lg bg-danger-soft text-danger text-sm px-3 py-2">{erro}</p>}
      <div className="flex justify-end gap-2">
        <button type="button" className="btn-secondary" onClick={onCancelar}>Cancelar</button>
        <button className="btn-primary" disabled={salvando}>{salvando ? "Salvando…" : novo ? "Criar acesso" : "Salvar"}</button>
      </div>
    </form>
  );
}

function SituacaoChip({ u }) {
  if (!u.ativo) return <span className="chip bg-danger-soft text-danger">Bloqueado</span>;
  if (u.acesso_expirado) return <span className="chip bg-accent-soft text-accent">Expirado</span>;
  return <span className="chip bg-ok-soft text-ok">Ativo</span>;
}

export default function UsuariosAdminPage() {
  const { user } = useAuth();
  const { addToast } = useToast();
  const podeCriar = usePermissao("usuarios", "criar");
  const podeEditar = usePermissao("usuarios", "editar");
  const podeExcluir = usePermissao("usuarios", "excluir");

  const [busca, setBusca] = useState("");
  const q = useDebounce(busca, 300);
  const [filtroRole, setFiltroRole] = useState("");
  const [roles, setRoles] = useState([]);
  const [usuarios, setUsuarios] = useState(null);
  const [total, setTotal] = useState(0);
  const [editando, setEditando] = useState(null);
  const [excluindo, setExcluindo] = useState(null);
  const [senhaCriada, setSenhaCriada] = useState(null);

  const carregar = useCallback(() => {
    api
      .get("/usuarios", { params: { q: q || undefined, role: filtroRole || undefined, limit: 200 } })
      .then((r) => {
        setUsuarios(r.data.items);
        setTotal(r.data.total);
      })
      .catch((e) => {
        addToast(mensagemErro(e), "error");
        setUsuarios([]);
      });
  }, [q, filtroRole, addToast]);

  useEffect(carregar, [carregar]);
  useEffect(() => {
    api.get("/roles").then((r) => setRoles(r.data.data)).catch(() => {});
  }, []);

  const salvar = async (dados, senha) => {
    if (editando.id) {
      await api.put(`/usuarios/${editando.id}`, dados);
      addToast("Usuário atualizado.");
      if (senha) setSenhaCriada({ email: dados.email, senha });
    } else {
      await api.post("/usuarios", dados);
      setSenhaCriada({ email: dados.email, senha });
    }
    setEditando(null);
    carregar();
  };

  const alternarBloqueio = async (u) => {
    try {
      await api.put(`/usuarios/${u.id}`, { ativo: !u.ativo });
      addToast(u.ativo ? "Acesso bloqueado." : "Acesso liberado.");
      carregar();
    } catch (e) {
      addToast(mensagemErro(e), "error");
    }
  };

  const excluir = async () => {
    try {
      await api.delete(`/usuarios/${excluindo.id}`);
      addToast("Usuário removido.");
      setExcluindo(null);
      carregar();
    } catch (e) {
      addToast(mensagemErro(e), "error");
      setExcluindo(null);
    }
  };

  const verTodosPapeis = roles.filter((r) => r.atribuivel).length > 1;

  return (
    <div>
      <PageHeader
        titulo="Usuários"
        descricao={verTodosPapeis ? "Mentorados, gerentes e administradores." : "Mentorados com acesso à plataforma."}
      >
        {podeCriar && (
          <button className="btn-primary" onClick={() => setEditando({})}>
            <PlusIcon className="w-4 h-4" /> Novo acesso
          </button>
        )}
      </PageHeader>

      <div className="card p-3 sm:p-4 flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <MagnifyingGlassIcon className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-mute" />
          <input type="search" className="input !pl-10" placeholder="Buscar por nome ou e-mail" value={busca} onChange={(e) => setBusca(e.target.value)} aria-label="Buscar usuários" />
        </div>
        {verTodosPapeis && (
          <select className="input sm:!w-56" value={filtroRole} onChange={(e) => setFiltroRole(e.target.value)} aria-label="Papel">
            <option value="">Todos os papéis</option>
            {roles.map((r) => (
              <option key={r.nome} value={r.nome}>{r.label}</option>
            ))}
          </select>
        )}
      </div>

      <div className="mt-4">
        {usuarios === null ? (
          <Spinner />
        ) : usuarios.length === 0 ? (
          <EmptyState icone={UsersIcon} titulo="Nenhum usuário encontrado" />
        ) : (
          <div className="card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-panel-2 text-left text-xs uppercase tracking-wider text-mute">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Usuário</th>
                    <th className="px-4 py-3 font-semibold hidden md:table-cell">Papel</th>
                    <th className="px-4 py-3 font-semibold hidden lg:table-cell">Acesso até</th>
                    <th className="px-4 py-3 font-semibold hidden lg:table-cell">Último acesso</th>
                    <th className="px-4 py-3 font-semibold">Situação</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {usuarios.map((u) => {
                    const proprio = u.id === user?.id;
                    return (
                      <tr key={u.id}>
                        <td className="px-4 py-3">
                          <div className="font-semibold text-text">
                            {u.nome} {proprio && <span className="text-xs text-mute font-normal">(você)</span>}
                          </div>
                          <div className="text-xs text-mute">{u.email}</div>
                        </td>
                        <td className="px-4 py-3 hidden md:table-cell text-dim">{u.role_label}</td>
                        <td className="px-4 py-3 hidden lg:table-cell text-dim">{u.acesso_expira_em ? formatarData(u.acesso_expira_em) : "Sem prazo"}</td>
                        <td className="px-4 py-3 hidden lg:table-cell text-dim">{u.last_login ? formatarDataHora(u.last_login) : "Nunca"}</td>
                        <td className="px-4 py-3"><SituacaoChip u={u} /></td>
                        <td className="px-4 py-3">
                          <div className="flex justify-end gap-1">
                            {podeEditar && !proprio && (
                              <button className="btn-ghost !p-2" title={u.ativo ? "Bloquear acesso" : "Liberar acesso"} onClick={() => alternarBloqueio(u)}>
                                {u.ativo ? <LockClosedIcon className="w-4 h-4" /> : <LockOpenIcon className="w-4 h-4" />}
                              </button>
                            )}
                            {podeEditar && (
                              <button className="btn-ghost !p-2" title="Editar" onClick={() => setEditando(u)}>
                                <PencilSquareIcon className="w-4 h-4" />
                              </button>
                            )}
                            {podeExcluir && !proprio && (
                              <button className="btn-ghost !p-2 hover:!text-danger" title="Remover" onClick={() => setExcluindo(u)}>
                                <TrashIcon className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <p className="px-4 py-3 text-xs text-mute border-t border-border">{total} usuário(s)</p>
          </div>
        )}
      </div>

      <Modal aberto={Boolean(editando)} titulo={editando?.id ? "Editar usuário" : "Novo acesso"} onFechar={() => setEditando(null)}>
        {editando && (
          <FormUsuario usuario={editando} roles={roles} proprio={editando.id === user?.id} onSalvar={salvar} onCancelar={() => setEditando(null)} />
        )}
      </Modal>

      <Modal aberto={Boolean(senhaCriada)} titulo="Dados de acesso" onFechar={() => setSenhaCriada(null)} largura="max-w-md">
        <p className="text-sm text-dim">Envie estes dados ao usuário. A senha não poderá ser vista novamente.</p>
        <div className="mt-4 rounded-lg bg-panel-2 p-4 font-mono text-sm grid gap-1">
          <div>E-mail: {senhaCriada?.email}</div>
          <div>Senha: {senhaCriada?.senha}</div>
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <button
            className="btn-secondary"
            onClick={() =>
              navigator.clipboard
                ?.writeText(`Acesso à plataforma da Academia de Locação\nE-mail: ${senhaCriada.email}\nSenha: ${senhaCriada.senha}\n${window.location.origin}/login`)
                .then(() => addToast("Copiado."))
                .catch(() => addToast("Não foi possível copiar.", "error"))
            }
          >
            Copiar
          </button>
          <button className="btn-primary" onClick={() => setSenhaCriada(null)}>Concluir</button>
        </div>
      </Modal>

      <ConfirmDialog
        aberto={Boolean(excluindo)}
        titulo="Remover usuário"
        mensagem={`Remover definitivamente o acesso de “${excluindo?.nome}”? Para suspender temporariamente, use o bloqueio.`}
        textoConfirmar="Remover"
        perigo
        onConfirmar={excluir}
        onFechar={() => setExcluindo(null)}
      />
    </div>
  );
}
