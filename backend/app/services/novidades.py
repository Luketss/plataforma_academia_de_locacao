"""Regra pura dos selos "novo" / "atualizado" da biblioteca."""

from datetime import datetime, timedelta

from app.core.datas import garantir_utc


def calcular_status(
    criado_em: datetime,
    conteudo_atualizado_em: datetime,
    versao: int,
    versao_vista: int | None,
    agora: datetime,
    dias: int,
) -> str | None:
    """
    - Já aberto pelo usuário: "atualizado" se a versão subiu desde a última
      visita (sem limite de tempo — ele precisa saber que mudou).
    - Nunca aberto: "novo" se criado dentro da janela; "atualizado" se é
      antigo mas teve conteúdo revisado dentro da janela. Fora da janela,
      sem selo (evita a biblioteca inteira "nova" para um mentorado recém-chegado).
    """
    if versao_vista is not None:
        return "atualizado" if versao > versao_vista else None

    janela = garantir_utc(agora) - timedelta(days=dias)
    if garantir_utc(criado_em) >= janela:
        return "novo"
    if versao > 1 and garantir_utc(conteudo_atualizado_em) >= janela:
        return "atualizado"
    return None
