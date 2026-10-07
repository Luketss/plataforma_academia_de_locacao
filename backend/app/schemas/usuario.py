from datetime import datetime

from pydantic import BaseModel, EmailStr, Field


class UsuarioCreate(BaseModel):
    nome: str = Field(min_length=2, max_length=150)
    email: EmailStr
    senha: str = Field(min_length=8, max_length=128)
    role: str = "USUARIO"
    ativo: bool = True
    acesso_expira_em: datetime | None = None


class UsuarioUpdate(BaseModel):
    nome: str | None = Field(default=None, min_length=2, max_length=150)
    email: EmailStr | None = None
    senha: str | None = Field(default=None, min_length=8, max_length=128)
    role: str | None = None
    ativo: bool | None = None
    acesso_expira_em: datetime | None = None


class UsuarioOut(BaseModel):
    id: int
    nome: str
    email: str
    role: str
    role_label: str
    ativo: bool
    acesso_expira_em: datetime | None
    acesso_expirado: bool
    last_login: datetime | None
    criado_em: datetime


class RoleOut(BaseModel):
    id: int
    nome: str
    label: str
    descricao: str | None
    permissoes: dict
    atribuivel: bool
