from app.api.deps import get_current_user, get_db
from app.api.response import SuccessResponse
from app.core.permissions import ROLE_LABELS, permissoes_efetivas, tem_acesso_admin
from app.core.rate_limit import limiter
from app.models.usuario import Usuario
from app.schemas.auth import AlterarSenhaIn, AuthenticatedUser, RefreshIn, TokenOut
from app.services.auth_service import AuthService
from fastapi import APIRouter, Depends, Request
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session

router = APIRouter(prefix="/auth", tags=["Auth"])


@router.post("/login", response_model=TokenOut)
@limiter.limit("10/minute")
@limiter.limit("50/hour")
def login(
    request: Request,
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db),
):
    return AuthService(db).autenticar(form_data.username, form_data.password)


@router.post("/refresh", response_model=TokenOut)
@limiter.limit("30/minute")
def refresh(request: Request, payload: RefreshIn, db: Session = Depends(get_db)):
    return AuthService(db).refresh(payload.refresh_token)


@router.get("/me", response_model=SuccessResponse[AuthenticatedUser])
def me(current_user: Usuario = Depends(get_current_user)):
    role = current_user.role
    return SuccessResponse(
        data=AuthenticatedUser(
            id=current_user.id,
            nome=current_user.nome,
            email=current_user.email,
            role=role.nome,
            role_label=ROLE_LABELS.get(role.nome, role.nome),
            ativo=current_user.ativo,
            acesso_admin=tem_acesso_admin(role),
            permissoes=permissoes_efetivas(role),
        )
    )


@router.post("/alterar-senha")
@limiter.limit("5/minute")
def alterar_senha(
    request: Request,
    payload: AlterarSenhaIn,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    AuthService(db).alterar_senha(current_user, payload.senha_atual, payload.nova_senha)
    return {"success": True}
