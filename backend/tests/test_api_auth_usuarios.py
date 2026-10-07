from datetime import datetime, timedelta, timezone

from tests.conftest import SENHA

API = "/api/v1"


def test_login_e_me(client, criar_usuario, login):
    criar_usuario("Ana@X.com".lower(), "GERENTE", nome="Ana")
    headers = login("ANA@x.com")  # e-mail sem diferenciar caixa
    me = client.get(f"{API}/auth/me", headers=headers).json()["data"]
    assert me["role"] == "GERENTE"
    assert me["acesso_admin"] is True
    assert "conteudo" not in me["permissoes"]


def test_login_invalido_mensagem_generica(client, criar_usuario):
    criar_usuario("a@x.com")
    r1 = client.post(f"{API}/auth/login", data={"username": "a@x.com", "password": "errada"})
    r2 = client.post(f"{API}/auth/login", data={"username": "nao@x.com", "password": "errada"})
    assert r1.status_code == r2.status_code == 401
    assert r1.json()["error"]["message"] == r2.json()["error"]["message"]


def test_usuario_bloqueado_ou_expirado_nao_loga(client, criar_usuario):
    criar_usuario("b@x.com", ativo=False)
    criar_usuario("e@x.com", acesso_expira_em=datetime.now(timezone.utc) - timedelta(days=1))
    for email in ("b@x.com", "e@x.com"):
        r = client.post(f"{API}/auth/login", data={"username": email, "password": SENHA})
        assert r.status_code == 401


def test_bloqueio_derruba_token_ja_emitido(client, admin, criar_usuario, login):
    u = criar_usuario("m@x.com")
    headers = login("m@x.com")
    assert client.get(f"{API}/auth/me", headers=headers).status_code == 200
    client.put(f"{API}/usuarios/{u.id}", json={"ativo": False}, headers=admin)
    assert client.get(f"{API}/auth/me", headers=headers).status_code == 401


def test_refresh_token_nao_vale_como_access(client, criar_usuario):
    criar_usuario("r@x.com")
    tokens = client.post(f"{API}/auth/login", data={"username": "r@x.com", "password": SENHA}).json()
    bad = {"Authorization": f"Bearer {tokens['refresh_token']}"}
    assert client.get(f"{API}/auth/me", headers=bad).status_code == 401
    novo = client.post(f"{API}/auth/refresh", json={"refresh_token": tokens["refresh_token"]})
    assert novo.status_code == 200 and novo.json()["access_token"]


def test_alterar_senha(client, criar_usuario, login):
    criar_usuario("s@x.com")
    h = login("s@x.com")
    r = client.post(f"{API}/auth/alterar-senha", json={"senha_atual": "x", "nova_senha": "nova-senha-123"}, headers=h)
    assert r.status_code == 422
    r = client.post(f"{API}/auth/alterar-senha", json={"senha_atual": SENHA, "nova_senha": "nova-senha-123"}, headers=h)
    assert r.status_code == 200
    login("s@x.com", "nova-senha-123")


def test_mentorado_nao_acessa_gestao_de_usuarios(client, mentorado):
    assert client.get(f"{API}/usuarios", headers=mentorado).status_code == 403
    r = client.post(
        f"{API}/usuarios", json={"nome": "X", "email": "x@x.com", "senha": "12345678"}, headers=mentorado
    )
    assert r.status_code == 403
    assert client.get(f"{API}/roles", headers=mentorado).status_code == 403


def test_gerente_so_cria_e_ve_mentorados(client, gerente, criar_usuario):
    criar_usuario("outro-admin@x.com", "ADMIN_GLOBAL")
    r = client.post(
        f"{API}/usuarios",
        json={"nome": "Mentorado", "email": "novo@x.com", "senha": "12345678", "role": "USUARIO"},
        headers=gerente,
    )
    assert r.status_code == 201
    r = client.post(
        f"{API}/usuarios",
        json={"nome": "Escalada", "email": "esc@x.com", "senha": "12345678", "role": "ADMIN_GLOBAL"},
        headers=gerente,
    )
    assert r.status_code == 403
    emails = {u["email"] for u in client.get(f"{API}/usuarios", headers=gerente).json()["items"]}
    assert emails == {"novo@x.com"}


def test_gerente_nao_altera_admin_nem_promove_mentorado(client, gerente, criar_usuario):
    adm = criar_usuario("adm2@x.com", "ADMIN_GLOBAL")
    men = criar_usuario("men@x.com")
    assert client.put(f"{API}/usuarios/{adm.id}", json={"ativo": False}, headers=gerente).status_code == 403
    assert client.delete(f"{API}/usuarios/{adm.id}", headers=gerente).status_code == 403
    assert client.put(f"{API}/usuarios/{men.id}", json={"role": "GERENTE"}, headers=gerente).status_code == 403
    r = client.put(f"{API}/usuarios/{men.id}", json={"ativo": False}, headers=gerente)
    assert r.status_code == 200 and r.json()["data"]["ativo"] is False


def test_admin_cria_gerente_e_nao_se_bloqueia(client, admin, db):
    from app.models.usuario import Usuario

    r = client.post(
        f"{API}/usuarios",
        json={"nome": "Gil", "email": "g2@x.com", "senha": "12345678", "role": "GERENTE"},
        headers=admin,
    )
    assert r.status_code == 201 and r.json()["data"]["role"] == "GERENTE"
    me = db.query(Usuario).filter(Usuario.email == "admin@x.com").one()
    assert client.put(f"{API}/usuarios/{me.id}", json={"ativo": False}, headers=admin).status_code == 403
    assert client.delete(f"{API}/usuarios/{me.id}", headers=admin).status_code == 403


def test_ultimo_admin_global_nao_pode_ser_rebaixado(client, admin, criar_usuario, login, db):
    from app.models.usuario import Usuario

    criar_usuario("adm2@x.com", "ADMIN_GLOBAL")
    h2 = login("adm2@x.com")
    me = db.query(Usuario).filter(Usuario.email == "admin@x.com").one()
    # adm2 rebaixa admin → ok (ainda resta adm2)
    assert client.put(f"{API}/usuarios/{me.id}", json={"role": "GERENTE"}, headers=h2).status_code == 200
    # agora adm2 é o único — ninguém consegue removê-lo (nem ele mesmo)
    adm2 = db.query(Usuario).filter(Usuario.email == "adm2@x.com").one()
    assert client.delete(f"{API}/usuarios/{adm2.id}", headers=h2).status_code == 403


def test_email_duplicado(client, admin):
    payload = {"nome": "Ana", "email": "dup@x.com", "senha": "12345678"}
    assert client.post(f"{API}/usuarios", json=payload, headers=admin).status_code == 201
    assert client.post(f"{API}/usuarios", json={**payload, "email": "DUP@x.com"}, headers=admin).status_code == 409


def test_roles_marca_atribuiveis(client, gerente):
    roles = {r["nome"]: r["atribuivel"] for r in client.get(f"{API}/roles", headers=gerente).json()["data"]}
    assert roles == {"ADMIN_GLOBAL": False, "GERENTE": False, "USUARIO": True}


def test_busca_de_usuarios_por_nome_e_email(client, admin, criar_usuario):
    criar_usuario("joao@x.com", nome="João Silva")
    criar_usuario("maria@x.com", nome="Maria")
    nomes = lambda q: [u["nome"] for u in client.get(f"{API}/usuarios", params={"q": q}, headers=admin).json()["items"]]  # noqa: E731
    assert nomes("joão") == ["João Silva"]
    assert nomes("MARIA@") == ["Maria"]
    assert nomes("%") == []
