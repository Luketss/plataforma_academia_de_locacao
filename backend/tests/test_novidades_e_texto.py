from datetime import datetime, timedelta, timezone

from app.core.texto import normalizar, normalizar_palavras_chave, slugify, termos_busca
from app.services.novidades import calcular_status

AGORA = datetime(2026, 10, 7, tzinfo=timezone.utc)


def st(criado_dias, atualizado_dias, versao, vista, dias=30):
    return calcular_status(
        AGORA - timedelta(days=criado_dias), AGORA - timedelta(days=atualizado_dias), versao, vista, AGORA, dias
    )


def test_nunca_aberto_e_recente_e_novo():
    assert st(3, 3, 1, None) == "novo"


def test_nunca_aberto_antigo_sem_revisao_nao_tem_selo():
    assert st(90, 90, 1, None) is None


def test_nunca_aberto_antigo_revisado_recentemente_e_atualizado():
    assert st(90, 5, 3, None) == "atualizado"


def test_aberto_em_versao_anterior_e_atualizado_sem_limite_de_tempo():
    assert st(400, 200, 4, 2) == "atualizado"


def test_aberto_na_versao_atual_nao_tem_selo():
    assert st(1, 1, 2, 2) is None


def test_datas_ingenuas_sao_tratadas_como_utc():
    naive = (AGORA - timedelta(days=1)).replace(tzinfo=None)
    assert calcular_status(naive, naive, 1, None, AGORA, 30) == "novo"


def test_normalizacao_remove_acentos_e_caixa():
    assert normalizar("  Notificação   EXTRAJUDICIAL ") == "notificacao extrajudicial"
    assert termos_busca("Vistória  de Saída") == ["vistoria", "de", "saida"]


def test_palavras_chave_sem_duplicatas():
    assert normalizar_palavras_chave(["Contrato", "contrato ", "", "Garantía", "garantia"]) == [
        "Contrato",
        "Garantía",
    ]


def test_slugify():
    assert slugify("Notificações & Cobrança") == "notificacoes-cobranca"
    assert slugify("!!!") == "item"
