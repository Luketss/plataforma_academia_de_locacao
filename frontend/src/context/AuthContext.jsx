import { createContext, useCallback, useContext, useEffect, useState } from "react";
import api, { EVENTO_SESSAO_EXPIRADA } from "../services/api";
import { tokens } from "../services/tokens";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(Boolean(tokens.access()));

  const carregarUsuario = useCallback(async () => {
    const res = await api.get("/auth/me");
    setUser(res.data.data);
    return res.data.data;
  }, []);

  useEffect(() => {
    if (!tokens.access()) return;
    api
      .get("/auth/me")
      .then((res) => setUser(res.data.data))
      .catch((err) => {
        // Só descarta a sessão quando o backend a recusou de fato — falha de
        // rede/cold start não deve deslogar.
        if ([401, 403].includes(err.response?.status)) tokens.limpar();
        setUser(null);
      })
      .finally(() => setLoading(false));
  }, []);

  // O interceptor do axios avisa quando o refresh falhou (sessão expirada,
  // usuário bloqueado ou com acesso vencido).
  useEffect(() => {
    const sair = () => setUser(null);
    window.addEventListener(EVENTO_SESSAO_EXPIRADA, sair);
    return () => window.removeEventListener(EVENTO_SESSAO_EXPIRADA, sair);
  }, []);

  const login = async (email, senha) => {
    const res = await api.post("/auth/login", new URLSearchParams({ username: email, password: senha }), {
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
    });
    tokens.salvar(res.data);
    return carregarUsuario();
  };

  const logout = () => {
    tokens.limpar();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, recarregar: carregarUsuario }}>
      {children}
    </AuthContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  return useContext(AuthContext);
}
