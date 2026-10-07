from app.core.config import settings
from app.core.datas import agora
from app.core.exceptions import NotFoundException, ValidationException
from app.core.permissions import tem_permissao
from app.core.texto import normalizar, normalizar_palavras_chave, termos_busca
from app.models.arquivo import Arquivo
from app.models.categoria import Categoria
from app.models.modelo import Modelo
from app.models.usuario import Usuario
from app.models.visualizacao import ModeloVisualizacao
from app.schemas.modelo import (
    ArquivoOut,
    CategoriaResumo,
    ModeloCreate,
    ModeloDetalhe,
    ModeloResumo,
    ModeloUpdate,
)
from app.services.novidades import calcular_status
from sqlalchemy import select
from sqlalchemy.orm import Session

# Campos cuja mudança conta como nova versão do modelo.
CAMPOS_CONTEUDO = ("conteudo", "link_externo")

ORDENACOES = ("titulo", "recentes")


def pode_gerenciar_modelos(user: Usuario) -> bool:
    return tem_permissao(user.role, "modelos", "editar")


def montar_busca_texto(modelo: Modelo, categoria: Categoria | None) -> str:
    partes = [
        modelo.titulo,
        modelo.descricao,
        " ".join(modelo.palavras_chave or []),
        categoria.nome if categoria else "",
        modelo.conteudo,
        modelo.arquivo.nome_original if modelo.arquivo else "",
    ]
    return normalizar(" ".join(p for p in partes if p))


class ModeloService:
    def __init__(self, db: Session):
        self.db = db

    # ── leitura ──────────────────────────────────────────────────────────────

    def _versoes_vistas(self, usuario_id: int, ids: list[int] | None = None) -> dict[int, int]:
        stmt = select(ModeloVisualizacao.modelo_id, ModeloVisualizacao.versao_vista).where(
            ModeloVisualizacao.usuario_id == usuario_id
        )
        if ids is not None:
            stmt = stmt.where(ModeloVisualizacao.modelo_id.in_(ids))
        return dict(self.db.execute(stmt).all())

    def _status(self, modelo: Modelo, versao_vista: int | None) -> str | None:
        return calcular_status(
            modelo.criado_em,
            modelo.conteudo_atualizado_em,
            modelo.versao,
            versao_vista,
            agora(),
            settings.NOVIDADE_DIAS,
        )

    @staticmethod
    def _resumo_kwargs(m: Modelo, status: str | None) -> dict:
        return dict(
            id=m.id,
            titulo=m.titulo,
            descricao=m.descricao,
            palavras_chave=list(m.palavras_chave or []),
            categoria=CategoriaResumo(id=m.categoria.id, nome=m.categoria.nome, slug=m.categoria.slug),
            ativo=m.ativo,
            destaque=m.destaque,
            versao=m.versao,
            tem_conteudo=bool((m.conteudo or "").strip()),
            tem_arquivo=m.arquivo_id is not None,
            tem_link=bool(m.link_externo),
            arquivo_tipo=m.arquivo.content_type if m.arquivo else None,
            criado_em=m.criado_em,
            conteudo_atualizado_em=m.conteudo_atualizado_em,
            status=status,
        )

    def listar(
        self,
        user: Usuario,
        q: str | None = None,
        categoria_id: int | None = None,
        status: str | None = None,
        incluir_inativos: bool = False,
        ordenar: str = "titulo",
        skip: int = 0,
        limit: int = 50,
    ) -> tuple[list[ModeloResumo], int]:
        stmt = select(Modelo).join(Modelo.categoria)

        # Inativos (modelo ou categoria) só aparecem para quem gerencia modelos
        # e pediu explicitamente — mentorado nunca vê.
        if not (incluir_inativos and pode_gerenciar_modelos(user)):
            stmt = stmt.where(Modelo.ativo.is_(True), Categoria.ativa.is_(True))

        if categoria_id is not None:
            stmt = stmt.where(Modelo.categoria_id == categoria_id)

        for termo in termos_busca(q):
            stmt = stmt.where(Modelo.busca_texto.contains(termo, autoescape=True))

        if ordenar == "recentes":
            stmt = stmt.order_by(Modelo.conteudo_atualizado_em.desc(), Modelo.id.desc())
        else:
            stmt = stmt.order_by(Categoria.ordem, Categoria.nome, Modelo.destaque.desc(), Modelo.titulo)

        modelos = list(self.db.execute(stmt).unique().scalars().all())
        vistas = self._versoes_vistas(user.id)

        itens = []
        for m in modelos:
            st = self._status(m, vistas.get(m.id))
            if status and st != status:
                continue
            itens.append(ModeloResumo(**self._resumo_kwargs(m, st)))

        # A biblioteca é pequena (centenas de itens): filtrar o status e paginar
        # em memória mantém a regra de novidade num lugar só (calcular_status).
        return itens[skip : skip + limit], len(itens)

    def obter(self, modelo_id: int) -> Modelo:
        modelo = self.db.get(Modelo, modelo_id)
        if not modelo:
            raise NotFoundException("Modelo não encontrado")
        return modelo

    def obter_visivel(self, user: Usuario, modelo_id: int) -> Modelo:
        modelo = self.obter(modelo_id)
        if not pode_gerenciar_modelos(user) and not (modelo.ativo and modelo.categoria.ativa):
            raise NotFoundException("Modelo não encontrado")
        return modelo

    def detalhe(self, user: Usuario, modelo_id: int, registrar_visualizacao: bool = True) -> ModeloDetalhe:
        modelo = self.obter_visivel(user, modelo_id)
        vista = self._versoes_vistas(user.id, [modelo.id]).get(modelo.id)
        # O status devolvido é o de ANTES desta visita, para a tela poder
        # mostrar "atualizado — veja o que mudou".
        status = self._status(modelo, vista)
        if registrar_visualizacao:
            self.registrar_visualizacao(user, modelo)
        arquivo = modelo.arquivo
        return ModeloDetalhe(
            **self._resumo_kwargs(modelo, status),
            conteudo=modelo.conteudo,
            link_externo=modelo.link_externo,
            nota_atualizacao=modelo.nota_atualizacao,
            arquivo=ArquivoOut(
                id=arquivo.id,
                nome_original=arquivo.nome_original,
                content_type=arquivo.content_type,
                tamanho=arquivo.tamanho,
            )
            if arquivo
            else None,
            atualizado_em=modelo.atualizado_em,
        )

    def registrar_visualizacao(self, user: Usuario, modelo: Modelo) -> None:
        vis = self.db.get(ModeloVisualizacao, (user.id, modelo.id))
        if vis is None:
            self.db.add(ModeloVisualizacao(usuario_id=user.id, modelo_id=modelo.id, versao_vista=modelo.versao))
        else:
            vis.versao_vista = modelo.versao
            vis.ultima_em = agora()
        self.db.commit()

    # ── escrita ──────────────────────────────────────────────────────────────

    def _categoria(self, categoria_id: int) -> Categoria:
        categoria = self.db.get(Categoria, categoria_id)
        if not categoria:
            raise ValidationException("Categoria inexistente.")
        return categoria

    def _reindexar(self, modelo: Modelo) -> None:
        modelo.busca_texto = montar_busca_texto(modelo, self.db.get(Categoria, modelo.categoria_id))

    def _nova_versao(self, modelo: Modelo, nota: str | None) -> None:
        modelo.versao = (modelo.versao or 1) + 1
        modelo.conteudo_atualizado_em = agora()
        modelo.nota_atualizacao = nota

    def criar(self, data: ModeloCreate, user: Usuario) -> Modelo:
        self._categoria(data.categoria_id)
        modelo = Modelo(
            titulo=data.titulo.strip(),
            descricao=data.descricao,
            conteudo=data.conteudo,
            palavras_chave=normalizar_palavras_chave(data.palavras_chave),
            link_externo=data.link_externo,
            categoria_id=data.categoria_id,
            ativo=data.ativo,
            destaque=data.destaque,
            versao=1,
            criado_por_id=user.id,
            atualizado_por_id=user.id,
        )
        self.db.add(modelo)
        self.db.flush()
        self._reindexar(modelo)
        self.db.commit()
        self.db.refresh(modelo)
        return modelo

    def atualizar(self, modelo_id: int, data: ModeloUpdate, user: Usuario) -> Modelo:
        modelo = self.obter(modelo_id)
        payload = data.model_dump(exclude_unset=True)
        registrar = payload.pop("registrar_atualizacao", None)
        nota = payload.pop("nota_atualizacao", None)

        if "categoria_id" in payload and payload["categoria_id"] is not None:
            self._categoria(payload["categoria_id"])
        if "titulo" in payload and payload["titulo"] is None:
            payload.pop("titulo")
        if "palavras_chave" in payload:
            payload["palavras_chave"] = normalizar_palavras_chave(payload["palavras_chave"])
        for campo in ("ativo", "destaque", "categoria_id"):
            if campo in payload and payload[campo] is None:
                payload.pop(campo)

        conteudo_mudou = any(
            campo in payload and (payload[campo] or None) != (getattr(modelo, campo) or None)
            for campo in CAMPOS_CONTEUDO
        )

        for campo, valor in payload.items():
            setattr(modelo, campo, valor.strip() if campo == "titulo" else valor)

        if registrar is True or (registrar is None and conteudo_mudou):
            self._nova_versao(modelo, nota)
        elif nota is not None:
            modelo.nota_atualizacao = nota

        modelo.atualizado_em = agora()
        modelo.atualizado_por_id = user.id
        self._reindexar(modelo)
        self.db.commit()
        self.db.refresh(modelo)
        return modelo

    def substituir_arquivo(
        self, modelo_id: int, arquivo: Arquivo, user: Usuario, registrar: bool = True, nota: str | None = None
    ) -> Modelo:
        modelo = self.obter(modelo_id)
        antigo_id = modelo.arquivo_id
        modelo.arquivo = arquivo
        self.db.flush()
        if antigo_id and antigo_id != arquivo.id:
            self.db.query(Arquivo).filter(Arquivo.id == antigo_id).delete()
        if registrar:
            self._nova_versao(modelo, nota)
        modelo.atualizado_em = agora()
        modelo.atualizado_por_id = user.id
        self._reindexar(modelo)
        self.db.commit()
        self.db.refresh(modelo)
        return modelo

    def remover_arquivo(self, modelo_id: int, user: Usuario) -> Modelo:
        modelo = self.obter(modelo_id)
        antigo_id = modelo.arquivo_id
        if antigo_id:
            modelo.arquivo = None
            self.db.flush()
            self.db.query(Arquivo).filter(Arquivo.id == antigo_id).delete()
            modelo.atualizado_em = agora()
            modelo.atualizado_por_id = user.id
            self._reindexar(modelo)
            self.db.commit()
            self.db.refresh(modelo)
        return modelo

    def excluir(self, modelo_id: int) -> None:
        modelo = self.obter(modelo_id)
        arquivo_id = modelo.arquivo_id
        self.db.query(ModeloVisualizacao).filter(ModeloVisualizacao.modelo_id == modelo.id).delete()
        self.db.delete(modelo)
        self.db.flush()
        if arquivo_id:
            self.db.query(Arquivo).filter(Arquivo.id == arquivo_id).delete()
        self.db.commit()

    def reindexar_categoria(self, categoria_id: int) -> None:
        for modelo in self.db.query(Modelo).filter(Modelo.categoria_id == categoria_id).all():
            self._reindexar(modelo)
