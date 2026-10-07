import axios from "axios";
import { tokens } from "./tokens";

export const baseURL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000/api/v1";

const api = axios.create({ baseURL });

// Evento global: o AuthContext escuta e zera o usuário quando a sessão cai.
export const EVENTO_SESSAO_EXPIRADA = "auth:sessao-expirada";

api.interceptors.request.use((config) => {
  const token = tokens.access();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Rotas cujo 401 é resposta de negócio (senha errada etc.), não sessão vencida.
const SEM_REFRESH = ["/auth/login", "/auth/refresh", "/auth/alterar-senha"];

let refreshEmAndamento = null;

async function renovarToken() {
  const refresh_token = tokens.refresh();
  if (!refresh_token) throw new Error("sem refresh token");
  // axios "cru": não passa pelos interceptors (evita laço de refresh).
  const { data } = await axios.post(`${baseURL}/auth/refresh`, { refresh_token });
  tokens.salvar(data);
  return data.access_token;
}

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const { config, response } = error;
    const url = config?.url || "";

    if (response?.status === 401 && config && !config._retry && !SEM_REFRESH.some((p) => url.includes(p))) {
      config._retry = true;
      try {
        // Várias requisições com 401 ao mesmo tempo compartilham um único refresh.
        refreshEmAndamento = refreshEmAndamento || renovarToken().finally(() => (refreshEmAndamento = null));
        const novo = await refreshEmAndamento;
        config.headers.Authorization = `Bearer ${novo}`;
        return api(config);
      } catch {
        tokens.limpar();
        window.dispatchEvent(new Event(EVENTO_SESSAO_EXPIRADA));
      }
    }

    // Normaliza: erros de domínio vêm como {error:{message}}, os do FastAPI
    // como {detail}. Quem chama sempre lê `detail`.
    const data = response?.data;
    if (data && typeof data === "object" && data.detail == null && data.error?.message) {
      data.detail = data.error.message;
    }
    return Promise.reject(error);
  }
);

export default api;
