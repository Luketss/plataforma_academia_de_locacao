from app.core.datas import agora
from app.models.arquivo import Arquivo
from app.models.conteudo import ConteudoSite
from app.schemas.conteudo import ConteudoOut, ConteudoUpdate
from sqlalchemy.orm import Session

# Textos editáveis da página inicial.
CHAVES = (
    "mentor_nome",
    "mentor_titulo",
    "mentor_curriculo",
    "academia_apresentacao",
    "metodologia",
    "objetivo_plataforma",
)
CHAVE_FOTO = "mentor_foto_arquivo_id"


class ConteudoService:
    def __init__(self, db: Session):
        self.db = db

    def _mapa(self) -> dict[str, ConteudoSite]:
        return {c.chave: c for c in self.db.query(ConteudoSite).all()}

    def obter(self) -> ConteudoOut:
        mapa = self._mapa()
        datas = [c.atualizado_em for c in mapa.values()]
        return ConteudoOut(
            **{k: mapa[k].valor if k in mapa else None for k in CHAVES},
            tem_foto=bool(mapa.get(CHAVE_FOTO) and mapa[CHAVE_FOTO].valor),
            atualizado_em=max(datas) if datas else None,
        )

    def _set(self, mapa: dict[str, ConteudoSite], chave: str, valor: str | None) -> None:
        item = mapa.get(chave)
        if item is None:
            self.db.add(ConteudoSite(chave=chave, valor=valor, atualizado_em=agora()))
        else:
            item.valor = valor
            item.atualizado_em = agora()

    def atualizar(self, data: ConteudoUpdate) -> ConteudoOut:
        mapa = self._mapa()
        for chave, valor in data.model_dump(exclude_unset=True).items():
            self._set(mapa, chave, valor)
        self.db.commit()
        return self.obter()

    def foto(self) -> Arquivo | None:
        item = self.db.get(ConteudoSite, CHAVE_FOTO)
        if not item or not item.valor:
            return None
        return self.db.get(Arquivo, int(item.valor))

    def definir_foto(self, arquivo: Arquivo | None) -> None:
        antiga = self.foto()
        self._set(self._mapa(), CHAVE_FOTO, str(arquivo.id) if arquivo else None)
        self.db.flush()
        if antiga and (arquivo is None or antiga.id != arquivo.id):
            self.db.delete(antiga)
        self.db.commit()
