import { agruparPorCategoria, contarStatus } from "./biblioteca";

const m = (id, catId, status = null) => ({ id, status, categoria: { id: catId, nome: `C${catId}` } });

it("agrupa preservando a ordem do backend", () => {
  const grupos = agruparPorCategoria([m(1, 2), m(2, 2), m(3, 1)]);
  expect(grupos.map((g) => g.categoria.id)).toEqual([2, 1]);
  expect(grupos[0].modelos.map((x) => x.id)).toEqual([1, 2]);
});

it("conta novidades", () => {
  expect(contarStatus([m(1, 1, "novo"), m(2, 1, "atualizado"), m(3, 1, "novo"), m(4, 1)])).toEqual({
    novo: 2,
    atualizado: 1,
  });
});
