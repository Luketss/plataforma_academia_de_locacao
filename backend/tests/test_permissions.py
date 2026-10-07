from types import SimpleNamespace

import pytest
from app.core.exceptions import ForbiddenException
from app.core.permissions import (
    PERMISSOES_PADRAO,
    escopo_listagem_usuarios,
    pode_gerenciar_usuario,
    permissoes_efetivas,
    roles_atribuiveis,
    tem_acesso_admin,
    tem_permissao,
)


def role(nome):
    return SimpleNamespace(nome=nome, permissoes=PERMISSOES_PADRAO[nome])


def test_admin_global_tem_bypass_mesmo_com_json_vazio():
    assert tem_permissao(SimpleNamespace(nome="ADMIN_GLOBAL", permissoes={}), "conteudo", "editar")


def test_gerente_gerencia_biblioteca_mas_nao_pagina_inicial():
    g = role("GERENTE")
    assert tem_permissao(g, "modelos", "criar")
    assert tem_permissao(g, "categorias", "excluir")
    assert not tem_permissao(g, "conteudo", "editar")


def test_usuario_sem_permissao_de_escrita_nem_admin():
    u = role("USUARIO")
    assert not tem_acesso_admin(u)
    assert permissoes_efetivas(u) == {}
    assert tem_acesso_admin(role("GERENTE"))


def test_permissoes_efetivas_descarta_areas_e_verbos_invalidos():
    r = SimpleNamespace(nome="X", permissoes={"modelos": ["criar", "voar"], "inexistente": ["criar"]})
    assert permissoes_efetivas(r) == {"modelos": ["criar"]}


def test_roles_atribuiveis():
    assert roles_atribuiveis(role("ADMIN_GLOBAL")) == ["ADMIN_GLOBAL", "GERENTE", "USUARIO"]
    assert roles_atribuiveis(role("GERENTE")) == ["USUARIO"]
    assert roles_atribuiveis(role("USUARIO")) == []


@pytest.mark.parametrize(
    "ator,alvo,esperado",
    [
        ("ADMIN_GLOBAL", "ADMIN_GLOBAL", True),
        ("ADMIN_GLOBAL", "GERENTE", True),
        ("GERENTE", "USUARIO", True),
        ("GERENTE", "GERENTE", False),
        ("GERENTE", "ADMIN_GLOBAL", False),
        ("USUARIO", "USUARIO", False),
    ],
)
def test_pode_gerenciar_usuario(ator, alvo, esperado):
    assert pode_gerenciar_usuario(role(ator), role(alvo)) is esperado


def test_escopo_listagem_fail_closed():
    assert escopo_listagem_usuarios(role("ADMIN_GLOBAL")) is None
    assert escopo_listagem_usuarios(role("GERENTE")) == ["USUARIO"]
    with pytest.raises(ForbiddenException):
        escopo_listagem_usuarios(role("USUARIO"))
