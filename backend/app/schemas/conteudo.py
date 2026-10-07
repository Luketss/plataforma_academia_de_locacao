from datetime import datetime

from pydantic import BaseModel, Field


class ConteudoOut(BaseModel):
    mentor_nome: str | None = None
    mentor_titulo: str | None = None
    mentor_curriculo: str | None = None
    academia_apresentacao: str | None = None
    metodologia: str | None = None
    objetivo_plataforma: str | None = None
    tem_foto: bool = False
    atualizado_em: datetime | None = None


class ConteudoUpdate(BaseModel):
    mentor_nome: str | None = Field(default=None, max_length=150)
    mentor_titulo: str | None = Field(default=None, max_length=200)
    mentor_curriculo: str | None = Field(default=None, max_length=20_000)
    academia_apresentacao: str | None = Field(default=None, max_length=20_000)
    metodologia: str | None = Field(default=None, max_length=20_000)
    objetivo_plataforma: str | None = Field(default=None, max_length=20_000)
