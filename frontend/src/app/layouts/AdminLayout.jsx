import { useEffect, useState } from "react";
import { NavLink, Outlet, useLocation, Link } from "react-router-dom";
import { ArrowLeftIcon, Bars3Icon, XMarkIcon } from "@heroicons/react/24/outline";
import { useAuth } from "../../context/AuthContext";
import { temAlgumaPermissao } from "../../hooks/usePermissao";
import Logo from "../../components/Logo";
import ThemeToggle from "../../components/ThemeToggle";
import { ADMIN_ITENS } from "./adminNav";

export default function AdminLayout() {
  const { user } = useAuth();
  const { pathname } = useLocation();
  // O drawer mobile fica aberto só na rota em que foi aberto (navegar fecha).
  const [abertoEm, setAbertoEm] = useState(null);
  const aberto = abertoEm === pathname;
  const setAberto = (v) => setAbertoEm(v ? pathname : null);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  const itens = ADMIN_ITENS.filter((i) => temAlgumaPermissao(user, i.area));

  const sidebar = (
    <div className="flex flex-col h-full">
      <div className="px-5 py-5 border-b border-border">
        <Logo />
        <div className="mt-3 chip bg-accent-soft text-accent">Administração · {user?.role_label}</div>
      </div>
      <nav className="flex-1 p-3 grid gap-1 content-start">
        {itens.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-semibold transition ${
                isActive ? "bg-brand-soft text-brand" : "text-dim hover:bg-panel-2 hover:text-text"
              }`
            }
          >
            <Icon className="w-5 h-5" /> {label}
          </NavLink>
        ))}
      </nav>
      <div className="p-3 border-t border-border flex items-center gap-2">
        <Link to="/app/biblioteca" className="btn-ghost flex-1 !justify-start">
          <ArrowLeftIcon className="w-4 h-4" /> Voltar à biblioteca
        </Link>
        <ThemeToggle />
      </div>
    </div>
  );

  return (
    <div className="min-h-screen md:flex">
      <aside className="hidden md:block w-64 shrink-0 bg-panel border-r border-border sticky top-0 h-screen">
        {sidebar}
      </aside>

      {aberto && (
        <div className="md:hidden fixed inset-0 z-40">
          <div className="absolute inset-0 bg-black/40" onClick={() => setAberto(false)} />
          <aside className="absolute left-0 top-0 bottom-0 w-72 bg-panel shadow-card">
            <button className="btn-ghost !p-2 absolute right-2 top-2" onClick={() => setAberto(false)} aria-label="Fechar menu">
              <XMarkIcon className="w-5 h-5" />
            </button>
            {sidebar}
          </aside>
        </div>
      )}

      <div className="flex-1 min-w-0">
        <header className="md:hidden sticky top-0 z-30 bg-panel border-b border-border h-14 px-4 flex items-center gap-3">
          <button className="btn-ghost !p-2" onClick={() => setAberto(true)} aria-label="Abrir menu">
            <Bars3Icon className="w-5 h-5" />
          </button>
          <Logo compacto />
          <span className="font-display font-bold">Administração</span>
        </header>
        <main className="max-w-6xl mx-auto px-4 sm:px-8 py-6 sm:py-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
