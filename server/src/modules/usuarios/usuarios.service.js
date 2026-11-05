import bcrypt from 'bcryptjs';
import { BCRYPT_CUSTO } from '../../config/constantes.js';
import { q } from '../../db/pool.js';
import { err } from '../../lib/erros.js';
import { cargoExiste } from '../cargos/cargos.service.js';

export const listar = async () =>
  (
    await q(
      'SELECT u.id,u.nome,u.email,u.perfil,c.nome AS cargo,u.filial_id,u.ativo FROM usuarios u JOIN cargos c ON c.chave=u.perfil ORDER BY u.nome',
    )
  ).rows;

export async function criar(d) {
  if (!(await cargoExiste(d.perfil))) throw err(400, 'Cargo inexistente');
  const {
    rows: [u],
  } = await q('INSERT INTO usuarios(nome,email,senha_hash,perfil,filial_id) VALUES($1,$2,$3,$4,$5) RETURNING id,nome,email,perfil', [
    d.nome,
    d.email.toLowerCase(),
    await bcrypt.hash(d.senha, BCRYPT_CUSTO),
    d.perfil,
    d.filial_id ?? null,
  ]);
  return u;
}

/**
 * @returns {string} 
 */
export async function atualizar(uid, d, solicitante) {
  if (uid === solicitante.id && (d.ativo === false || (d.perfil && d.perfil !== solicitante.perfil)))
    throw err(400, 'Você não pode alterar o próprio cargo nem se desativar');
  if (d.perfil && !(await cargoExiste(d.perfil))) throw err(400, 'Cargo inexistente');
  const {
    rows: [alvo],
  } = await q('SELECT perfil, ativo FROM usuarios WHERE id=$1', [uid]);
  if (!alvo) throw err(404, 'Usuário não encontrado');
  const deixaDeSerAdmin = d.ativo === false || (d.perfil && d.perfil !== 'admin');
  if (
    alvo.perfil === 'admin' &&
    alvo.ativo &&
    deixaDeSerAdmin &&
    (await q(`SELECT 1 FROM usuarios WHERE perfil='admin' AND ativo AND id<>$1`, [uid])).rowCount === 0
  )
    throw err(409, 'É preciso manter ao menos um administrador ativo');
  const hash = d.senha ? await bcrypt.hash(d.senha, BCRYPT_CUSTO) : null;
  await q(
    `UPDATE usuarios SET nome=COALESCE($1,nome), email=COALESCE($2,email), perfil=COALESCE($3,perfil), filial_id=COALESCE($4,filial_id),
    ativo=COALESCE($5,ativo), senha_hash=COALESCE($6,senha_hash) WHERE id=$7`,
    [d.nome ?? null, d.email?.toLowerCase() ?? null, d.perfil ?? null, d.filial_id ?? null, d.ativo ?? null, hash, uid],
  );
  return `${uid}: ${Object.keys(d)
    .filter(k => k !== 'senha')
    .join(',')}${d.senha ? ',senha' : ''}`;
}
