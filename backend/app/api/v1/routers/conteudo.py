from app.api.deps import get_current_user, get_db, require_permissao
from app.api.response import SuccessResponse
from app.core.exceptions import NotFoundException
from app.models.usuario import Usuario
from app.schemas.conteudo import ConteudoOut, ConteudoUpdate
from app.services.arquivo_service import TIPOS_IMAGEM, criar_arquivo, ler_upload, resposta_arquivo
from app.services.conteudo_service import ConteudoService
from fastapi import APIRouter, Depends, File, UploadFile
from sqlalchemy.orm import Session

router = APIRouter(prefix="/conteudo", tags=["Página inicial"])


@router.get("", response_model=SuccessResponse[ConteudoOut])
def obter(db: Session = Depends(get_db), _: Usuario = Depends(get_current_user)):
    return SuccessResponse(data=ConteudoService(db).obter())


@router.put("", response_model=SuccessResponse[ConteudoOut])
def atualizar(
    data: ConteudoUpdate,
    db: Session = Depends(get_db),
    _: Usuario = Depends(require_permissao("conteudo", "editar")),
):
    return SuccessResponse(data=ConteudoService(db).atualizar(data))


@router.get("/foto")
def foto(db: Session = Depends(get_db), _: Usuario = Depends(get_current_user)):
    arquivo = ConteudoService(db).foto()
    if not arquivo:
        raise NotFoundException("Foto não cadastrada")
    return resposta_arquivo(arquivo, inline=True)


@router.post("/foto", response_model=SuccessResponse[ConteudoOut])
async def enviar_foto(
    arquivo: UploadFile = File(...),
    db: Session = Depends(get_db),
    _: Usuario = Depends(require_permissao("conteudo", "editar")),
):
    dados = await ler_upload(arquivo)
    service = ConteudoService(db)
    service.definir_foto(criar_arquivo(db, arquivo.filename or "foto", dados, TIPOS_IMAGEM))
    return SuccessResponse(data=service.obter())


@router.delete("/foto", response_model=SuccessResponse[ConteudoOut])
def remover_foto(
    db: Session = Depends(get_db),
    _: Usuario = Depends(require_permissao("conteudo", "editar")),
):
    service = ConteudoService(db)
    service.definir_foto(None)
    return SuccessResponse(data=service.obter())
