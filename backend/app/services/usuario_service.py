from app.api.deps import acesso_expirado
from app.core.exceptions import ConflictException, ForbiddenException, NotFoundException
from app.core.permissions import (
    ADMIN_GLOBAL,
    ROLE_LABELS,
    escopo_listagem_usuarios,
    pode_gerenciar_usuario,
    roles_atribuiveis,
)
from app.core.security import hash_password
from app.models.role import Role
from app.models.usuario import Usuario
from app.schemas.usuario import UsuarioCreate, UsuarioOut, UsuarioUpdate
from sqlalchemy import func, or_
from sqlalchemy.orm import Session


def to_out(u: Usuario) -> UsuarioOut:
    return UsuarioOut(
        id=u.id,
        nome=u.nome,
        email=u.email,
        role=u.role.nome,
        role_label=ROLE_LABELS.get(u.role.nome, u.role.nome),
        ativo=u.ativo,
        acesso_expira_em=u.acesso_expira_em,
        acesso_expirado=acesso_expirado(u),
        last_login=u.last_login,
        criado_em=u.criado_em,
    )


def erros_alteracao_propria(ator: Usuario, alvo: Usuario, payload: dict) -> list[str]:
    """Ninguém se bloqueia nem rebaixa o próprio papel pela tela de usuários
    (evita perder o acesso administrativo por engano)."""
    if ator.id != alvo.id:
        return []
    erros = []
    if payload.get("ativo") is False:
        erros.append("Você não pode bloquear o seu próprio acesso.")
    if "role" in payload and payload["role"] not in (None, alvo.role.nome):
        erros.append("Você não pode alterar o seu próprio papel.")
    if "acesso_expira_em" in payload and payload["acesso_expira_em"] is not None:
        erros.append("Você não pode definir expiração para o seu próprio acesso.")
    return erros


class UsuarioService:
    def __init__(self, db: Session):
        self.db = db

    def _role(self, nome: str) -> Role:
        role = self.db.query(Role).filter(Role.nome == nome).first()
        if not role:
            raise NotFoundException(f"Papel '{nome}' não encontrado")
        return role

    def _exigir_atribuivel(self, ator: Usuario, role_nome: str) -> None:
        if role_nome not in roles_atribuiveis(ator.role):
            raise ForbiddenException(f"Você não pode atribuir o papel {role_nome}.")

    def _exigir_gerencia(self, ator: Usuario, alvo: Usuario) -> None:
        if not pode_gerenciar_usuario(ator.role, alvo.role):
            raise ForbiddenException("Sem permissão para gerenciar este usuário.")

    def _admins_ativos(self) -> int:
        return (
            self.db.query(Usuario)
            .join(Usuario.role)
            .filter(Role.nome == ADMIN_GLOBAL, Usuario.ativo.is_(True))
            .count()
        )

    def _exigir_admin_restante(self, alvo: Usuario, perde_admin: bool) -> None:
        if perde_admin and alvo.role.nome == ADMIN_GLOBAL and alvo.ativo and self._admins_ativos() <= 1:
            raise ConflictException("A plataforma precisa de pelo menos um administrador global ativo.")

    def get(self, user_id: int) -> Usuario:
        user = self.db.get(Usuario, user_id)
        if not user:
            raise NotFoundException("Usuário não encontrado")
        return user

    def listar(
        self, ator: Usuario, q: str | None, role: str | None, ativo: bool | None, skip: int, limit: int
    ) -> tuple[list[Usuario], int]:
        roles_visiveis = escopo_listagem_usuarios(ator.role)
        query = self.db.query(Usuario).join(Usuario.role)
        if roles_visiveis is not None:
            query = query.filter(Role.nome.in_(roles_visiveis))
        if role:
            query = query.filter(Role.nome == role)
        if ativo is not None:
            query = query.filter(Usuario.ativo.is_(ativo))
        if q:
            termo = q.strip().lower()
            query = query.filter(
                or_(
                    func.lower(Usuario.nome).contains(termo, autoescape=True),
                    func.lower(Usuario.email).contains(termo, autoescape=True),
                )
            )
        total = query.count()
        itens = query.order_by(Usuario.nome).offset(skip).limit(limit).all()
        return itens, total

    def criar(self, ator: Usuario, data: UsuarioCreate) -> Usuario:
        self._exigir_atribuivel(ator, data.role)
        email = data.email.lower().strip()
        if self.db.query(Usuario).filter(func.lower(Usuario.email) == email).first():
            raise ConflictException("Já existe um usuário com este e-mail.")
        user = Usuario(
            nome=data.nome.strip(),
            email=email,
            senha_hash=hash_password(data.senha),
            role_id=self._role(data.role).id,
            ativo=data.ativo,
            acesso_expira_em=data.acesso_expira_em,
        )
        self.db.add(user)
        self.db.commit()
        self.db.refresh(user)
        return user

    def atualizar(self, ator: Usuario, user_id: int, data: UsuarioUpdate) -> Usuario:
        alvo = self.get(user_id)
        self._exigir_gerencia(ator, alvo)
        payload = data.model_dump(exclude_unset=True)

        erros = erros_alteracao_propria(ator, alvo, payload)
        if erros:
            raise ForbiddenException(" ".join(erros))

        novo_role = payload.get("role")
        if novo_role and novo_role != alvo.role.nome:
            self._exigir_atribuivel(ator, novo_role)
        self._exigir_admin_restante(
            alvo,
            perde_admin=payload.get("ativo") is False or (novo_role not in (None, ADMIN_GLOBAL)),
        )

        if payload.get("email"):
            email = payload["email"].lower().strip()
            existente = self.db.query(Usuario).filter(func.lower(Usuario.email) == email).first()
            if existente and existente.id != alvo.id:
                raise ConflictException("Já existe um usuário com este e-mail.")
            alvo.email = email
        if payload.get("nome"):
            alvo.nome = payload["nome"].strip()
        if payload.get("senha"):
            alvo.senha_hash = hash_password(payload["senha"])
        if novo_role:
            alvo.role_id = self._role(novo_role).id
        if payload.get("ativo") is not None:
            alvo.ativo = payload["ativo"]
        if "acesso_expira_em" in payload:
            alvo.acesso_expira_em = payload["acesso_expira_em"]

        self.db.commit()
        self.db.refresh(alvo)
        return alvo

    def excluir(self, ator: Usuario, user_id: int) -> None:
        alvo = self.get(user_id)
        if alvo.id == ator.id:
            raise ForbiddenException("Você não pode remover a si mesmo.")
        self._exigir_gerencia(ator, alvo)
        self._exigir_admin_restante(alvo, perde_admin=True)
        self.db.delete(alvo)
        self.db.commit()
