import secrets
from datetime import datetime, timedelta, timezone
from typing import Any

import bcrypt
import jwt
from app.core.config import settings

ALGORITHM = "HS256"


# ==============================
# Senhas
# ==============================


def hash_password(password: str) -> str:
    # bcrypt ignora o que passa de 72 bytes; truncar explicitamente evita o
    # ValueError do bcrypt>=4.1 para senhas longas.
    return bcrypt.hashpw(password.encode("utf-8")[:72], bcrypt.gensalt()).decode("utf-8")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    try:
        return bcrypt.checkpw(plain_password.encode("utf-8")[:72], hashed_password.encode("utf-8"))
    except ValueError:
        return False


# Hash pré-computado para manter o login em tempo constante quando o e-mail
# não existe — sem ele o tempo de resposta revela quais e-mails estão cadastrados.
DUMMY_PASSWORD_HASH = hash_password(secrets.token_urlsafe(32))


# ==============================
# JWT
# ==============================


def _encode(payload: dict[str, Any]) -> str:
    return jwt.encode(payload, settings.SECRET_KEY, algorithm=ALGORITHM)


def create_access_token(subject: str, extra_data: dict[str, Any] | None = None) -> str:
    now = datetime.now(timezone.utc)
    payload: dict[str, Any] = {
        "sub": subject,
        "type": "access",
        "iat": now,
        "exp": now + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES),
    }
    if extra_data:
        payload.update(extra_data)
    return _encode(payload)


def create_refresh_token(subject: str) -> str:
    now = datetime.now(timezone.utc)
    return _encode(
        {
            "sub": subject,
            "type": "refresh",
            "iat": now,
            "exp": now + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS),
        }
    )


def decode_token(token: str) -> dict[str, Any] | None:
    try:
        return jwt.decode(token, settings.SECRET_KEY, algorithms=[ALGORITHM])
    except jwt.PyJWTError:
        return None
