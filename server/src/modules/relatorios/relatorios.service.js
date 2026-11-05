import { q } from '../../db/pool.js';
import { LIMITE } from '../../config/constantes.js';
import { likeDe, where } from '../../lib/sql.js';

export async function movimentacoes(f) {
  const w = where();
  if (f.de) w.add('m.data >= ?::date', f.de);
  if (f.ate) w.add('m.data < ?::date + 1', f.ate);
  if (f.tipo) w.add('m.tipo = ?', f.tipo);
  if (f.busca)
    w.add(
      '(e.patrimonio ILIKE ? OR e.tipo ILIKE ? OR e.marca ILIKE ? OR c.nome ILIKE ? OR m.setor ILIKE ? OR m.chamado ILIKE ?)',
      likeDe(f.busca),
    );
  if (f.filial_id) w.add('(m.filial_origem_id = ? OR m.filial_destino_id = ?)', f.filial_id);
  return (
    await q(
      `SELECT m.id,m.data,m.tipo,m.quantidade,m.setor,m.chamado,m.observacao, COALESCE(e.patrimonio,'-') patrimonio, COALESCE(NULLIF(TRIM(e.tipo||' '||COALESCE(e.marca,'')),''),c.nome) item, fo.nome origem, fd.nome destino, u.nome usuario
  FROM movimentacoes m LEFT JOIN equipamentos e ON e.id=m.equipamento_id LEFT JOIN consumiveis c ON c.id=m.consumivel_id
  LEFT JOIN filiais fo ON fo.id=m.filial_origem_id LEFT JOIN filiais fd ON fd.id=m.filial_destino_id LEFT JOIN usuarios u ON u.id=m.usuario_id
  ${w.sql()} ORDER BY m.data DESC LIMIT ${LIMITE.movimentacoes}`,
      w.p,
    )
  ).rows;
}

export async function quantitativo() {
  const eq = await q(
    `SELECT e.tipo, e.status, COALESCE(f.nome,'-') filial, COUNT(*)::int total FROM equipamentos e LEFT JOIN filiais f ON f.id=e.filial_atual_id GROUP BY 1,2,3 ORDER BY 1,2`,
  );
  const co = await q(`SELECT tipo, nome, quantidade, minimo, (quantidade<=minimo) baixo FROM consumiveis WHERE ativo ORDER BY tipo,nome`);
  return { equipamentos: eq.rows, consumiveis: co.rows };
}
