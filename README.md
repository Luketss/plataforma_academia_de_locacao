# Academia de Locação — Plataforma de Modelos

Biblioteca digital **privada** para os mentorados da Academia de Locação: cada
usuário entra com e-mail e senha e encontra, por assunto, categoria ou
palavra-chave, os modelos e materiais mantidos pelo mentor — sempre na versão
mais atual. O conteúdo inteiro (modelos, categorias, textos da página inicial,
foto do mentor e acessos) é gerenciado pela área administrativa, **sem depender
de desenvolvedor**.

Arquitetura baseada no projeto `observatorio-economico`: front em **React (JSX)
+ Vite + Tailwind**, backend em **Python + FastAPI + SQLAlchemy + Alembic**,
PostgreSQL e autenticação JWT com RBAC.

## Funcionalidades (MVP)

**Login → Página inicial → Biblioteca → Busca/filtros → Visualização do modelo → Administração**

| Área | O que faz |
|------|-----------|
| Login | E-mail + senha, JWT (access + refresh), limite de tentativas, bloqueio e data de expiração do acesso |
| Página inicial | Foto e currículo do mentor, apresentação da Academia, metodologia, objetivo da plataforma e "Novidades para você" — tudo editável no admin |
| Biblioteca | Índice por assunto, filtro por categoria, busca por palavra-chave (sem acento, todas as palavras), filtros **Novos** / **Atualizados** |
| Modelo | Texto formatado, arquivo anexado (baixar ou visualizar PDF/imagem), link externo, palavras-chave, versão e "o que mudou" |
| Admin · Modelos | Criar, editar, atualizar (com controle de versão), desativar, excluir; anexar/substituir arquivo |
| Admin · Categorias | Criar, editar, ordenar, desativar, excluir |
| Admin · Usuários | Criar, editar, bloquear/liberar, prazo de acesso, redefinir senha, remover |
| Admin · Página inicial | Editar textos e foto do mentor |

### Selos "Novo" e "Atualizado"

Calculados **por usuário** (`backend/app/services/novidades.py`):

- **Novo** — o mentorado nunca abriu o modelo e ele foi criado nos últimos `NOVIDADE_DIAS` (30) dias.
- **Atualizado** — a versão subiu desde a última vez que o mentorado o abriu
  (ou, se nunca abriu, o conteúdo foi revisado nos últimos 30 dias).

A versão sobe automaticamente quando o texto, o link ou o arquivo mudam. Na
edição, o admin pode forçar uma nova versão ou salvar uma correção pequena sem
avisar os mentorados, e escrever "o que mudou" (exibido no modelo).

## Papéis (RBAC)

| Papel | Biblioteca | Modelos e categorias | Usuários | Página inicial |
|-------|-----------|----------------------|----------|----------------|
| `ADMIN_GLOBAL` — Administrador global | ✅ | ✅ inclusive inativos | ✅ todos os papéis | ✅ |
| `GERENTE` — Gerente | ✅ | ✅ inclusive inativos | ✅ só mentorados (`USUARIO`) | — |
| `USUARIO` — Mentorado | ✅ só ativos | — | — | — |

Regras em `backend/app/core/permissions.py` (funções puras, testadas). O
`ADMIN_GLOBAL` tem bypass; os demais papéis seguem o mapa `{área: [verbos]}` da
tabela `roles`. Guardas anti-escalação: o gerente não vê, cria nem altera
admins/gerentes; ninguém bloqueia, remove ou rebaixa a si mesmo; a plataforma
sempre mantém ao menos um `ADMIN_GLOBAL` ativo. Bloqueio e expiração valem na
hora, mesmo com token ainda válido.

## Estrutura

```
plataforma_academia_de_locacao/
├── backend/                 FastAPI
│   ├── app/
│   │   ├── api/             deps (auth/RBAC), respostas, routers v1
│   │   ├── core/            config, segurança (JWT/bcrypt), permissões, texto/busca
│   │   ├── db/              sessão, seed
│   │   ├── models/          SQLAlchemy (usuarios, roles, categorias, modelos, arquivos, ...)
│   │   ├── schemas/         Pydantic
│   │   └── services/        regras de negócio (modelos, usuários, arquivos, novidades)
│   ├── alembic/             migrações
│   └── tests/               pytest (SQLite em memória)
├── frontend/                React + Vite + Tailwind
│   └── src/
│       ├── app/             router e layouts (app / admin)
│       ├── context/         Auth, Theme, Toast
│       ├── pages/           login, home, biblioteca, perfil, admin
│       ├── components/      UI compartilhada
│       ├── services/        axios (refresh automático), download de arquivos
│       └── utils/           funções puras + testes (vitest)
└── docker-compose.yml
```

## Rodando localmente

### Com Docker

```bash
cp backend/.env.example .env     # ajuste SECRET_KEY e ADMIN_EMAIL/ADMIN_SENHA
docker compose up --build
```

- Front: http://localhost:8080
- API / docs: http://localhost:8000/docs

O container da API roda `alembic upgrade head` e `python -m app.db.seed` (cria o
admin global a partir de `ADMIN_EMAIL`/`ADMIN_SENHA`, se ainda não existir).

### Sem Docker

```bash
# Backend (Python 3.11+ e um Postgres acessível)
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements-dev.txt
cp .env.example .env              # ajuste banco, SECRET_KEY e ADMIN_*
alembic upgrade head
python -m app.db.seed --demo      # --demo cria categorias, modelos e textos de exemplo
uvicorn app.main:app --reload

# Frontend
cd frontend
npm install
cp .env.example .env              # VITE_API_BASE_URL=http://localhost:8000/api/v1
npm run dev                       # http://localhost:5173
```

## Testes e qualidade

```bash
cd backend && python -m pytest        # API + RBAC + regras (SQLite em memória)
cd frontend && npm test && npm run lint && npm run build
```

## Deploy (Railway, como o observatório)

- **Postgres**: plugin do Railway — a API lê `DATABASE_URL` automaticamente.
- **API** (`backend/`): variáveis `SECRET_KEY`, `ENVIRONMENT=production`,
  `CORS_ORIGINS=https://<front>`, `ADMIN_EMAIL`, `ADMIN_SENHA` (primeiro deploy).
- **Front** (`frontend/`): variável de build `VITE_API_BASE_URL=https://<api>/api/v1`.

Arquivos dos modelos ficam no próprio Postgres (tabela `arquivos`, limite
`UPLOAD_MAX_MB`, padrão 25 MB) — não exige volume nem bucket. Tipos aceitos:
PDF, Word, Excel, PowerPoint, ODT/ODS, TXT/CSV, ZIP e imagens. O tipo gravado
vem da extensão (não do navegador) e só PDF/imagem/texto abrem embutidos.

## API (resumo)

| Método | Rota | Quem |
|--------|------|------|
| POST | `/api/v1/auth/login` · `/auth/refresh` | público |
| GET | `/api/v1/auth/me` · POST `/auth/alterar-senha` | autenticado |
| GET | `/api/v1/modelos?q=&categoria_id=&status=novo\|atualizado&ordenar=` | autenticado |
| GET | `/api/v1/modelos/{id}` · `/modelos/{id}/arquivo?inline=` | autenticado |
| POST/PUT/DELETE | `/api/v1/modelos[/{id}]` · `/modelos/{id}/arquivo` | `modelos:*` |
| GET/POST/PUT/DELETE | `/api/v1/categorias[/{id}]` | leitura: autenticado · escrita: `categorias:*` |
| GET/POST/PUT/DELETE | `/api/v1/usuarios[/{id}]` · GET `/roles` | `usuarios:*` |
| GET/PUT | `/api/v1/conteudo` · GET/POST/DELETE `/conteudo/foto` | leitura: autenticado · escrita: `conteudo:editar` |

## Próximos passos sugeridos

- Recuperação de senha por e-mail (o observatório já tem o fluxo com Resend).
- Histórico de versões dos modelos (hoje guarda a versão atual + nota da última mudança).
- Auditoria de acessos/downloads e relatório de uso por mentorado.
- Armazenamento de arquivos em bucket (S3/R2) se a biblioteca crescer muito.
