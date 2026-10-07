"""Normalização de texto para busca (sem acento, minúsculo, espaços colapsados).

Feita em Python e gravada numa coluna `busca_texto`, para que a busca funcione
igual no Postgres e no SQLite dos testes, sem depender da extensão unaccent.
"""

import re
import unicodedata


def normalizar(texto: str | None) -> str:
    if not texto:
        return ""
    sem_acento = unicodedata.normalize("NFKD", texto)
    sem_acento = "".join(c for c in sem_acento if not unicodedata.combining(c))
    return re.sub(r"\s+", " ", sem_acento.lower()).strip()


def termos_busca(q: str | None) -> list[str]:
    """Quebra a busca em termos normalizados (todos precisam casar — AND)."""
    return [t for t in normalizar(q).split(" ") if t][:10]


def normalizar_palavras_chave(palavras: list[str] | None) -> list[str]:
    """Remove vazios e duplicatas (comparação sem acento/caixa), preservando a ordem."""
    vistos: set[str] = set()
    saida: list[str] = []
    for p in palavras or []:
        limpa = re.sub(r"\s+", " ", (p or "").strip())
        chave = normalizar(limpa)
        if limpa and chave not in vistos:
            vistos.add(chave)
            saida.append(limpa[:60])
    return saida[:30]


def slugify(texto: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", normalizar(texto)).strip("-")[:120] or "item"
