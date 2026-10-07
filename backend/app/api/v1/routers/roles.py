from app.api.deps import get_db, require_acesso_admin
from app.api.response import SuccessResponse
from app.core.permissions import ROLE_LABELS, ROLES, permissoes_efetivas, roles_atribuiveis
from app.models.role import Role
from app.models.usuario import Usuario
from app.schemas.usuario import RoleOut
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

router = APIRouter(prefix="/roles", tags=["Papéis"])


@router.get("", response_model=SuccessResponse[list[RoleOut]])
def listar(db: Session = Depends(get_db), current_user: Usuario = Depends(require_acesso_admin)):
    atribuiveis = roles_atribuiveis(current_user.role)
    roles = sorted(db.query(Role).all(), key=lambda r: ROLES.index(r.nome) if r.nome in ROLES else 99)
    return SuccessResponse(
        data=[
            RoleOut(
                id=r.id,
                nome=r.nome,
                label=ROLE_LABELS.get(r.nome, r.nome),
                descricao=r.descricao,
                permissoes=permissoes_efetivas(r),
                atribuivel=r.nome in atribuiveis,
            )
            for r in roles
        ]
    )
