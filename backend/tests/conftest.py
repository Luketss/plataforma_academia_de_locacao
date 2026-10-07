"""Bootstrap dos testes: SQLite em memória no lugar do Postgres.

As variáveis de ambiente precisam existir antes de qualquer import da app
(Settings valida no import)."""

import os

os.environ.setdefault("SECRET_KEY", "test-secret-key-com-tamanho-suficiente-para-hs256")
os.environ.setdefault("ENVIRONMENT", "test")

import pytest  # noqa: E402
from app.api.deps import get_db  # noqa: E402
from app.core.permissions import PERMISSOES_PADRAO, ROLES  # noqa: E402
from app.core.rate_limit import limiter  # noqa: E402
from app.core.security import hash_password  # noqa: E402
from app.db.base import Base  # noqa: E402
from app.main import app  # noqa: E402
from app.models.role import Role  # noqa: E402
from app.models.usuario import Usuario  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402
from sqlalchemy import create_engine, event  # noqa: E402
from sqlalchemy.orm import sessionmaker  # noqa: E402
from sqlalchemy.pool import StaticPool  # noqa: E402

SENHA = "senha-segura-123"


@pytest.fixture()
def db():
    engine = create_engine(
        "sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool
    )

    @event.listens_for(engine, "connect")
    def _fk_on(dbapi_conn, _):
        dbapi_conn.execute("PRAGMA foreign_keys=ON")

    Base.metadata.create_all(engine)
    Session = sessionmaker(bind=engine, autoflush=False, autocommit=False)
    session = Session()
    for nome in ROLES:
        session.add(Role(nome=nome, permissoes=PERMISSOES_PADRAO[nome]))
    session.commit()
    try:
        yield session
    finally:
        session.close()
        engine.dispose()


@pytest.fixture()
def client(db):
    def _get_db():
        yield db

    app.dependency_overrides[get_db] = _get_db
    limiter.enabled = False
    try:
        yield TestClient(app)
    finally:
        app.dependency_overrides.clear()
        limiter.enabled = True


@pytest.fixture()
def criar_usuario(db):
    def _criar(email: str, role: str = "USUARIO", **kwargs) -> Usuario:
        role_obj = db.query(Role).filter(Role.nome == role).one()
        user = Usuario(
            nome=kwargs.pop("nome", email.split("@")[0]),
            email=email,
            senha_hash=hash_password(SENHA),
            role_id=role_obj.id,
            **kwargs,
        )
        db.add(user)
        db.commit()
        db.refresh(user)
        return user

    return _criar


@pytest.fixture()
def login(client):
    def _login(email: str, senha: str = SENHA) -> dict:
        resp = client.post("/api/v1/auth/login", data={"username": email, "password": senha})
        assert resp.status_code == 200, resp.text
        return {"Authorization": f"Bearer {resp.json()['access_token']}"}

    return _login


@pytest.fixture()
def admin(criar_usuario, login):
    criar_usuario("admin@x.com", "ADMIN_GLOBAL")
    return login("admin@x.com")


@pytest.fixture()
def gerente(criar_usuario, login):
    criar_usuario("gerente@x.com", "GERENTE")
    return login("gerente@x.com")


@pytest.fixture()
def mentorado(criar_usuario, login):
    criar_usuario("mentorado@x.com", "USUARIO")
    return login("mentorado@x.com")
