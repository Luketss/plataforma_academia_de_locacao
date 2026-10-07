from pydantic import BaseModel, Field


class CategoriaCreate(BaseModel):
    nome: str = Field(min_length=2, max_length=120)
    descricao: str | None = Field(default=None, max_length=2000)
    ordem: int = 0
    ativa: bool = True


class CategoriaUpdate(BaseModel):
    nome: str | None = Field(default=None, min_length=2, max_length=120)
    descricao: str | None = Field(default=None, max_length=2000)
    ordem: int | None = None
    ativa: bool | None = None


class CategoriaOut(BaseModel):
    id: int
    nome: str
    slug: str
    descricao: str | None
    ordem: int
    ativa: bool
    total_modelos: int = 0
