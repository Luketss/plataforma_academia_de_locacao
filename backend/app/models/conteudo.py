from datetime import datetime

from app.core.datas import agora
from app.db.base import Base
from sqlalchemy import DateTime, String, Text
from sqlalchemy.orm import Mapped, mapped_column


class ConteudoSite(Base):
    """Textos editáveis da página inicial (chave → valor).

    Chaves conhecidas em app.services.conteudo_service.CHAVES. Assim o mentor
    troca currículo, apresentação e metodologia sem depender de desenvolvedor.
    """

    __tablename__ = "conteudo_site"

    chave: Mapped[str] = mapped_column(String(80), primary_key=True)
    valor: Mapped[str | None] = mapped_column(Text, nullable=True)
    atualizado_em: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=agora)
