from datetime import datetime, timezone


def agora() -> datetime:
    return datetime.now(timezone.utc)


def garantir_utc(dt: datetime | None) -> datetime | None:
    """SQLite devolve datetimes ingênuos; o Postgres, com fuso. Normaliza para UTC."""
    if dt is None:
        return None
    if dt.tzinfo is None:
        return dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(timezone.utc)
