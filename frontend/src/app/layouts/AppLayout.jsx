import { useEffect, useRef, useState } from "react";
import { Link, NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import {
  ArrowRightOnRectangleIcon,
  Cog6ToothIcon,
  KeyIcon,
  HomeIcon,
  BookOpenIcon,
} from "@heroicons/react/24/outline";
import { useAuth } from "../../context/AuthContext";
import { temAcessoAdmin } from "../../hooks/usePermissao";
import Logo from "../../components/Logo";
import ThemeToggle from "../../components/ThemeToggle";

const NAV = [
  { to: "/app", label: "Início", icon: HomeIcon, end: true },
  { to: "/app/biblioteca", label: "Biblioteca", icon: BookOpenIcon },
];

function MenuUsuario() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [aberto, setAberto] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!aberto) return;
    const fora = (e) => ref.current && !ref.current.contains(e.target) && setAberto(false);
    document.addEventListener("mousedown", fora);
    return () => document.removeEventListener("mousedown", fora);
  }, [aberto]);

  const inicial = (user?.nome || "?").charAt(0).toUpperCase();
  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setAberto((v) => !v)}
        className="w-9 h-9 rounded-full bg-brand text-brand-ink font-bold text-sm"
        aria-haspopup="menu"
        aria-expanded={aberto}
        aria-label="Menu do usuário"
      >
        {inicial}
      </button>
      {aberto && (
        <div role="menu" className="card absolute right-0 mt-2 w-60 p-2 z-40">
          <div className="px-3 py-2 border-b border-border mb-1">
            <div className="font-semibold text-sm truncate">{user?.nome}</div>
            <div className="text-xs text-mute truncate">{user?.email}</div>
            <div className="text-xs text-dim mt-0.5">{user?.role_label}</div>
          </div>
          <button
            role="menuitem"
            className="btn-ghost w-full !justify-start"
            onClick={() => {
              setAberto(false);
              navigate("/app/conta");
            }}
          >
            <KeyIcon className="w-4 h-4" /> Minha conta
          </button>
          <button
            role="menuitem"
            className="btn-ghost w-full !justify-start"
            onClick={() => {
              logout();
              navigate("/login");
            }}
          >
            <ArrowRightOnRectangleIcon className="w-4 h-4" /> Sair
          </button>
        </div>
      )}
    </div>
  );
}

export default function AppLayout() {
  const { user } = useAuth();
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  const linkClasse = ({ isActive }) =>
    `inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-semibold transition ${
      isActive ? "bg-brand-soft text-brand" : "text-dim hover:text-text hover:bg-panel-2"
    }`;

  return (
    <div className="min-h-screen flex flex-col">
      <header className="sticky top-0 z-30 bg-panel border-b border-border">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center gap-4">
          <Link to="/app" aria-label="Início">
            <Logo />
          </Link>
          <nav className="hidden md:flex items-center gap-1 ml-6">
            {NAV.map(({ to, label, icon: Icon, end }) => (
              <NavLink key={to} to={to} end={end} className={linkClasse}>
                <Icon className="w-4 h-4" /> {label}
              </NavLink>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-1.5">
            {temAcessoAdmin(user) && (
              <Link to="/admin" className="btn-secondary !px-3 !py-1.5" title="Administração">
                <Cog6ToothIcon className="w-4 h-4" />
                <span className="hidden sm:inline">Administração</span>
              </Link>
            )}
            <ThemeToggle />
            <MenuUsuario />
          </div>
        </div>
        <nav className="md:hidden flex gap-1 px-4 pb-2">
          {NAV.map(({ to, label, icon: Icon, end }) => (
            <NavLink key={to} to={to} end={end} className={(s) => `${linkClasse(s)} flex-1 justify-center`}>
              <Icon className="w-4 h-4" /> {label}
            </NavLink>
          ))}
        </nav>
      </header>

      <main className="flex-1 w-full max-w-6xl mx-auto px-4 py-6 sm:py-8">
        <Outlet />
      </main>

      <footer className="border-t border-border py-6 text-center text-xs text-mute">
        Conteúdo exclusivo para mentorados da Academia de Locação. Não compartilhe seu acesso.
      </footer>
    </div>
  );
}
