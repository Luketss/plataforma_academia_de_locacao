from app.core.datas import agora, garantir_utc
from app.core.exceptions import ForbiddenException, UnauthorizedException
from app.core.permissions import ADMIN_GLOBAL, tem_acesso_admin, tem_permissao
from app.core.security import decode_token
from app.db.session import SessionLocal
from app.models.usuario import Usuario
from fastapi import Depends
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login")


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def acesso_expirado(user: Usuario) -> bool:
    expira = garantir_utc(user.acesso_expira_em)
    return expira is not None and expira <= agora()


def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db),
) -> Usuario:
    payload = decode_token(token)
    if payload is None:
        raise UnauthorizedException("Token inválido ou expirado")

    # Refresh token nunca vale como access token (vida bem mais longa).
    if payload.get("type") != "access":
        raise UnauthorizedException("Tipo de token inválido")

    try:
        uid = int(payload.get("sub"))
    except (TypeError, ValueError):
        raise UnauthorizedException("Token inválido")

    user = db.get(Usuario, uid)
    # Bloqueio/expiração valem na hora, mesmo com token ainda válido.
    if not user or not user.ativo or acesso_expirado(user):
        raise UnauthorizedException("Usuário inexistente, bloqueado ou com acesso expirado")
    return user


def require_role(*roles: str):
    def checker(current_user: Usuario = Depends(get_current_user)) -> Usuario:
        if current_user.role.nome not in roles:
            raise ForbiddenException("Permissão insuficiente")
        return current_user

    return checker


require_admin_global = require_role(ADMIN_GLOBAL)


def require_permissao(area: str, verbo: str):
    """Exige (area, verbo) na role do usuário. ADMIN_GLOBAL tem bypass."""

    def checker(current_user: Usuario = Depends(get_current_user)) -> Usuario:
        if not tem_permissao(current_user.role, area, verbo):
            raise ForbiddenException(f"Sem permissão para {verbo} em {area}")
        return current_user

    return checker


def require_acesso_admin(current_user: Usuario = Depends(get_current_user)) -> Usuario:
    if not tem_acesso_admin(current_user.role):
        raise ForbiddenException("Acesso restrito à administração")
    return current_user
