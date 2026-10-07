from app.api.deps import get_current_user, get_db, require_permissao
from app.api.response import SuccessResponse
from app.core.exceptions import ConflictException, NotFoundException
from app.core.texto import slugify
from app.models.categoria import Categoria
from app.models.modelo import Modelo
from app.models.usuario import Usuario
from app.schemas.categoria import CategoriaCreate, CategoriaOut, CategoriaUpdate
from app.services.modelo_service import ModeloService, pode_gerenciar_modelos
from fastapi import APIRouter, Depends
from sqlalchemy import func
from sqlalchemy.orm import Session

router = APIRouter(prefix="/categorias", tags=["Categorias"])


def _slug_unico(db: Session, nome: str, ignorar_id: int | None = None) -> str:
    base = slugify(nome)
    slug, n = base, 2
    while True:
        existente = db.query(Categoria).filter(Categoria.slug == slug).first()
        if not existente or existente.id == ignorar_id:
            return slug
        slug, n = f"{base}-{n}", n + 1


def _nome_livre(db: Session, nome: str, ignorar_id: int | None = None) -> None:
    existente = db.query(Categoria).filter(func.lower(Categoria.nome) == nome.lower()).first()
    if existente and existente.id != ignorar_id:
        raise ConflictException("Já existe uma categoria com este nome.")


def _out(c: Categoria, total: int) -> CategoriaOut:
    return CategoriaOut(
        id=c.id, nome=c.nome, slug=c.slug, descricao=c.descricao, ordem=c.ordem, ativa=c.ativa, total_modelos=total
    )


@router.get("", response_model=SuccessResponse[list[CategoriaOut]])
def listar(
    incluir_inativas: bool = False,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    gerente = pode_gerenciar_modelos(current_user)
    mostrar_inativas = incluir_inativas and gerente

    contagem = db.query(Modelo.categoria_id, func.count(Modelo.id))
    if not mostrar_inativas:
        contagem = contagem.filter(Modelo.ativo.is_(True))
    totais = dict(contagem.group_by(Modelo.categoria_id).all())

    query = db.query(Categoria)
    if not mostrar_inativas:
        query = query.filter(Categoria.ativa.is_(True))
    categorias = query.order_by(Categoria.ordem, Categoria.nome).all()
    return SuccessResponse(data=[_out(c, totais.get(c.id, 0)) for c in categorias])


@router.post("", response_model=SuccessResponse[CategoriaOut], status_code=201)
def criar(
    data: CategoriaCreate,
    db: Session = Depends(get_db),
    _: Usuario = Depends(require_permissao("categorias", "criar")),
):
    nome = data.nome.strip()
    _nome_livre(db, nome)
    categoria = Categoria(
        nome=nome, slug=_slug_unico(db, nome), descricao=data.descricao, ordem=data.ordem, ativa=data.ativa
    )
    db.add(categoria)
    db.commit()
    db.refresh(categoria)
    return SuccessResponse(data=_out(categoria, 0))


@router.put("/{categoria_id}", response_model=SuccessResponse[CategoriaOut])
def atualizar(
    categoria_id: int,
    data: CategoriaUpdate,
    db: Session = Depends(get_db),
    _: Usuario = Depends(require_permissao("categorias", "editar")),
):
    categoria = db.get(Categoria, categoria_id)
    if not categoria:
        raise NotFoundException("Categoria não encontrada")
    payload = data.model_dump(exclude_unset=True)
    if payload.get("nome"):
        nome = payload["nome"].strip()
        _nome_livre(db, nome, categoria.id)
        if nome != categoria.nome:
            categoria.nome = nome
            categoria.slug = _slug_unico(db, nome, categoria.id)
            db.flush()
            # O nome da categoria entra na busca dos modelos dela.
            ModeloService(db).reindexar_categoria(categoria.id)
    if "descricao" in payload:
        categoria.descricao = payload["descricao"]
    if payload.get("ordem") is not None:
        categoria.ordem = payload["ordem"]
    if payload.get("ativa") is not None:
        categoria.ativa = payload["ativa"]
    db.commit()
    db.refresh(categoria)
    total = db.query(Modelo).filter(Modelo.categoria_id == categoria.id).count()
    return SuccessResponse(data=_out(categoria, total))


@router.delete("/{categoria_id}", status_code=204)
def excluir(
    categoria_id: int,
    db: Session = Depends(get_db),
    _: Usuario = Depends(require_permissao("categorias", "excluir")),
):
    categoria = db.get(Categoria, categoria_id)
    if not categoria:
        raise NotFoundException("Categoria não encontrada")
    if db.query(Modelo).filter(Modelo.categoria_id == categoria.id).count():
        raise ConflictException(
            "A categoria tem modelos. Mova-os para outra categoria ou desative a categoria."
        )
    db.delete(categoria)
    db.commit()
