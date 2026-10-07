"""schema inicial: papéis, usuários, categorias, modelos, arquivos, conteúdo

Revision ID: 0001_schema_inicial
Revises:
Create Date: 2026-10-07

"""
import sqlalchemy as sa
from alembic import op

revision = "0001_schema_inicial"
down_revision = None
branch_labels = None
depends_on = None

# Cópia congelada de app.core.permissions.PERMISSOES_PADRAO: migrações não
# importam código da app (que muda com o tempo).
_VERBOS = ["criar", "editar", "excluir"]
ROLES = [
    {
        "nome": "ADMIN_GLOBAL",
        "descricao": "Controle total da plataforma (bypass de permissões).",
        "permissoes": {a: _VERBOS for a in ("modelos", "categorias", "usuarios", "conteudo")},
    },
    {
        "nome": "GERENTE",
        "descricao": "Gerencia a biblioteca (modelos e categorias) e os mentorados.",
        "permissoes": {"modelos": _VERBOS, "categorias": _VERBOS, "usuarios": _VERBOS},
    },
    {
        "nome": "USUARIO",
        "descricao": "Mentorado: acesso de leitura à página inicial e à biblioteca.",
        "permissoes": {},
    },
]


def _ts(nome: str, nullable: bool = False):
    return sa.Column(nome, sa.DateTime(timezone=True), nullable=nullable, server_default=None if nullable else sa.func.now())


def upgrade() -> None:
    roles = op.create_table(
        "roles",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("nome", sa.String(50), nullable=False, unique=True),
        sa.Column("descricao", sa.String(255), nullable=True),
        sa.Column("permissoes", sa.JSON(), nullable=False),
    )

    op.create_table(
        "usuarios",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("nome", sa.String(150), nullable=False),
        sa.Column("email", sa.String(150), nullable=False),
        sa.Column("senha_hash", sa.String(255), nullable=False),
        sa.Column("role_id", sa.Integer(), sa.ForeignKey("roles.id"), nullable=False),
        sa.Column("ativo", sa.Boolean(), nullable=False, server_default=sa.true()),
        _ts("acesso_expira_em", nullable=True),
        _ts("last_login", nullable=True),
        _ts("criado_em"),
    )
    op.create_index("ix_usuarios_email", "usuarios", ["email"], unique=True)

    op.create_table(
        "arquivos",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("nome_original", sa.String(255), nullable=False),
        sa.Column("content_type", sa.String(150), nullable=False),
        sa.Column("tamanho", sa.Integer(), nullable=False),
        sa.Column("sha256", sa.String(64), nullable=False),
        sa.Column("conteudo", sa.LargeBinary(), nullable=False),
        _ts("criado_em"),
    )

    op.create_table(
        "categorias",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("nome", sa.String(120), nullable=False, unique=True),
        sa.Column("slug", sa.String(130), nullable=False, unique=True),
        sa.Column("descricao", sa.Text(), nullable=True),
        sa.Column("ordem", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("ativa", sa.Boolean(), nullable=False, server_default=sa.true()),
        _ts("criado_em"),
    )

    op.create_table(
        "modelos",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("titulo", sa.String(200), nullable=False),
        sa.Column("descricao", sa.Text(), nullable=True),
        sa.Column("conteudo", sa.Text(), nullable=True),
        sa.Column("palavras_chave", sa.JSON(), nullable=False),
        sa.Column("link_externo", sa.String(500), nullable=True),
        sa.Column(
            "categoria_id", sa.Integer(), sa.ForeignKey("categorias.id", ondelete="RESTRICT"), nullable=False
        ),
        sa.Column("arquivo_id", sa.Integer(), sa.ForeignKey("arquivos.id", ondelete="SET NULL"), nullable=True),
        sa.Column("ativo", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("destaque", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("versao", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("nota_atualizacao", sa.Text(), nullable=True),
        sa.Column("busca_texto", sa.Text(), nullable=False, server_default=""),
        _ts("criado_em"),
        _ts("atualizado_em"),
        _ts("conteudo_atualizado_em"),
        sa.Column("criado_por_id", sa.Integer(), sa.ForeignKey("usuarios.id", ondelete="SET NULL"), nullable=True),
        sa.Column(
            "atualizado_por_id", sa.Integer(), sa.ForeignKey("usuarios.id", ondelete="SET NULL"), nullable=True
        ),
    )
    op.create_index("ix_modelos_categoria_id", "modelos", ["categoria_id"])

    op.create_table(
        "modelo_visualizacoes",
        sa.Column("usuario_id", sa.Integer(), sa.ForeignKey("usuarios.id", ondelete="CASCADE"), primary_key=True),
        sa.Column("modelo_id", sa.Integer(), sa.ForeignKey("modelos.id", ondelete="CASCADE"), primary_key=True),
        sa.Column("versao_vista", sa.Integer(), nullable=False),
        _ts("primeira_em"),
        _ts("ultima_em"),
    )
    op.create_index("ix_modelo_visualizacoes_modelo_id", "modelo_visualizacoes", ["modelo_id"])

    op.create_table(
        "conteudo_site",
        sa.Column("chave", sa.String(80), primary_key=True),
        sa.Column("valor", sa.Text(), nullable=True),
        _ts("atualizado_em"),
    )

    op.bulk_insert(roles, ROLES)


def downgrade() -> None:
    op.drop_table("conteudo_site")
    op.drop_index("ix_modelo_visualizacoes_modelo_id", table_name="modelo_visualizacoes")
    op.drop_table("modelo_visualizacoes")
    op.drop_index("ix_modelos_categoria_id", table_name="modelos")
    op.drop_table("modelos")
    op.drop_table("categorias")
    op.drop_table("arquivos")
    op.drop_index("ix_usuarios_email", table_name="usuarios")
    op.drop_table("usuarios")
    op.drop_table("roles")
