# AGENTS.md — contexto para agentes de IA

Plataforma de modelos da **Academia de Locação**: biblioteca privada de modelos
para mentorados. Baseada nos padrões do repositório `observatorio-economico`.

## Stack
- Backend: FastAPI, SQLAlchemy 2, Alembic, PostgreSQL, PyJWT, bcrypt, slowapi.
- Frontend: React 19 (JSX, sem TypeScript), Vite, Tailwind 3, React Router 7, axios, Heroicons.

## Convenções
- Código, nomes e mensagens em **português** (como no observatório).
- Erros de domínio: lançar `AppException` e subclasses (`app/core/exceptions.py`);
  respostas `{"success": false, "error": {code, message}}`. O axios do front
  normaliza para `error.response.data.detail` (`utils/erros.js#mensagemErro`).
- Respostas de sucesso: `SuccessResponse[T]` / `PaginatedResponse[T]`.
- RBAC: sempre via `require_permissao(area, verbo)` / helpers de
  `app/core/permissions.py`. Nunca checar papel por string espalhada no código.
  O front espelha em `src/hooks/usePermissao.js`, mas quem garante é o backend.
- Schema só por Alembic (`alembic/versions`); sem `create_all` na app.
  Migrações não importam código da app (constantes congeladas).
- Busca: coluna `modelos.busca_texto` normalizada (`app/core/texto.py`). Ao mudar
  algo que entra na busca, chamar `ModeloService._reindexar`.
- Front: cores só pelos tokens de tema (`src/styles/theme.css` → `tailwind.config.js`);
  nada de cores hardcoded em componentes. Sem `dangerouslySetInnerHTML`
  (markdown passa por `utils/markdownLite.js`).
- Arquivos protegidos são baixados como blob pelo axios (token no header, nunca na URL).

## Verificação antes de commitar
```bash
cd backend && python -m pytest
cd frontend && npm test && npm run lint && npm run build
```
