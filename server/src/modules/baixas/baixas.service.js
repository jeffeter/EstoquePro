import { q, tx } from '../../db/pool.js';
import { LIMITE } from '../../config/constantes.js';
import { err } from '../../lib/erros.js';
import { likeDe, where } from '../../lib/sql.js';

export const SQL_BAIXAS = `SELECT b.*, e.patrimonio, e.tipo, e.marca, e.observacao, e.avarias, f.nome filial, u.nome usuario FROM baixas b JOIN equipamentos e ON e.id=b.equipamento_id
  LEFT JOIN filiais f ON f.id=e.filial_atual_id LEFT JOIN usuarios u ON u.id=b.usuario_id`;

export async function darBaixa(equipamentoId, d, usuarioId) {
  return tx(async c => {
    const {
      rows: [e],
    } = await c.query('SELECT * FROM equipamentos WHERE id=$1 FOR UPDATE', [equipamentoId]);
    if (!e) throw err(404, 'Equipamento não encontrado');
    if (e.status === 'baixado') throw err(409, 'Já baixado');
    const {
      rows: [b],
    } = await c.query(
      'INSERT INTO baixas(equipamento_id,data_baixa,motivo,defeito_encontrado,testes_realizados,usuario_id) VALUES($1,$2,$3,$4,$5,$6) RETURNING id',
      [e.id, d.data_baixa, d.motivo, d.defeito_encontrado, d.testes_realizados, usuarioId],
    );
    await c.query(`UPDATE equipamentos SET status='baixado' WHERE id=$1`, [e.id]);
    await c.query(
      `INSERT INTO movimentacoes(equipamento_id,tipo,data,filial_origem_id,observacao,usuario_id) VALUES($1,'baixa',$2::date,$3,$4,$5)`,
      [e.id, d.data_baixa, e.filial_atual_id, d.motivo, usuarioId],
    );
    return b;
  });
}

export async function listar(f) {
  const w = where();
  if (f.busca)
    w.add(
      `(e.patrimonio ILIKE ? OR e.tipo ILIKE ? OR e.marca ILIKE ? OR b.motivo ILIKE ? OR b.defeito_encontrado ILIKE ?)`,
      likeDe(f.busca),
    );
  if (f.de) w.add('b.data_baixa >= ?::date', f.de);
  if (f.ate) w.add('b.data_baixa <= ?::date', f.ate);
  return (await q(`${SQL_BAIXAS} ${w.sql()} ORDER BY b.data_baixa DESC, b.id DESC LIMIT ${LIMITE.baixas}`, w.p)).rows;
}

export async function buscarParaLaudo(id) {
  const {
    rows: [b],
  } = await q(`${SQL_BAIXAS} WHERE b.id=$1`, [id]);
  if (!b) throw err(404, 'Baixa não encontrada');
  return b;
}

export const listarParaExportar = async () => (await q(`${SQL_BAIXAS} ORDER BY b.data_baixa DESC`)).rows;
