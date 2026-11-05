import { q, tx } from '../../db/pool.js';
import { LIMITE } from '../../config/constantes.js';
import { err } from '../../lib/erros.js';
import { likeDe, where } from '../../lib/sql.js';

export async function listar(f) {
  const w = where();
  if (f.busca) w.add('(c.nome ILIKE ? OR c.tipo ILIKE ?)', likeDe(f.busca));
  if (f.tipo) w.add('lower(c.tipo) = lower(?)', f.tipo);
  if (f.filial_id) w.add('c.filial_id = ?', f.filial_id);
  if (f.baixo) w.raw('c.quantidade <= c.minimo');
  if (f.situacao !== 'todos') w.raw(f.situacao === 'inativos' ? 'NOT c.ativo' : 'c.ativo'); 
  return (
    await q(
      `SELECT c.*, f.nome filial, (SELECT COUNT(*)::int FROM movimentacoes m WHERE m.consumivel_id=c.id) AS movimentacoes
    FROM consumiveis c LEFT JOIN filiais f ON f.id=c.filial_id ${w.sql()} ORDER BY c.tipo,c.nome LIMIT ${LIMITE.consumiveis}`,
      w.p,
    )
  ).rows;
}

export const listarAtivosParaExportar = async () =>
  (await q('SELECT c.*, f.nome filial FROM consumiveis c LEFT JOIN filiais f ON f.id=c.filial_id WHERE c.ativo ORDER BY c.tipo,c.nome'))
    .rows;

export async function criar(d, usuarioId) {
  return tx(async cx => {
    const {
      rows: [c],
    } = await cx.query('INSERT INTO consumiveis(tipo,nome,quantidade,minimo,filial_id) VALUES($1,$2,$3,$4,$5) RETURNING *', [
      d.tipo,
      d.nome,
      d.quantidade,
      d.minimo ?? 0,
      d.filial_id ?? null,
    ]);
    if (d.quantidade > 0)
      await cx.query(
        `INSERT INTO movimentacoes(consumivel_id,tipo,quantidade,filial_destino_id,usuario_id) VALUES($1,'entrada',$2,$3,$4)`,
        [c.id, d.quantidade, d.filial_id ?? null, usuarioId],
      );
    return c;
  });
}

export async function movimentar(id, d, usuarioId) {
  const delta = d.tipo === 'entrada' ? d.quantidade : -d.quantidade;
  return tx(async cx => {
    const {
      rows: [c],
    } = await cx.query('UPDATE consumiveis SET quantidade=quantidade+$1 WHERE id=$2 AND ativo AND quantidade+$1>=0 RETURNING *', [
      delta,
      id,
    ]);
    if (!c) throw err(409, 'Quantidade insuficiente, item inativo ou inexistente');
    await cx.query('INSERT INTO movimentacoes(consumivel_id,tipo,quantidade,observacao,usuario_id) VALUES($1,$2,$3,$4,$5)', [
      c.id,
      d.tipo,
      d.quantidade,
      d.observacao ?? null,
      usuarioId,
    ]);
    return c;
  });
}

/**
 * @returns {{consumivel: object, ajuste: {de:number,para:number}|null, auditoria: Array<[string,string]>}}
 */
export async function editar(id, d, usuarioId) {
  const { n, a, delta, mudou } = await tx(async cx => {
    const {
      rows: [a],
    } = await cx.query('SELECT * FROM consumiveis WHERE id=$1 FOR UPDATE', [id]);
    if (!a) throw err(404, 'Consumível não encontrado');
    if (!a.ativo) throw err(409, 'Consumível inativo: reative-o antes de editar');
    const {
      rows: [n],
    } = await cx.query(
      `UPDATE consumiveis SET tipo=COALESCE($2,tipo), nome=COALESCE($3,nome), minimo=COALESCE($4,minimo), filial_id=COALESCE($5,filial_id),
      quantidade=COALESCE($6,quantidade) WHERE id=$1 RETURNING *`,
      [id, d.tipo ?? null, d.nome ?? null, d.minimo ?? null, d.filial_id ?? null, d.quantidade ?? null],
    );
    const delta = n.quantidade - a.quantidade;
    const mudou = ['tipo', 'nome', 'minimo', 'filial_id'].filter(k => d[k] !== undefined && d[k] !== a[k]);
    if (delta !== 0)
      await cx.query(`INSERT INTO movimentacoes(consumivel_id,tipo,quantidade,observacao,usuario_id) VALUES($1,$2,$3,$4,$5)`, [
        id,
        delta > 0 ? 'entrada' : 'saida',
        Math.abs(delta),
        `Ajuste de estoque: ${a.quantidade} → ${n.quantidade}` + (d.motivo ? ` — ${d.motivo}` : ''),
        usuarioId,
      ]);
    return { n, a, delta, mudou };
  });

  const auditoria = [];
  if (mudou.length)
    auditoria.push(['consumivel.editar', `#${id} ${a.nome}: ` + mudou.map(k => `${k} ${a[k] ?? '-'} → ${n[k] ?? '-'}`).join('; ')]);
  if (delta !== 0)
    auditoria.push(['consumivel.ajuste', `#${id} ${n.nome}: ${a.quantidade} → ${n.quantidade}` + (d.motivo ? ` (${d.motivo})` : '')]);
  const {
    rows: [consumivel],
  } = await q('SELECT c.*, f.nome filial FROM consumiveis c LEFT JOIN filiais f ON f.id=c.filial_id WHERE c.id=$1', [id]);
  return { consumivel, ajuste: delta !== 0 ? { de: a.quantidade, para: n.quantidade } : null, auditoria };
}

export async function excluir(id) {
  return tx(async cx => {
    const {
      rows: [c],
    } = await cx.query('SELECT id,nome FROM consumiveis WHERE id=$1 FOR UPDATE', [id]);
    if (!c) throw err(404, 'Consumível não encontrado');
    const {
      rows: [{ n }],
    } = await cx.query('SELECT COUNT(*)::int n FROM movimentacoes WHERE consumivel_id=$1', [id]);
    if (n > 0)
      throw err(
        409,
        `"${c.nome}" tem ${n} movimentação(ões) no histórico e não pode ser excluído. Inative o cadastro para preservar o histórico.`,
      );
    await cx.query('DELETE FROM consumiveis WHERE id=$1', [id]);
    return c;
  });
}

export async function definirAtivo(id, ativo) {
  const {
    rows: [c],
  } = await q('UPDATE consumiveis SET ativo=$2 WHERE id=$1 AND ativo<>$2 RETURNING id,nome,quantidade', [id, ativo]);
  if (!c) throw err(409, `Consumível inexistente ou já ${ativo ? 'ativo' : 'inativo'}`);
  return c;
}
