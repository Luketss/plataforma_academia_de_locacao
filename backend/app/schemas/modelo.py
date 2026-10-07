from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field, field_validator

StatusNovidade = Literal["novo", "atualizado"]


def _valida_link(v: str | None) -> str | None:
    if v is None:
        return None
    v = v.strip()
    if not v:
        return None
    if not (v.startswith("https://") or v.startswith("http://")):
        raise ValueError("O link deve começar com http:// ou https://")
    return v


class ModeloCreate(BaseModel):
    titulo: str = Field(min_length=2, max_length=200)
    descricao: str | None = Field(default=None, max_length=5000)
    conteudo: str | None = Field(default=None, max_length=200_000)
    palavras_chave: list[str] = Field(default_factory=list)
    link_externo: str | None = Field(default=None, max_length=500)
    categoria_id: int
    ativo: bool = True
    destaque: bool = False

    _link = field_validator("link_externo")(_valida_link)


class ModeloUpdate(BaseModel):
    titulo: str | None = Field(default=None, min_length=2, max_length=200)
    descricao: str | None = Field(default=None, max_length=5000)
    conteudo: str | None = Field(default=None, max_length=200_000)
    palavras_chave: list[str] | None = None
    link_externo: str | None = Field(default=None, max_length=500)
    categoria_id: int | None = None
    ativo: bool | None = None
    destaque: bool | None = None
    nota_atualizacao: str | None = Field(default=None, max_length=2000)
    # None = automático (sobe a versão se conteúdo/arquivo/link mudaram);
    # True força registrar como atualização; False salva sem subir a versão.
    registrar_atualizacao: bool | None = None

    _link = field_validator("link_externo")(_valida_link)


class ArquivoOut(BaseModel):
    id: int
    nome_original: str
    content_type: str
    tamanho: int


class CategoriaResumo(BaseModel):
    id: int
    nome: str
    slug: str


class ModeloResumo(BaseModel):
    """Item da listagem da biblioteca (sem o conteúdo completo)."""

    id: int
    titulo: str
    descricao: str | None
    palavras_chave: list[str]
    categoria: CategoriaResumo
    ativo: bool
    destaque: bool
    versao: int
    tem_conteudo: bool
    tem_arquivo: bool
    tem_link: bool
    arquivo_tipo: str | None = None
    criado_em: datetime
    conteudo_atualizado_em: datetime
    status: StatusNovidade | None = None


class ModeloDetalhe(ModeloResumo):
    conteudo: str | None
    link_externo: str | None
    nota_atualizacao: str | None
    arquivo: ArquivoOut | None
    atualizado_em: datetime
