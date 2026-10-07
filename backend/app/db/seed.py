"""Seed idempotente.

    python -m app.db.seed            # cria o admin global inicial (se não houver)
    python -m app.db.seed --demo     # + categorias, modelos e textos de exemplo

Admin inicial via env: ADMIN_EMAIL, ADMIN_SENHA (obrigatórias), ADMIN_NOME.
Roda no start do container depois do `alembic upgrade head`; sem as variáveis
apenas avisa e segue.
"""

import logging
import os
import sys

import app.models  # noqa: F401
from app.core.permissions import ADMIN_GLOBAL
from app.core.security import hash_password
from app.db.session import SessionLocal
from app.models.categoria import Categoria
from app.models.conteudo import ConteudoSite
from app.models.role import Role
from app.models.usuario import Usuario
from app.schemas.modelo import ModeloCreate
from app.services.modelo_service import ModeloService
from sqlalchemy.orm import Session

log = logging.getLogger("seed")

CONTEUDO_DEMO = {
    "mentor_nome": "Nome do Mentor",
    "mentor_titulo": "Fundador da Academia de Locação",
    "mentor_curriculo": (
        "Edite este texto em Administração → Página inicial.\n\n"
        "- Mais de 15 anos de experiência em administração de imóveis\n"
        "- Responsável por carteiras com centenas de contratos ativos\n"
        "- Mentor de imobiliárias e administradores em todo o Brasil"
    ),
    "academia_apresentacao": (
        "A **Academia de Locação** forma imobiliárias e profissionais para "
        "administrar locações com processos claros, segurança jurídica e rentabilidade."
    ),
    "metodologia": (
        "## Como a mentoria funciona\n"
        "- Diagnóstico da operação de locação\n"
        "- Padronização de processos com modelos prontos\n"
        "- Acompanhamento e melhoria contínua"
    ),
    "objetivo_plataforma": (
        "Esta plataforma reúne, em um só lugar, todos os modelos usados na mentoria — "
        "sempre na versão mais atual. Use a busca ou navegue pelas categorias."
    ),
}

CATEGORIAS_DEMO = [
    ("Contratos", "Contratos de locação, aditivos e distratos."),
    ("Captação de imóveis", "Roteiros, fichas e autorizações para captar imóveis."),
    ("Vistorias", "Laudos e checklists de vistoria de entrada e saída."),
    ("Notificações e cobrança", "Notificações extrajudiciais, cobrança e acordos."),
    ("Atendimento", "Scripts e mensagens para proprietários e inquilinos."),
]

MODELOS_DEMO = [
    (
        "Contratos",
        "Contrato de locação residencial",
        "Modelo completo de contrato residencial com cláusulas de garantia e reajuste.",
        ["contrato", "residencial", "garantia", "reajuste"],
    ),
    (
        "Vistorias",
        "Checklist de vistoria de entrada",
        "Lista de verificação cômodo a cômodo para a vistoria inicial.",
        ["vistoria", "checklist", "entrada"],
    ),
    (
        "Notificações e cobrança",
        "Notificação extrajudicial de atraso",
        "Notificação para inquilino com aluguel em atraso.",
        ["notificação", "inadimplência", "cobrança"],
    ),
]


def garantir_admin(db: Session) -> None:
    role = db.query(Role).filter(Role.nome == ADMIN_GLOBAL).first()
    if role is None:
        log.error("Papéis não encontrados — rode `alembic upgrade head` antes do seed.")
        sys.exit(1)
    if db.query(Usuario).filter(Usuario.role_id == role.id).first():
        return
    email, senha = os.getenv("ADMIN_EMAIL", "").strip(), os.getenv("ADMIN_SENHA", "")
    if not email or not senha:
        log.warning("Nenhum ADMIN_GLOBAL cadastrado e ADMIN_EMAIL/ADMIN_SENHA ausentes; admin não criado.")
        return
    db.add(
        Usuario(
            nome=os.getenv("ADMIN_NOME", "Administrador"),
            email=email.lower(),
            senha_hash=hash_password(senha),
            role_id=role.id,
            ativo=True,
        )
    )
    db.commit()
    log.info("Admin global criado: %s", email)


def seed_demo(db: Session) -> None:
    for chave, valor in CONTEUDO_DEMO.items():
        if not db.get(ConteudoSite, chave):
            db.add(ConteudoSite(chave=chave, valor=valor))
    for ordem, (nome, descricao) in enumerate(CATEGORIAS_DEMO):
        if not db.query(Categoria).filter(Categoria.nome == nome).first():
            from app.core.texto import slugify

            db.add(Categoria(nome=nome, slug=slugify(nome), descricao=descricao, ordem=ordem))
    db.commit()

    from app.models.modelo import Modelo

    if db.query(Modelo).count():
        return
    admin = db.query(Usuario).join(Usuario.role).filter(Role.nome == ADMIN_GLOBAL).first()
    if admin is None:
        log.warning("Sem admin global; modelos de exemplo não criados.")
        return
    service = ModeloService(db)
    for categoria_nome, titulo, descricao, palavras in MODELOS_DEMO:
        categoria = db.query(Categoria).filter(Categoria.nome == categoria_nome).one()
        service.criar(
            ModeloCreate(
                titulo=titulo,
                descricao=descricao,
                conteudo=f"## {titulo}\n\n{descricao}\n\n- Substitua este texto pelo modelo real.",
                palavras_chave=palavras,
                categoria_id=categoria.id,
            ),
            admin,
        )
    log.info("Conteúdo de demonstração criado.")


def main() -> None:
    logging.basicConfig(level=logging.INFO, format="%(levelname)s %(name)s: %(message)s")
    db = SessionLocal()
    try:
        garantir_admin(db)
        if "--demo" in sys.argv:
            seed_demo(db)
    finally:
        db.close()


if __name__ == "__main__":
    main()
