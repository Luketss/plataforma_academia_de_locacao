// Tokens no localStorage (mesmo padrão do observatório).
const ACCESS = "access_token";
const REFRESH = "refresh_token";

export const tokens = {
  access: () => localStorage.getItem(ACCESS),
  refresh: () => localStorage.getItem(REFRESH),
  salvar({ access_token, refresh_token }) {
    if (access_token) localStorage.setItem(ACCESS, access_token);
    if (refresh_token) localStorage.setItem(REFRESH, refresh_token);
  },
  limpar() {
    localStorage.removeItem(ACCESS);
    localStorage.removeItem(REFRESH);
  },
};
