// Agrupa a lista (já ordenada por categoria pelo backend) no índice por assunto.
export function agruparPorCategoria(modelos) {
  const grupos = [];
  const porId = new Map();
  for (const m of modelos || []) {
    let g = porId.get(m.categoria.id);
    if (!g) {
      g = { categoria: m.categoria, modelos: [] };
      porId.set(m.categoria.id, g);
      grupos.push(g);
    }
    g.modelos.push(m);
  }
  return grupos;
}

export function contarStatus(modelos) {
  const c = { novo: 0, atualizado: 0 };
  for (const m of modelos || []) if (m.status) c[m.status] += 1;
  return c;
}
