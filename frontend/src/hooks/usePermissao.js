import { useAuth } from "../context/AuthContext";

// Funções puras (testáveis); o hook só injeta o usuário do contexto.
// Espelham app/core/permissions.py — o backend é quem garante de fato.
export const ROLES = { ADMIN_GLOBAL: "ADMIN_GLOBAL", GERENTE: "GERENTE", USUARIO: "USUARIO" };

export function hasPermissao(user, area, verbo) {
  if (!user) return false;
  if (user.role === ROLES.ADMIN_GLOBAL) return true;
  return (user.permissoes?.[area] || []).includes(verbo);
}

export function temAlgumaPermissao(user, area) {
  return ["criar", "editar", "excluir"].some((v) => hasPermissao(user, area, v));
}

export function temAcessoAdmin(user) {
  return Boolean(user?.acesso_admin);
}

export function usePermissao(area, verbo) {
  const { user } = useAuth();
  return hasPermissao(user, area, verbo);
}
