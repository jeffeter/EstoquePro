import { Router } from 'express';
import { z } from 'zod';
import { h } from '../../lib/async.js';
import { auditar } from '../../lib/auditoria.js';
import { busca, dataZ, validarId } from '../../lib/validadores.js';
import { exigir } from '../../middleware/autenticacao.js';
import { laudoBaixa } from '../../pdf/index.js';
import * as svc from './baixas.service.js';

const router = Router();
router.param('id', validarId);

router.post(
  '/equipamentos/:id/baixa',
  exigir('equipamentos.baixar'),
  h(async (req, res) => {
    const d = z
      .object({
        data_baixa: dataZ,
        motivo: z.string().trim().min(5).max(2000),
        defeito_encontrado: z.string().trim().min(3).max(2000),
        testes_realizados: z.string().trim().min(3).max(2000),
      })
      .parse(req.body);
    const b = await svc.darBaixa(req.params.id, d, req.user.id);
    await auditar(req, 'equipamento.baixa', req.params.id);
    res.status(201).json(b);
  }),
);

router.get(
  '/baixas',
  exigir('relatorios.ver'),
  h(async (req, res) =>
    res.json(await svc.listar(z.object({ busca: busca(), de: dataZ.optional(), ate: dataZ.optional() }).parse(req.query))),
  ),
);

router.get(
  '/baixas/:id/laudo',
  exigir('relatorios.ver'),
  h(async (req, res) => laudoBaixa(res, await svc.buscarParaLaudo(req.params.id))),
);

export default router;
