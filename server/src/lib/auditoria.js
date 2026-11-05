import { q } from '../db/pool.js';

const limpar = v =>
  String(v ?? '')
    .replace(/[\u0000-\u001F\u007F]/g, ' ')
    .slice(0, 500);

export async function auditar(req, acao, detalhe) {
  try {
    await q('INSERT INTO auditoria(usuario_id,acao,detalhe,ip) VALUES($1,$2,$3,$4)', [req.user?.id ?? null, acao, limpar(detalhe), req.ip]);
  } catch (e) {
    console.error('[auditoria] falha ao gravar', acao, e.message);
  }
}
