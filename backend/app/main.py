import logging

import app.api.v1.routers.auth as auth
import app.api.v1.routers.categorias as categorias
import app.api.v1.routers.conteudo as conteudo
import app.api.v1.routers.modelos as modelos
import app.api.v1.routers.roles as roles
import app.api.v1.routers.usuarios as usuarios
import app.models  # noqa: F401 — registra todos os models
from app.api.error_handlers import register_exception_handlers
from app.core.config import settings
from app.core.rate_limit import limiter
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")

# Em produção, sem docs interativas nem schema OpenAPI públicos.
_docs_kwargs = (
    {"docs_url": None, "redoc_url": None, "openapi_url": None} if settings.ENVIRONMENT == "production" else {}
)

app = FastAPI(title="Academia de Locação — Plataforma de Modelos", version="1.0.0", **_docs_kwargs)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
register_exception_handlers(app)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[o.strip() for o in settings.CORS_ORIGINS.split(",") if o.strip()],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["Content-Disposition"],
)

# O schema é controlado pelo Alembic (sem create_all aqui).
API_PREFIX = "/api/v1"

for r in (auth, usuarios, roles, categorias, modelos, conteudo):
    app.include_router(r.router, prefix=API_PREFIX)


@app.get("/health")
def health_check():
    return {"status": "ok"}
