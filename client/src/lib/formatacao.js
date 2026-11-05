export const fd = d => {
  if (!d) return '-';
  if (/^\d{4}-\d{2}-\d{2}$/.test(d)) return d.split('-').reverse().join('/');
  return new Date(d).toLocaleDateString('pt-BR');
};

export const clean = v => Object.fromEntries(Object.entries(v).filter(([, x]) => x !== '' && x != null));

export const infoLista = (rows, s, p) => {
  const n = rows.length,
    tot = rows[0]?.total_filtrado;
  return !n
    ? `Nenhum ${s} encontrado`
    : `Mostrando ${n}${tot > n ? ' de ' + tot : ''} ${n === 1 ? s : p} ${n === 1 ? 'encontrado' : 'encontrados'}${tot > n ? ' — refine os filtros para ver os demais' : ''}`;
};

export const cont = (rows, s, p) =>
  rows.length
    ? `${rows.length}${rows[0].total_filtrado > rows.length ? ' de ' + rows[0].total_filtrado + ' (refine os filtros)' : ''} ${rows.length === 1 ? s : p}`
    : `Nenhum ${s} encontrado`;
