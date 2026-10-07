"""Upload/download dos arquivos guardados no banco (ver models.arquivo)."""

import hashlib
import os
from urllib.parse import quote

from app.core.config import settings
from app.core.exceptions import ValidationException
from app.models.arquivo import Arquivo
from fastapi import UploadFile
from fastapi.responses import Response
from sqlalchemy.orm import Session

# O content-type gravado vem da extensão — nunca do que o navegador declarou.
TIPOS_MODELO = {
    ".pdf": "application/pdf",
    ".doc": "application/msword",
    ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ".xls": "application/vnd.ms-excel",
    ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    ".ppt": "application/vnd.ms-powerpoint",
    ".pptx": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    ".odt": "application/vnd.oasis.opendocument.text",
    ".ods": "application/vnd.oasis.opendocument.spreadsheet",
    ".txt": "text/plain",
    ".csv": "text/csv",
    ".zip": "application/zip",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".webp": "image/webp",
}

TIPOS_IMAGEM = {k: v for k, v in TIPOS_MODELO.items() if v.startswith("image/")}

# Só estes abrem embutidos no navegador; o resto sempre baixa como anexo.
TIPOS_INLINE = {"application/pdf", "image/png", "image/jpeg", "image/webp", "text/plain"}


def extensao(nome: str) -> str:
    return os.path.splitext(nome or "")[1].lower()


def nome_seguro(nome: str) -> str:
    base = os.path.basename((nome or "").replace("\\", "/")).strip()
    base = "".join(c for c in base if c.isprintable() and c not in '<>:"/\\|?*')
    return base[:255] or "arquivo"


def validar_tipo(nome: str, permitidos: dict[str, str]) -> str:
    ext = extensao(nome)
    if ext not in permitidos:
        aceitos = ", ".join(sorted(permitidos))
        raise ValidationException(f"Tipo de arquivo não permitido ({ext or 'sem extensão'}). Aceitos: {aceitos}")
    return permitidos[ext]


async def ler_upload(upload: UploadFile) -> bytes:
    limite = settings.UPLOAD_MAX_MB * 1024 * 1024
    dados = await upload.read(limite + 1)
    if len(dados) > limite:
        raise ValidationException(f"Arquivo maior que o limite de {settings.UPLOAD_MAX_MB} MB.")
    if not dados:
        raise ValidationException("Arquivo vazio.")
    return dados


def criar_arquivo(db: Session, nome: str, dados: bytes, permitidos: dict[str, str]) -> Arquivo:
    nome = nome_seguro(nome)
    content_type = validar_tipo(nome, permitidos)
    arquivo = Arquivo(
        nome_original=nome,
        content_type=content_type,
        tamanho=len(dados),
        sha256=hashlib.sha256(dados).hexdigest(),
        conteudo=dados,
    )
    db.add(arquivo)
    db.flush()
    return arquivo


def content_disposition(nome: str, inline: bool) -> str:
    tipo = "inline" if inline else "attachment"
    ascii_fallback = nome.encode("ascii", "ignore").decode() or "arquivo"
    ascii_fallback = ascii_fallback.replace('"', "")
    return f"{tipo}; filename=\"{ascii_fallback}\"; filename*=UTF-8''{quote(nome)}"


def resposta_arquivo(arquivo: Arquivo, inline: bool = False) -> Response:
    inline = inline and arquivo.content_type in TIPOS_INLINE
    return Response(
        content=arquivo.conteudo,
        media_type=arquivo.content_type,
        headers={
            "Content-Disposition": content_disposition(arquivo.nome_original, inline),
            "X-Content-Type-Options": "nosniff",
            "Cache-Control": "private, no-store",
            # Mesmo se aberto direto, o arquivo não roda scripts no domínio da API.
            "Content-Security-Policy": "default-src 'none'; img-src 'self'; style-src 'unsafe-inline'; sandbox",
        },
    )
