from datetime import datetime

from app.core.datas import agora
from app.db.base import Base
from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship


class Usuario(Base):
    __tablename__ = "usuarios"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    nome: Mapped[str] = mapped_column(String(150), nullable=False)
    email: Mapped[str] = mapped_column(String(150), unique=True, index=True, nullable=False)
    senha_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    role_id: Mapped[int] = mapped_column(Integer, ForeignKey("roles.id"), nullable=False)

    # ativo=False = acesso bloqueado (o usuário continua cadastrado).
    ativo: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    # Fim da mentoria: depois desta data o login é recusado. NULL = sem prazo.
    acesso_expira_em: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    last_login: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    criado_em: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=agora)

    role = relationship("Role", back_populates="usuarios", lazy="joined")
