import { Router } from 'express';
import { z } from 'zod';
import { h } from '../../lib/async.js';
import { auditar } from '../../lib/auditoria.js';
import { curto, idZ, senhaZ, validarId } from '../../lib/validadores.js';
import { exigir } from '../../middleware/autenticacao.js';
import * as svc from './usuarios.service.js';

const router = Router();
router.param('id', validarId);

const email = z.string().trim().email().max(254);
const nome = z.string().trim().min(2).max(120);
const cargo = curto(60);

router.get(
  '/usuarios',
  exigir('usuarios.gerenciar'),
  h(async (req, res) => res.json(await svc.listar())),
);

router.post(
  '/usuarios',
  exigir('usuarios.gerenciar'),
  h(async (req, res) => {
    const d = z.object({ nome, email, senha: senhaZ, perfil: cargo, filial_id: idZ.optional() }).parse(req.body);
    const u = await svc.criar(d);
    await auditar(req, 'usuario.criar', `${u.email} (${u.perfil})`);
    res.status(201).json(u);
  }),
);

router.patch(
  '/usuarios/:id',
  exigir('usuarios.gerenciar'),
  h(async (req, res) => {
    const d = z
      .object({
        nome: nome.optional(),
        email: email.optional(),
        perfil: cargo.optional(),
        filial_id: idZ.optional(),
        ativo: z.boolean().optional(),
        senha: senhaZ.optional(),
      })
      .parse(req.body);
    await auditar(req, 'usuario.editar', await svc.atualizar(req.params.id, d, req.user));
    res.json({ ok: true });
  }),
);

export default router;
