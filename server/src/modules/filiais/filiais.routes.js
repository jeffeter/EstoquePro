import { Router } from 'express';
import { z } from 'zod';
import { h } from '../../lib/async.js';
import { auditar } from '../../lib/auditoria.js';
import { curtoOpt, validarId } from '../../lib/validadores.js';
import { exigir } from '../../middleware/autenticacao.js';
import * as svc from './filiais.service.js';

const router = Router();
router.param('id', validarId);

const nome = z.string().trim().min(2).max(120);

router.get(
  '/filiais',
  h(async (req, res) => res.json(await svc.listarAtivas())),
);

router.post(
  '/filiais',
  exigir('filiais.gerenciar'),
  h(async (req, res) => {
    const f = await svc.criar(z.object({ nome, cidade: curtoOpt() }).parse(req.body));
    await auditar(req, 'filial.criar', f.nome);
    res.status(201).json(f);
  }),
);

router.patch(
  '/filiais/:id',
  exigir('filiais.gerenciar'),
  h(async (req, res) => {
    const d = z.object({ nome: nome.optional(), cidade: curtoOpt(), ativo: z.boolean().optional() }).parse(req.body);
    await svc.atualizar(req.params.id, d);
    await auditar(req, 'filial.editar', `${req.params.id}: ${Object.keys(d).join(',')}`);
    res.json({ ok: true });
  }),
);

export default router;
