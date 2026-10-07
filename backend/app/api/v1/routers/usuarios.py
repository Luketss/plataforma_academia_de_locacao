from app.api.deps import get_current_user, get_db, require_permissao
from app.api.pagination import PaginatedResponse
from app.api.response import SuccessResponse
from app.models.usuario import Usuario
from app.schemas.usuario import UsuarioCreate, UsuarioOut, UsuarioUpdate
from app.services.usuario_service import UsuarioService, to_out
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

router = APIRouter(prefix="/usuarios", tags=["Usuários"])


@router.get("", response_model=PaginatedResponse[UsuarioOut])
def listar(
    q: str | None = Query(default=None, max_length=100),
    role: str | None = None,
    ativo: bool | None = None,
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=50, ge=1, le=200),
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    # Escopo fail-closed em escopo_listagem_usuarios: gerente só vê mentorados.
    itens, total = UsuarioService(db).listar(current_user, q, role, ativo, skip, limit)
    return PaginatedResponse(items=[to_out(u) for u in itens], total=total, skip=skip, limit=limit)


@router.post("", response_model=SuccessResponse[UsuarioOut], status_code=201)
def criar(
    data: UsuarioCreate,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_permissao("usuarios", "criar")),
):
    return SuccessResponse(data=to_out(UsuarioService(db).criar(current_user, data)))


@router.put("/{user_id}", response_model=SuccessResponse[UsuarioOut])
def atualizar(
    user_id: int,
    data: UsuarioUpdate,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_permissao("usuarios", "editar")),
):
    return SuccessResponse(data=to_out(UsuarioService(db).atualizar(current_user, user_id, data)))


@router.delete("/{user_id}", status_code=204)
def excluir(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_permissao("usuarios", "excluir")),
):
    UsuarioService(db).excluir(current_user, user_id)
