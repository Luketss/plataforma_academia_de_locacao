from typing import Literal

from app.api.deps import get_current_user, get_db, require_permissao
from app.api.pagination import PaginatedResponse
from app.api.response import SuccessResponse
from app.core.exceptions import NotFoundException
from app.models.usuario import Usuario
from app.schemas.modelo import ModeloCreate, ModeloDetalhe, ModeloResumo, ModeloUpdate
from app.services.arquivo_service import TIPOS_MODELO, criar_arquivo, ler_upload, resposta_arquivo
from app.services.modelo_service import ModeloService
from fastapi import APIRouter, Depends, File, Form, Query, UploadFile
from sqlalchemy.orm import Session

router = APIRouter(prefix="/modelos", tags=["Modelos"])


@router.get("", response_model=PaginatedResponse[ModeloResumo])
def listar(
    q: str | None = Query(default=None, max_length=200, description="Palavras-chave (todas precisam casar)"),
    categoria_id: int | None = None,
    status: Literal["novo", "atualizado"] | None = None,
    incluir_inativos: bool = False,
    ordenar: Literal["titulo", "recentes"] = "titulo",
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=50, ge=1, le=500),
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    itens, total = ModeloService(db).listar(
        current_user,
        q=q,
        categoria_id=categoria_id,
        status=status,
        incluir_inativos=incluir_inativos,
        ordenar=ordenar,
        skip=skip,
        limit=limit,
    )
    return PaginatedResponse(items=itens, total=total, skip=skip, limit=limit)


@router.get("/{modelo_id}", response_model=SuccessResponse[ModeloDetalhe])
def detalhe(
    modelo_id: int,
    registrar_visualizacao: bool = True,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    return SuccessResponse(data=ModeloService(db).detalhe(current_user, modelo_id, registrar_visualizacao))


@router.get("/{modelo_id}/arquivo")
def baixar_arquivo(
    modelo_id: int,
    inline: bool = False,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    modelo = ModeloService(db).obter_visivel(current_user, modelo_id)
    if not modelo.arquivo:
        raise NotFoundException("Este modelo não tem arquivo anexado")
    return resposta_arquivo(modelo.arquivo, inline=inline)


@router.post("", response_model=SuccessResponse[ModeloDetalhe], status_code=201)
def criar(
    data: ModeloCreate,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_permissao("modelos", "criar")),
):
    service = ModeloService(db)
    modelo = service.criar(data, current_user)
    return SuccessResponse(data=service.detalhe(current_user, modelo.id, registrar_visualizacao=False))


@router.put("/{modelo_id}", response_model=SuccessResponse[ModeloDetalhe])
def atualizar(
    modelo_id: int,
    data: ModeloUpdate,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_permissao("modelos", "editar")),
):
    service = ModeloService(db)
    service.atualizar(modelo_id, data, current_user)
    return SuccessResponse(data=service.detalhe(current_user, modelo_id, registrar_visualizacao=False))


@router.post("/{modelo_id}/arquivo", response_model=SuccessResponse[ModeloDetalhe])
async def enviar_arquivo(
    modelo_id: int,
    arquivo: UploadFile = File(...),
    registrar_atualizacao: bool = Form(default=True),
    nota_atualizacao: str | None = Form(default=None, max_length=2000),
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_permissao("modelos", "editar")),
):
    service = ModeloService(db)
    service.obter(modelo_id)  # 404 antes de ler o upload
    dados = await ler_upload(arquivo)
    novo = criar_arquivo(db, arquivo.filename or "arquivo", dados, TIPOS_MODELO)
    service.substituir_arquivo(modelo_id, novo, current_user, registrar_atualizacao, nota_atualizacao)
    return SuccessResponse(data=service.detalhe(current_user, modelo_id, registrar_visualizacao=False))


@router.delete("/{modelo_id}/arquivo", response_model=SuccessResponse[ModeloDetalhe])
def remover_arquivo(
    modelo_id: int,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_permissao("modelos", "editar")),
):
    service = ModeloService(db)
    service.remover_arquivo(modelo_id, current_user)
    return SuccessResponse(data=service.detalhe(current_user, modelo_id, registrar_visualizacao=False))


@router.delete("/{modelo_id}", status_code=204)
def excluir(
    modelo_id: int,
    db: Session = Depends(get_db),
    _: Usuario = Depends(require_permissao("modelos", "excluir")),
):
    ModeloService(db).excluir(modelo_id)
