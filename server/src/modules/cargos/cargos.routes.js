import { Router } from 'express';
import { z } from 'zod';
import { h } from '../../lib/async.js';
import { auditar } from '../../lib/auditoria.js';
import { validarId } from '../../lib/validadores.js';
import { exigir } from '../../middleware/autenticacao.js';
import { CATALOGO, GRUPOS } from '../permissoes/catalogo.js';
import * as svc from './cargos.service.js';

const router = Router();
router.param('id', validarId);

const cargoZ = z.object({
  nome: z.string().trim().min(2, 'Nome do cargo: mínimo 2 caracteres').max(40, 'Nome do cargo: máximo 40 caracteres'),
  descricao: z.string().trim().max(200, 'Descrição: máximo 200 caracteres').optional(),
  permissoes: z.array(z.string().max(60)).max(60).optional(),
});

router.get(
  '/cargos/opcoes',
  exigir('usuarios.gerenciar'),
  h(async (req, res) => res.json(await svc.opcoes())),
);

router.get(
  '/cargos',
  exigir('cargos.gerenciar'),
  h(async (req, res) => res.json({ catalogo: CATALOGO, grupos: GRUPOS, cargos: await svc.listar() })),
);

router.post(
  '/cargos',
  exigir('cargos.gerenciar'),
  h(async (req, res) => {
    const { cargo, detalhe } = await svc.criar(cargoZ.parse(req.body));
    await auditar(req, 'cargo.criar', detalhe);
    res.status(201).json(cargo);
  }),
);

router.patch(
  '/cargos/:id',
  exigir('cargos.gerenciar'),
  h(async (req, res) => {
    const { cargo, detalhe } = await svc.atualizar(req.params.id, cargoZ.partial().parse(req.body));
    await auditar(req, 'cargo.editar', detalhe);
    res.json(cargo);
  }),
);

router.delete(
  '/cargos/:id',
  exigir('cargos.gerenciar'),
  h(async (req, res) => {
    await auditar(req, 'cargo.excluir', await svc.excluir(req.params.id));
    res.json({ ok: true });
  }),
);

export default router;
