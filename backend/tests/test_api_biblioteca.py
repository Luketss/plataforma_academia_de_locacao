API = "/api/v1"


def criar_categoria(client, headers, nome="Contratos", **kw):
    r = client.post(f"{API}/categorias", json={"nome": nome, **kw}, headers=headers)
    assert r.status_code == 201, r.text
    return r.json()["data"]


def criar_modelo(client, headers, categoria_id, **kw):
    payload = {"titulo": "Contrato residencial", "categoria_id": categoria_id, **kw}
    r = client.post(f"{API}/modelos", json=payload, headers=headers)
    assert r.status_code == 201, r.text
    return r.json()["data"]


def test_mentorado_nao_cria_nem_edita(client, admin, mentorado):
    cat = criar_categoria(client, admin)
    assert client.post(f"{API}/categorias", json={"nome": "X"}, headers=mentorado).status_code == 403
    r = client.post(f"{API}/modelos", json={"titulo": "X", "categoria_id": cat["id"]}, headers=mentorado)
    assert r.status_code == 403


def test_gerente_gerencia_biblioteca_mas_nao_pagina_inicial(client, gerente):
    cat = criar_categoria(client, gerente)
    criar_modelo(client, gerente, cat["id"])
    assert client.put(f"{API}/conteudo", json={"mentor_nome": "X"}, headers=gerente).status_code == 403


def test_busca_sem_acento_e_por_palavra_chave(client, admin, mentorado):
    cat = criar_categoria(client, admin, "Notificações")
    criar_modelo(client, admin, cat["id"], titulo="Notificação extrajudicial", palavras_chave=["inadimplência"])
    criar_modelo(client, admin, cat["id"], titulo="Acordo de pagamento", descricao="Parcelamento de débitos")

    def buscar(q):
        r = client.get(f"{API}/modelos", params={"q": q}, headers=mentorado)
        return [m["titulo"] for m in r.json()["items"]]

    assert buscar("notificacao") == ["Notificação extrajudicial"]
    assert buscar("INADIMPLENCIA") == ["Notificação extrajudicial"]
    assert buscar("debitos parcelamento") == ["Acordo de pagamento"]
    assert sorted(buscar("notificacoes")) == ["Acordo de pagamento", "Notificação extrajudicial"]  # nome da categoria
    assert buscar("100%") == []  # curinga escapado


def test_filtro_por_categoria(client, admin, mentorado):
    a = criar_categoria(client, admin, "Cat A")
    b = criar_categoria(client, admin, "Cat B")
    criar_modelo(client, admin, a["id"], titulo="Mod A")
    criar_modelo(client, admin, b["id"], titulo="Mod B")
    r = client.get(f"{API}/modelos", params={"categoria_id": b["id"]}, headers=mentorado).json()
    assert [m["titulo"] for m in r["items"]] == ["Mod B"]


def test_inativos_ocultos_para_mentorado(client, admin, mentorado):
    cat = criar_categoria(client, admin)
    m = criar_modelo(client, admin, cat["id"], ativo=False)
    cat2 = criar_categoria(client, admin, "Oculta", ativa=False)
    criar_modelo(client, admin, cat2["id"], titulo="Em categoria oculta")

    lista = client.get(f"{API}/modelos", params={"incluir_inativos": True}, headers=mentorado).json()
    assert lista["total"] == 0
    assert client.get(f"{API}/modelos/{m['id']}", headers=mentorado).status_code == 404
    assert client.get(f"{API}/modelos/{m['id']}/arquivo", headers=mentorado).status_code == 404
    cats = client.get(f"{API}/categorias", params={"incluir_inativas": True}, headers=mentorado).json()["data"]
    assert [c["nome"] for c in cats] == ["Contratos"]

    admin_lista = client.get(f"{API}/modelos", params={"incluir_inativos": True}, headers=admin).json()
    assert admin_lista["total"] == 2


def test_selos_novo_e_atualizado_por_usuario(client, admin, mentorado):
    cat = criar_categoria(client, admin)
    m = criar_modelo(client, admin, cat["id"], conteudo="v1")

    def status():
        return client.get(f"{API}/modelos", headers=mentorado).json()["items"][0]["status"]

    assert status() == "novo"
    detalhe = client.get(f"{API}/modelos/{m['id']}", headers=mentorado).json()["data"]
    assert detalhe["status"] == "novo"  # status de antes desta visita
    assert status() is None

    # correção cosmética sem subir versão
    client.put(f"{API}/modelos/{m['id']}", json={"descricao": "typo"}, headers=admin)
    assert status() is None

    r = client.put(
        f"{API}/modelos/{m['id']}", json={"conteudo": "v2", "nota_atualizacao": "Nova cláusula"}, headers=admin
    )
    assert r.json()["data"]["versao"] == 2
    assert status() == "atualizado"
    assert client.get(f"{API}/modelos", params={"status": "atualizado"}, headers=mentorado).json()["total"] == 1
    d = client.get(f"{API}/modelos/{m['id']}", headers=mentorado).json()["data"]
    assert d["status"] == "atualizado" and d["nota_atualizacao"] == "Nova cláusula"
    assert status() is None

    # forçar/suprimir nova versão
    r = client.put(f"{API}/modelos/{m['id']}", json={"conteudo": "v3", "registrar_atualizacao": False}, headers=admin)
    assert r.json()["data"]["versao"] == 2
    r = client.put(f"{API}/modelos/{m['id']}", json={"registrar_atualizacao": True}, headers=admin)
    assert r.json()["data"]["versao"] == 3


def test_upload_download_e_substituicao_de_arquivo(client, admin, mentorado, db):
    from app.models.arquivo import Arquivo

    cat = criar_categoria(client, admin)
    m = criar_modelo(client, admin, cat["id"])
    r = client.post(
        f"{API}/modelos/{m['id']}/arquivo",
        files={"arquivo": ("Contrato Locação.pdf", b"%PDF-1.4 teste", "application/octet-stream")},
        headers=admin,
    )
    assert r.status_code == 200, r.text
    d = r.json()["data"]
    assert d["arquivo"]["content_type"] == "application/pdf"  # pela extensão, não pelo cliente
    assert d["versao"] == 2

    dl = client.get(f"{API}/modelos/{m['id']}/arquivo", headers=mentorado)
    assert dl.status_code == 200 and dl.content == b"%PDF-1.4 teste"
    assert dl.headers["content-disposition"].startswith("attachment;")
    assert "filename*=UTF-8''Contrato%20Loca%C3%A7%C3%A3o.pdf" in dl.headers["content-disposition"]
    inline = client.get(f"{API}/modelos/{m['id']}/arquivo", params={"inline": True}, headers=mentorado)
    assert inline.headers["content-disposition"].startswith("inline;")

    # busca pelo nome do arquivo
    assert client.get(f"{API}/modelos", params={"q": "locacao"}, headers=mentorado).json()["total"] == 1

    r = client.post(
        f"{API}/modelos/{m['id']}/arquivo",
        files={"arquivo": ("novo.docx", b"PK docx", "application/pdf")},
        data={"registrar_atualizacao": "false"},
        headers=admin,
    )
    assert r.json()["data"]["versao"] == 2
    assert db.query(Arquivo).count() == 1  # o anterior foi apagado
    # docx nunca abre inline
    inline = client.get(f"{API}/modelos/{m['id']}/arquivo", params={"inline": True}, headers=mentorado)
    assert inline.headers["content-disposition"].startswith("attachment;")

    assert client.delete(f"{API}/modelos/{m['id']}/arquivo", headers=admin).status_code == 200
    assert db.query(Arquivo).count() == 0


def test_upload_tipo_proibido(client, admin):
    cat = criar_categoria(client, admin)
    m = criar_modelo(client, admin, cat["id"])
    r = client.post(
        f"{API}/modelos/{m['id']}/arquivo", files={"arquivo": ("x.exe", b"MZ", "application/pdf")}, headers=admin
    )
    assert r.status_code == 422


def test_link_externo_validado(client, admin):
    cat = criar_categoria(client, admin)
    r = client.post(
        f"{API}/modelos",
        json={"titulo": "X", "categoria_id": cat["id"], "link_externo": "javascript:alert(1)"},
        headers=admin,
    )
    assert r.status_code == 422


def test_categoria_com_modelos_nao_exclui_e_renomear_reindexa(client, admin):
    cat = criar_categoria(client, admin, "Antiga")
    m = criar_modelo(client, admin, cat["id"], titulo="Modelo X")
    assert client.delete(f"{API}/categorias/{cat['id']}", headers=admin).status_code == 409
    r = client.put(f"{API}/categorias/{cat['id']}", json={"nome": "Vistorias"}, headers=admin)
    assert r.json()["data"]["slug"] == "vistorias"
    assert client.get(f"{API}/modelos", params={"q": "vistorias"}, headers=admin).json()["total"] == 1
    assert client.delete(f"{API}/modelos/{m['id']}", headers=admin).status_code == 204
    assert client.delete(f"{API}/categorias/{cat['id']}", headers=admin).status_code == 204


def test_categoria_nome_duplicado(client, admin):
    criar_categoria(client, admin, "Contratos")
    r = client.post(f"{API}/categorias", json={"nome": "contratos"}, headers=admin)
    assert r.status_code == 409


def test_excluir_modelo_visto_remove_visualizacoes(client, admin, mentorado):
    cat = criar_categoria(client, admin)
    m = criar_modelo(client, admin, cat["id"])
    client.get(f"{API}/modelos/{m['id']}", headers=mentorado)
    assert client.delete(f"{API}/modelos/{m['id']}", headers=admin).status_code == 204


def test_pagina_inicial_e_foto(client, admin, mentorado):
    r = client.put(f"{API}/conteudo", json={"mentor_nome": "Fulano", "metodologia": "## Passos"}, headers=admin)
    assert r.status_code == 200
    d = client.get(f"{API}/conteudo", headers=mentorado).json()["data"]
    assert d["mentor_nome"] == "Fulano" and d["tem_foto"] is False
    assert client.get(f"{API}/conteudo/foto", headers=mentorado).status_code == 404

    r = client.post(f"{API}/conteudo/foto", files={"arquivo": ("eu.png", b"\x89PNG", "image/png")}, headers=admin)
    assert r.json()["data"]["tem_foto"] is True
    foto = client.get(f"{API}/conteudo/foto", headers=mentorado)
    assert foto.status_code == 200 and foto.headers["content-type"] == "image/png"

    r = client.post(f"{API}/conteudo/foto", files={"arquivo": ("eu.pdf", b"%PDF", "image/png")}, headers=admin)
    assert r.status_code == 422
    assert client.post(
        f"{API}/conteudo/foto", files={"arquivo": ("eu.png", b"\x89PNG", "image/png")}, headers=mentorado
    ).status_code == 403
    assert client.delete(f"{API}/conteudo/foto", headers=admin).json()["data"]["tem_foto"] is False


def test_rotas_exigem_autenticacao(client):
    for path in ("/modelos", "/categorias", "/conteudo", "/usuarios", "/auth/me"):
        assert client.get(f"{API}{path}").status_code == 401
