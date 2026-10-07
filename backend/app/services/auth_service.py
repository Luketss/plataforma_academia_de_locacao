from app.api.deps import acesso_expirado
from app.core.datas import agora
from app.core.exceptions import UnauthorizedException, ValidationException
from app.core.security import (
    DUMMY_PASSWORD_HASH,
    create_access_token,
    create_refresh_token,
    decode_token,
    hash_password,
    verify_password,
)
from app.models.usuario import Usuario
from sqlalchemy import func
from sqlalchemy.orm import Session

MSG_CREDENCIAIS = "E-mail ou senha inválidos"


class AuthService:
    def __init__(self, db: Session):
        self.db = db

    def _tokens(self, user: Usuario) -> dict:
        return {
            "access_token": create_access_token(str(user.id), {"role": user.role.nome}),
            "refresh_token": create_refresh_token(str(user.id)),
            "token_type": "bearer",
        }

    def autenticar(self, email: str, senha: str) -> dict:
        user = self.db.query(Usuario).filter(func.lower(Usuario.email) == (email or "").lower().strip()).first()

        # Sempre roda o bcrypt: o tempo de resposta não revela se o e-mail existe.
        if not user:
            verify_password(senha, DUMMY_PASSWORD_HASH)
            raise UnauthorizedException(MSG_CREDENCIAIS)
        if not verify_password(senha, user.senha_hash):
            raise UnauthorizedException(MSG_CREDENCIAIS)
        if not user.ativo:
            raise UnauthorizedException("Seu acesso está bloqueado. Fale com o administrador.")
        if acesso_expirado(user):
            raise UnauthorizedException("Seu acesso expirou. Fale com o administrador.")

        user.last_login = agora()
        self.db.commit()
        return self._tokens(user)

    def refresh(self, refresh_token: str) -> dict:
        payload = decode_token(refresh_token)
        if not payload or payload.get("type") != "refresh":
            raise UnauthorizedException("Refresh token inválido")
        try:
            user = self.db.get(Usuario, int(payload.get("sub")))
        except (TypeError, ValueError):
            raise UnauthorizedException("Refresh token inválido")
        if not user or not user.ativo or acesso_expirado(user):
            raise UnauthorizedException("Usuário inexistente, bloqueado ou com acesso expirado")
        return self._tokens(user)

    def alterar_senha(self, user: Usuario, senha_atual: str, nova_senha: str) -> None:
        if not verify_password(senha_atual, user.senha_hash):
            raise ValidationException("Senha atual incorreta.")
        if senha_atual == nova_senha:
            raise ValidationException("A nova senha deve ser diferente da atual.")
        user.senha_hash = hash_password(nova_senha)
        self.db.commit()
