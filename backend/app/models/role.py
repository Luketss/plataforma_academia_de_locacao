from app.db.base import Base
from sqlalchemy import JSON, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship


class Role(Base):
    __tablename__ = "roles"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    nome: Mapped[str] = mapped_column(String(50), unique=True, nullable=False)
    descricao: Mapped[str | None] = mapped_column(String(255), nullable=True)
    # {"area": ["criar", "editar", "excluir"]} — ver app.core.permissions.
    # ADMIN_GLOBAL tem bypass: o JSON dele é irrelevante.
    permissoes: Mapped[dict] = mapped_column(JSON, nullable=False, default=dict)

    usuarios = relationship("Usuario", back_populates="role")
