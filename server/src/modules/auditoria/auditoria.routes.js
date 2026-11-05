/** Consulta da trilha de auditoria (somente leitura; a gravação é feita por lib/auditoria.js). */
import { Router } from 'express';
import { LIMITE } from '../../config/constantes.js';
import { q } from '../../db/pool.js';
import { h } from '../../lib/async.js';
import { exigir } from '../../middleware/autenticacao.js';

const router = Router();

router.get(
  '/auditoria',
  exigir('auditoria.ver'),
  h(async (req, res) =>
    res.json(
      (
        await q(
          `SELECT a.*, u.nome FROM auditoria a LEFT JOIN usuarios u ON u.id=a.usuario_id ORDER BY a.id DESC LIMIT ${LIMITE.auditoria}`,
        )
      ).rows,
    ),
  ),
);

export default router;
