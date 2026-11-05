import { Router } from 'express';
import { z } from 'zod';
import { INT_MAX } from '../../config/constantes.js';
import { h } from '../../lib/async.js';
import { auditar } from '../../lib/auditoria.js';
import { busca, curto, curtoOpt, idZ, longoOpt, validarId } from '../../lib/validadores.js';
import { exigir } from '../../middleware/autenticacao.js';
import * as svc from './consumiveis.service.js';

const router = Router();
router.param('id', validarId);

const filtroZ = z.object({
  busca: busca(),
  tipo: curtoOpt(60),
  filial_id: idZ.optional(),
  baixo: z.enum(['1']).optional(),
  situacao: z.enum(['inativos', 'todos']).optional(),
});

const QTD_MAX = 1_000_000_000;
const qtdZ = z.preprocess(
  v => (typeof v === 'string' ? (/^\d+$/.test(v.trim()) ? Number(v) : NaN) : v),
  z
    .number({ error: 'Quantidade deve ser um número inteiro (sem decimais, sem negativos)' })
    .int('Quantidade deve ser um número inteiro')
    .min(0, 'A quantidade não pode ser negativa')
    .max(QTD_MAX, 'Quantidade muito alta'),
);

router.get(
  '/consumiveis',
  exigir('consumiveis.ver'),
  h(async (req, res) => res.json(await svc.listar(filtroZ.parse(req.query)))),
);

router.post(
  '/consumiveis',
  exigir('consumiveis.criar'),
  h(async (req, res) => {
    const d = z
      .object({
        tipo: curto(60),
        nome: curto(120),
        quantidade: z.coerce.number().int().min(0).max(INT_MAX),
        minimo: z.coerce.number().int().min(0).max(INT_MAX).optional(),
        filial_id: idZ.optional(),
      })
      .parse(req.body);
    const c = await svc.criar(d, req.user.id);
    await auditar(req, 'consumivel.criar', `#${c.id} ${c.nome} (${c.quantidade} un.)`);
    res.status(201).json(c);
  }),
);

router.post(
  '/consumiveis/:id/movimentar',
  exigir('consumiveis.movimentar'),
  h(async (req, res) => {
    const d = z
      .object({
        tipo: z.enum(['entrada', 'saida']),
        quantidade: z.coerce.number().int().min(1).max(QTD_MAX).default(1),
        observacao: longoOpt(),
      })
      .parse(req.body);
    res.json(await svc.movimentar(req.params.id, d, req.user.id));
  }),
);

router.patch(
  '/consumiveis/:id',
  exigir('consumiveis.editar'),
  h(async (req, res) => {
    const d = z
      .object({
        tipo: z.string().trim().min(1, 'Informe o tipo').max(60).optional(),
        nome: z.string().trim().min(1, 'Informe o nome').max(120).optional(),
        quantidade: qtdZ.optional(),
        minimo: qtdZ.optional(),
        filial_id: idZ.optional(),
        motivo: z.string().trim().max(200).optional(),
      })
      .parse(req.body);
    const { consumivel, ajuste, auditoria } = await svc.editar(req.params.id, d, req.user.id);
    for (const [acao, detalhe] of auditoria) await auditar(req, acao, detalhe);
    res.json({ ...consumivel, ajuste });
  }),
);

router.delete(
  '/consumiveis/:id',
  exigir('consumiveis.excluir'),
  h(async (req, res) => {
    const c = await svc.excluir(req.params.id);
    await auditar(req, 'consumivel.excluir', `#${c.id} ${c.nome}`);
    res.json({ ok: true });
  }),
);

for (const [rota, ativo, acao] of [
  ['inativar', false, 'consumivel.inativar'],
  ['reativar', true, 'consumivel.reativar'],
])
  router.post(
    `/consumiveis/:id/${rota}`,
    exigir('consumiveis.excluir'),
    h(async (req, res) => {
      const c = await svc.definirAtivo(req.params.id, ativo);
      await auditar(req, acao, `#${c.id} ${c.nome} (${c.quantidade} un.)`);
      res.json({ ok: true });
    }),
  );

export default router;
