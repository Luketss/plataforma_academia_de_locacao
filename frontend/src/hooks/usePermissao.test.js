import { hasPermissao, temAcessoAdmin, temAlgumaPermissao } from "./usePermissao";

const admin = { role: "ADMIN_GLOBAL", permissoes: {}, acesso_admin: true };
const gerente = {
  role: "GERENTE",
  acesso_admin: true,
  permissoes: { modelos: ["criar", "editar", "excluir"], usuarios: ["criar"] },
};
const mentorado = { role: "USUARIO", permissoes: {}, acesso_admin: false };

it("admin global tem bypass", () => {
  expect(hasPermissao(admin, "conteudo", "editar")).toBe(true);
});

it("gerente respeita o mapa de permissões", () => {
  expect(hasPermissao(gerente, "modelos", "excluir")).toBe(true);
  expect(hasPermissao(gerente, "conteudo", "editar")).toBe(false);
  expect(temAlgumaPermissao(gerente, "usuarios")).toBe(true);
  expect(temAlgumaPermissao(gerente, "categorias")).toBe(false);
});

it("mentorado e anônimo não acessam o admin", () => {
  expect(temAcessoAdmin(mentorado)).toBe(false);
  expect(temAcessoAdmin(null)).toBe(false);
  expect(hasPermissao(null, "modelos", "criar")).toBe(false);
});
