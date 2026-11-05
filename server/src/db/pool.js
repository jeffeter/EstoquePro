import pg from 'pg';
import { env } from '../config/env.js';

pg.types.setTypeParser(1082, v => v); 

export const pool = new pg.Pool({
  connectionString: env.DATABASE_URL,
  max: 10,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 5_000,
  statement_timeout: 30_000, 
});

pool.on('error', e => console.error('[pg] erro em conexão ociosa:', e.message));


export const q = (texto, params) => pool.query(texto, params);

export async function tx(fn) {
  const c = await pool.connect();
  try {
    await c.query('BEGIN');
    const r = await fn(c);
    await c.query('COMMIT');
    return r;
  } catch (e) {
    await c.query('ROLLBACK');
    throw e;
  } finally {
    c.release();
  }
}
