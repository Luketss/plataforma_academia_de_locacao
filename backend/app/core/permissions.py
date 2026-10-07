"""Núcleo de RBAC: papéis × áreas × verbos.

Funções puras (sem DB): recebem o objeto Role (ou qualquer objeto com
.nome/.permissoes) e primitivos — testáveis isoladamente.

Papéis do sistema:
- ADMIN_GLOBAL: controle total (bypass de permissões), inclusive gerentes,
  outros admins e o conteúdo da página inicial.
- GERENTE: gerencia a biblioteca (modelos e categorias) e os mentorados
  (papel USUARIO). Não enxerga nem altera admins/gerentes.
- USUARIO: mentorado — só leitura da página inicial e da biblioteca.
"""

ADMIN_GLOBAL = "ADMIN_GLOBAL"
GERENTE = "GERENTE"
USUARIO = "USUARIO"

ROLES = (ADMIN_GLOBAL, GERENTE, USUARIO)

ROLE_LABELS = {
    ADMIN_GLOBAL: "Administrador global",
    GERENTE: "Gerente",
    USUARIO: "Mentorado",
}

AREAS = ("modelos", "categorias", "usuarios", "conteudo")
VERBOS = ("criar", "editar", "excluir")

AREA_LABELS = {
    "modelos": "Modelos",
    "categorias": "Categorias",
    "usuarios": "Usuários / mentorados",
    "conteudo": "Página inicial",
}

PERMISSOES_TODAS = {area: list(VERBOS) for area in AREAS}

# Permissões padrão gravadas na tabela roles pela migração inicial.
PERMISSOES_PADRAO = {
    ADMIN_GLOBAL: PERMISSOES_TODAS,
    GERENTE: {
        "modelos": list(VERBOS),
        "categorias": list(VERBOS),
        "usuarios": list(VERBOS),
    },
    USUARIO: {},
}


def _nome(role) -> str | None:
    if role is None:
        return None
    return role if isinstance(role, str) else role.nome


def tem_permissao(role, area: str, verbo: str) -> bool:
    if role is None:
        return False
    if _nome(role) == ADMIN_GLOBAL:
        return True
    permissoes = getattr(role, "permissoes", None) or {}
    return verbo in permissoes.get(area, [])


def tem_acesso_admin(role) -> bool:
    """Pode entrar na área administrativa (algum verbo em alguma área)."""
    return any(tem_permissao(role, a, v) for a in AREAS for v in VERBOS)


def permissoes_efetivas(role) -> dict:
    """Mapa saneado para o /auth/me (só áreas/verbos válidos)."""
    if role is None:
        return {}
    if _nome(role) == ADMIN_GLOBAL:
        return {a: list(v) for a, v in PERMISSOES_TODAS.items()}
    permissoes = getattr(role, "permissoes", None) or {}
    efetivas = {}
    for area in AREAS:
        verbos = [v for v in VERBOS if v in permissoes.get(area, [])]
        if verbos:
            efetivas[area] = verbos
    return efetivas


def roles_atribuiveis(ator_role) -> list[str]:
    """Papéis que o ator pode atribuir ao criar/editar um usuário."""
    nome = _nome(ator_role)
    if nome == ADMIN_GLOBAL:
        return list(ROLES)
    if nome == GERENTE:
        return [USUARIO]
    return []


def pode_gerenciar_usuario(ator_role, alvo_role) -> bool:
    """Guarda anti-escalação: gerente só mexe em mentorados (USUARIO)."""
    nome = _nome(ator_role)
    if nome == ADMIN_GLOBAL:
        return True
    if nome == GERENTE:
        return _nome(alvo_role) == USUARIO
    return False


def escopo_listagem_usuarios(ator_role) -> list[str] | None:
    """Papéis visíveis na listagem de usuários (None = todos). Fail-closed:
    quem não tem nenhum verbo em 'usuarios' recebe 403."""
    from app.core.exceptions import ForbiddenException

    if _nome(ator_role) == ADMIN_GLOBAL:
        return None
    if not any(tem_permissao(ator_role, "usuarios", v) for v in VERBOS):
        raise ForbiddenException("Sem permissão para ver usuários.")
    return roles_atribuiveis(ator_role)
