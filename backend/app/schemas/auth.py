from pydantic import BaseModel, Field


class TokenOut(BaseModel):
    access_token: str
    refresh_token: str | None = None
    token_type: str = "bearer"


class RefreshIn(BaseModel):
    refresh_token: str


class AuthenticatedUser(BaseModel):
    id: int
    nome: str
    email: str
    role: str
    role_label: str
    ativo: bool
    acesso_admin: bool
    permissoes: dict = {}


class AlterarSenhaIn(BaseModel):
    senha_atual: str
    nova_senha: str = Field(min_length=8, max_length=128)
