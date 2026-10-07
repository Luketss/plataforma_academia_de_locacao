"""Registra todos os models no metadata (alembic e testes importam daqui)."""

from app.models.arquivo import Arquivo
from app.models.categoria import Categoria
from app.models.conteudo import ConteudoSite
from app.models.modelo import Modelo
from app.models.role import Role
from app.models.usuario import Usuario
from app.models.visualizacao import ModeloVisualizacao

__all__ = [
    "Arquivo",
    "Categoria",
    "ConteudoSite",
    "Modelo",
    "ModeloVisualizacao",
    "Role",
    "Usuario",
]
