import { BrowserRouter, Navigate, Route, Routes, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { temAcessoAdmin, temAlgumaPermissao } from "../../hooks/usePermissao";
import Spinner from "../../components/Spinner";
import AppLayout from "../layouts/AppLayout";
import AdminLayout from "../layouts/AdminLayout";
import LoginPage from "../../pages/login/LoginPage";
import HomePage from "../../pages/home/HomePage";
import BibliotecaPage from "../../pages/biblioteca/BibliotecaPage";
import ModeloPage from "../../pages/biblioteca/ModeloPage";
import ContaPage from "../../pages/perfil/ContaPage";
import ModelosAdminPage from "../../pages/admin/ModelosAdminPage";
import ModeloFormPage from "../../pages/admin/ModeloFormPage";
import CategoriasAdminPage from "../../pages/admin/CategoriasAdminPage";
import UsuariosAdminPage from "../../pages/admin/UsuariosAdminPage";
import PaginaInicialAdminPage from "../../pages/admin/PaginaInicialAdminPage";
import { ADMIN_ITENS } from "../layouts/adminNav";

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) return <Spinner />;
  if (!user) return <Navigate to="/login" replace state={{ de: location.pathname + location.search }} />;
  return children;
}

function AdminRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <Spinner />;
  if (!user) return <Navigate to="/login" replace />;
  if (!temAcessoAdmin(user)) return <Navigate to="/app" replace />;
  return children;
}

function AreaRoute({ area, children }) {
  const { user } = useAuth();
  if (!temAlgumaPermissao(user, area)) return <Navigate to="/admin" replace />;
  return children;
}

function AdminIndex() {
  const { user } = useAuth();
  const primeiro = ADMIN_ITENS.find((i) => temAlgumaPermissao(user, i.area));
  return <Navigate to={primeiro ? primeiro.to : "/app"} replace />;
}

export default function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/" element={<Navigate to="/app" replace />} />

        <Route
          path="/app"
          element={
            <ProtectedRoute>
              <AppLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<HomePage />} />
          <Route path="biblioteca" element={<BibliotecaPage />} />
          <Route path="modelos/:id" element={<ModeloPage />} />
          <Route path="conta" element={<ContaPage />} />
        </Route>

        <Route
          path="/admin"
          element={
            <AdminRoute>
              <AdminLayout />
            </AdminRoute>
          }
        >
          <Route index element={<AdminIndex />} />
          <Route path="modelos" element={<AreaRoute area="modelos"><ModelosAdminPage /></AreaRoute>} />
          <Route path="modelos/novo" element={<AreaRoute area="modelos"><ModeloFormPage /></AreaRoute>} />
          <Route path="modelos/:id" element={<AreaRoute area="modelos"><ModeloFormPage /></AreaRoute>} />
          <Route path="categorias" element={<AreaRoute area="categorias"><CategoriasAdminPage /></AreaRoute>} />
          <Route path="usuarios" element={<AreaRoute area="usuarios"><UsuariosAdminPage /></AreaRoute>} />
          <Route path="pagina-inicial" element={<AreaRoute area="conteudo"><PaginaInicialAdminPage /></AreaRoute>} />
        </Route>

        <Route path="*" element={<Navigate to="/app" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
