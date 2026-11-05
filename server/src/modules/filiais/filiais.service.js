import { q } from '../../db/pool.js';
import { err } from '../../lib/erros.js';

export const listarAtivas = async () => (await q('SELECT * FROM filiais WHERE ativo ORDER BY nome')).rows;

export async function criar(d) {
  const {
    rows: [f],
  } = await q('INSERT INTO filiais(nome,cidade) VALUES($1,$2) RETURNING *', [d.nome, d.cidade ?? null]);
  return f;
}

export async function atualizar(id, d) {
  const { rowCount } = await q(
    'UPDATE filiais SET nome=COALESCE($1,nome), cidade=COALESCE($2,cidade), ativo=COALESCE($3,ativo) WHERE id=$4',
    [d.nome ?? null, d.cidade ?? null, d.ativo ?? null, id],
  );
  if (!rowCount) throw err(404, 'Filial não encontrada');
}
