from datetime import datetime

from app.core.datas import agora
from app.db.base import Base
from sqlalchemy import DateTime, ForeignKey, Integer
from sqlalchemy.orm import Mapped, mapped_column


class ModeloVisualizacao(Base):
    """Última versão de cada modelo que o usuário abriu. Alimenta os selos
    "novo" (nunca aberto) e "atualizado" (versão atual > versão vista)."""

    __tablename__ = "modelo_visualizacoes"

    usuario_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("usuarios.id", ondelete="CASCADE"), primary_key=True
    )
    modelo_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("modelos.id", ondelete="CASCADE"), primary_key=True, index=True
    )
    versao_vista: Mapped[int] = mapped_column(Integer, nullable=False)
    primeira_em: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=agora)
    ultima_em: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=agora)
