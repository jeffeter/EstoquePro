import { z } from 'zod';
import { env } from '../../config/env.js';

export const PAT_RE = '^(.*?)(\\d{1,15})$';

export const patrimonioZ = z
  .string()
  .trim()
  .min(1, 'Informe o patrimônio')
  .max(50, 'Patrimônio deve ter no máximo 50 caracteres')
  .regex(/^[^\r\n\t]+$/, 'Patrimônio contém caracteres inválidos');

export const prefixoDe = patrimonio => patrimonio?.match(new RegExp(PAT_RE))?.[1];

/**
 * @param {{query: Function}} c  
 * @param {string|null|undefined} prefixo  
 * @returns {Promise<{prefixo: string, numero: number, patrimonio: string}>}
 */
export async function proximoPatrimonio(c, prefixo) {
  if (prefixo == null) {
    const {
      rows: [u],
    } = await c.query(
      `SELECT m[1] AS prefixo FROM (SELECT id, regexp_match(btrim(patrimonio), $1) m FROM equipamentos) t WHERE m IS NOT NULL ORDER BY id DESC LIMIT 1`,
      [PAT_RE],
    );
    prefixo = u ? u.prefixo : env.PATRIMONIO_PREFIXO_PADRAO; 
  }
  const {
    rows: [mx],
  } = await c.query(
    `SELECT m[2]::bigint AS n, length(m[2]) AS largura FROM
      (SELECT regexp_match(btrim(patrimonio), $1) m FROM equipamentos WHERE starts_with(lower(btrim(patrimonio)), lower($2))) t
    WHERE m IS NOT NULL AND lower(m[1]) = lower($2) ORDER BY n DESC, largura DESC LIMIT 1`,
    [PAT_RE, prefixo],
  );
  const numero = mx ? Number(mx.n) + 1 : 1;
  const largura = mx ? Number(mx.largura) : env.PATRIMONIO_DIGITOS; 
  return { prefixo, numero, patrimonio: prefixo + String(numero).padStart(largura, '0') };
}

export const patrimonioExiste = async (c, pat) =>
  (await c.query(`SELECT 1 FROM equipamentos WHERE upper(btrim(patrimonio)) = upper($1)`, [pat])).rowCount > 0;
