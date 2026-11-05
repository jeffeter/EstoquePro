import { q } from '../../db/pool.js';
import { err } from '../../lib/erros.js';
import { TODAS, normalizar } from '../permissoes/catalogo.js';

const slug = t =>
  t
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40) || 'cargo';

const SQL_CARGOS = `SELECT c.id, c.chave, c.nome, c.descricao, c.sistema, c.permissoes,
    COALESCE(json_agg(json_build_object('id', u.id, 'nome', u.nome, 'email', u.email, 'ativo', u.ativo, 'filial', f.nome) ORDER BY u.nome) FILTER (WHERE u.id IS NOT NULL), '[]') AS usuarios
  FROM cargos c LEFT JOIN usuarios u ON u.perfil = c.chave LEFT JOIN filiais f ON f.id = u.filial_id`;

const saida = c => ({
  ...c,
  permissoes: c.chave === 'admin' ? TODAS : c.permissoes.filter(p => TODAS.includes(p)),
  total_usuarios: c.usuarios.length,
});

export const cargoExiste = async chave => (await q('SELECT 1 FROM cargos WHERE chave=$1', [chave])).rowCount > 0;

export async function buscarCargo(id) {
  const {
    rows: [c],
  } = await q(`${SQL_CARGOS} WHERE c.id=$1 GROUP BY c.id`, [id]);
  return c && saida(c);
}

export const opcoes = async () =>
  (await q('SELECT chave, nome FROM cargos ORDER BY sistema DESC, CASE WHEN sistema THEN id END, nome')).rows;

export async function listar() {
  const { rows } = await q(`${SQL_CARGOS} GROUP BY c.id ORDER BY c.sistema DESC, CASE WHEN c.sistema THEN c.id END, c.nome`);
  return rows.map(saida);
}

export async function criar({ nome, descricao, permissoes }) {
  const n = normalizar(permissoes ?? []);
  if (n.erro) throw err(400, n.erro);
  let chave = slug(nome);
  for (let i = 2; await cargoExiste(chave); i++) chave = `${slug(nome).slice(0, 36)}-${i}`;
  try {
    const {
      rows: [novo],
    } = await q('INSERT INTO cargos(chave,nome,descricao,permissoes) VALUES($1,$2,$3,$4) RETURNING id', [
      chave,
      nome,
      descricao || null,
      n.lista,
    ]);
    return { cargo: await buscarCargo(novo.id), detalhe: `${nome}: ${n.lista.join(', ') || 'sem permissões'}` };
  } catch (x) {
    throw x.code === '23505' ? err(409, `Já existe um cargo chamado "${nome}"`) : x;
  }
}

export async function atualizar(id, d) {
  const {
    rows: [a],
  } = await q('SELECT * FROM cargos WHERE id=$1', [id]);
  if (!a) throw err(404, 'Cargo não encontrado');
  if (a.chave === 'admin' && ((d.nome !== undefined && d.nome !== a.nome) || d.permissoes !== undefined))
    throw err(409, 'O cargo Administrador tem acesso total e não pode ser alterado');
  let lista = null;
  if (d.permissoes !== undefined) {
    const n = normalizar(d.permissoes);
    if (n.erro) throw err(400, n.erro);
    lista = n.lista;
  }
  try {
    await q(
      'UPDATE cargos SET nome=COALESCE($2,nome), descricao=CASE WHEN $3::boolean THEN $4 ELSE descricao END, permissoes=COALESCE($5,permissoes) WHERE id=$1',
      [id, d.nome ?? null, d.descricao !== undefined, d.descricao || null, lista],
    );
  } catch (x) {
    throw x.code === '23505' ? err(409, `Já existe um cargo chamado "${d.nome}"`) : x;
  }
  const antes = new Set(a.permissoes);
  const depois = new Set(lista ?? a.permissoes);
  const add = [...depois].filter(p => !antes.has(p));
  const rem = [...antes].filter(p => !depois.has(p));
  const detalhe = `${a.nome}${d.nome && d.nome !== a.nome ? ` → ${d.nome}` : ''}${add.length ? `; +${add.join(',')}` : ''}${rem.length ? `; -${rem.join(',')}` : ''}`;
  return { cargo: await buscarCargo(id), detalhe };
}

export async function excluir(id) {
  const c = await buscarCargo(id);
  if (!c) throw err(404, 'Cargo não encontrado');
  if (c.sistema) throw err(409, `"${c.nome}" é um cargo do sistema e não pode ser excluído`);
  const emUso = () =>
    err(409, `"${c.nome}" está em uso por ${c.total_usuarios} usuário(s). Troque o cargo deles na aba Usuários antes de excluir.`);
  if (c.total_usuarios > 0) throw emUso();
  try {
    await q('DELETE FROM cargos WHERE id=$1', [c.id]);
  } catch (x) {
    throw x.code === '23503' ? emUso() : x; 
  }
  return c.nome;
}
