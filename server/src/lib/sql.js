export const likeDe = v => '%' + v.replace(/[\\%_]/g, '\\$&') + '%';

export const where = () => {
  const w = [];
  const p = [];
  return {
    add(sql, valor) {
      p.push(valor);
      w.push(sql.replaceAll('?', () => '$' + p.length));
    },
    raw: sql => w.push(sql),
    p,
    sql: () => (w.length ? 'WHERE ' + w.join(' AND ') : ''),
  };
};
