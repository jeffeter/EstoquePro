import jwt from 'jsonwebtoken';
import { env } from '../../config/env.js';
import { q } from '../../db/pool.js';
import { TODAS } from '../permissoes/catalogo.js';

export const NOME_COOKIE = 'token';

export const opcoesCookie = { httpOnly: true, sameSite: 'strict', secure: env.cookieSeguro, path: '/' };

export const assinarToken = usuario =>
  jwt.sign({ id: usuario.id }, env.JWT_SECRET, { algorithm: 'HS256', expiresIn: `${env.JWT_EXPIRA_HORAS}h` });

export function lerToken(token) {
  try {
    const { id } = jwt.verify(token, env.JWT_SECRET, { algorithms: ['HS256'] });
    return Number.isInteger(id) ? id : null;
  } catch {
    return null;
  }
}

/**
 * @returns {Promise<null | {id:number,nome:string,perfil:string,cargo:string,permissoes:string[]}>}
 */
export async function carregarUsuario(id) {
  const {
    rows: [u],
  } = await q(
    'SELECT u.id,u.nome,u.perfil,c.nome AS cargo,c.permissoes FROM usuarios u JOIN cargos c ON c.chave=u.perfil WHERE u.id=$1 AND u.ativo',
    [id],
  );
  if (!u) return null;
  return { ...u, permissoes: u.perfil === 'admin' ? TODAS : u.permissoes.filter(p => TODAS.includes(p)) };
}

export async function buscarAtivoPorEmail(email) {
  const {
    rows: [u],
  } = await q('SELECT * FROM usuarios WHERE email=$1 AND ativo', [email.toLowerCase()]);
  return u;
}
