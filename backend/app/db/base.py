from sqlalchemy.orm import DeclarativeBase


class Base(DeclarativeBase):
    """Base declarativa. Não importar models aqui (evita import circular);
    eles são registrados via app.models."""
