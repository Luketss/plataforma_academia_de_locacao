from datetime import datetime

from app.core.datas import agora
from app.db.base import Base
from sqlalchemy import DateTime, Integer, LargeBinary, String
from sqlalchemy.orm import Mapped, deferred, mapped_column


class Arquivo(Base):
    """Arquivo enviado pelo admin (modelo .docx/.pdf/.xlsx, foto do mentor).

    Guardado no próprio Postgres: dispensa volume/bucket no deploy e os
    arquivos de modelo são pequenos. `conteudo` é deferred para que listagens
    nunca carreguem os bytes.
    """

    __tablename__ = "arquivos"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    nome_original: Mapped[str] = mapped_column(String(255), nullable=False)
    content_type: Mapped[str] = mapped_column(String(150), nullable=False)
    tamanho: Mapped[int] = mapped_column(Integer, nullable=False)
    sha256: Mapped[str] = mapped_column(String(64), nullable=False)
    conteudo: Mapped[bytes] = deferred(mapped_column(LargeBinary, nullable=False))
    criado_em: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=agora)
