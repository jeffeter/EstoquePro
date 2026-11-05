import { Router } from 'express';
import { z } from 'zod';
import { h } from '../../lib/async.js';
import { auditar } from '../../lib/auditoria.js';
import { err } from '../../lib/erros.js';
import { curto, curtoOpt, validarId } from '../../lib/validadores.js';
import { exigir } from '../../middleware/autenticacao.js';
import { termoResponsabilidade } from '../../pdf/index.js';
import * as svc from './termos.service.js';

const router = Router();
router.param('id', validarId);

router.get(
  '/equipamentos/:id/termo',
  exigir('equipamentos.ver'),
  h(async (req, res) => {
    const t = await svc.dadosTermo(req.params.id);
    if (!t) throw err(404, 'Equipamento não encontrado');
    await auditar(req, 'termo.imprimir', t.patrimonio);
    termoResponsabilidade(res, t);
  }),
);

const termoZ = z.object({
  colaborador_nome: curto(120).min(3),
  colaborador_telefone: curtoOpt(30),
  colaborador_email: z.string().trim().email().max(254).optional(),
  colaborador_cargo: curtoOpt(80),
  assinatura: z
    .string()
    .max(300_000)
    .regex(/^data:image\/png;base64,[A-Za-z0-9+/=]+$/, 'assinatura inválida'),
});

router.post(
  '/equipamentos/:id/termos',
  exigir('equipamentos.saida'),
  h(async (req, res) => {
    const d = termoZ.parse(req.body);
    const { termo, patrimonio } = await svc.assinar(req.params.id, d, req.user.id, req.ip);
    await auditar(req, 'termo.assinar', `${patrimonio} por ${d.colaborador_nome}`);
    res.status(201).json(termo);
  }),
);

router.get(
  '/termos/:id/pdf',
  exigir('equipamentos.ver'),
  h(async (req, res) => {
    const t = await svc.buscar(req.params.id);
    await auditar(req, 'termo.reimprimir', `${t.dados.patrimonio} (#${t.id})`);
    termoResponsabilidade(res, {
      ...t.dados,
      data: t.dados.data ?? t.assinado_em,
      colaborador: { nome: t.colaborador_nome, telefone: t.colaborador_telefone, email: t.colaborador_email, cargo: t.colaborador_cargo },
      assinatura: t.assinatura,
      codigo: t.codigo,
      assinado_em: t.assinado_em,
      ip: t.ip,
    });
  }),
);

export default router;
