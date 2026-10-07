from datetime import datetime

from app.core.datas import agora
from app.db.base import Base
from sqlalchemy import JSON, Boolean, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship


class Modelo(Base):
    """Modelo/material da biblioteca.

    O conteúdo pode vir de três formas, combináveis: texto (markdown leve)
    editado direto no admin, um arquivo anexado e/ou um link externo.

    Versionamento: `versao` sobe (e `conteudo_atualizado_em` é carimbado)
    quando o conteúdo muda — é o que faz o modelo aparecer como "atualizado"
    para quem já o tinha aberto. Correções cosméticas podem ser salvas sem
    subir a versão (registrar_atualizacao=False).
    """

    __tablename__ = "modelos"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    titulo: Mapped[str] = mapped_column(String(200), nullable=False)
    descricao: Mapped[str | None] = mapped_column(Text, nullable=True)
    conteudo: Mapped[str | None] = mapped_column(Text, nullable=True)
    palavras_chave: Mapped[list] = mapped_column(JSON, nullable=False, default=list)
    link_externo: Mapped[str | None] = mapped_column(String(500), nullable=True)

    categoria_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("categorias.id", ondelete="RESTRICT"), nullable=False, index=True
    )
    arquivo_id: Mapped[int | None] = mapped_column(
        Integer, ForeignKey("arquivos.id", ondelete="SET NULL"), nullable=True
    )

    # Desativado = oculto para mentorados, preservado no admin.
    ativo: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    destaque: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)

    versao: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    nota_atualizacao: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Texto normalizado (sem acento/minúsculo) de título, descrição, palavras-chave,
    # conteúdo e categoria — alvo da busca por palavra-chave.
    busca_texto: Mapped[str] = mapped_column(Text, nullable=False, default="")

    criado_em: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=agora)
    atualizado_em: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=agora)
    conteudo_atualizado_em: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=agora)

    criado_por_id: Mapped[int | None] = mapped_column(
        Integer, ForeignKey("usuarios.id", ondelete="SET NULL"), nullable=True
    )
    atualizado_por_id: Mapped[int | None] = mapped_column(
        Integer, ForeignKey("usuarios.id", ondelete="SET NULL"), nullable=True
    )

    categoria = relationship("Categoria", back_populates="modelos", lazy="joined")
    arquivo = relationship("Arquivo", lazy="joined")
