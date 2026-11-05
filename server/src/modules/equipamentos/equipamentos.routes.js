import { Router } from 'express';
import { z } from 'zod';
import { STATUS, LIMITE } from '../../config/constantes.js';
import { h } from '../../lib/async.js';
import { auditar } from '../../lib/auditoria.js';
import { err } from '../../lib/erros.js';
import { curto, curtoOpt, dataZ, idZ, longoOpt, validarId } from '../../lib/validadores.js';
import { exigir } from '../../middleware/autenticacao.js';
import { etiquetas } from '../../pdf/index.js';
import { filtroEquipamentos } from './equipamentos.filtros.js';
import { patrimonioZ, proximoPatrimonio } from './patrimonio.js';
import { pool } from '../../db/pool.js';
import * as svc from './equipamentos.service.js';

const router = Router();
router.param('id', validarId);

router.get(
  '/equipamentos',
  exigir('equipamentos.ver'),
  h(async (req, res) => res.json(await svc.listar(filtroEquipamentos.parse(req.query)))),
);

router.get(
  '/filtros/opcoes',
  h(async (req, res) => {
    const equipamentos = req.user.permissoes.includes('equipamentos.ver');
    const consumiveis = req.user.permissoes.includes('consumiveis.ver');
    if (!equipamentos && !consumiveis) throw err(403, 'Sem permissão');
    res.json(await svc.opcoesDeFiltro({ equipamentos, consumiveis }));
  }),
);

router.get(
  '/equipamentos/proximo-patrimonio',
  exigir('equipamentos.criar'),
  h(async (req, res) => {
    const f = z.object({ prefixo: z.string().max(50).optional() }).parse(req.query);
    res.json(await proximoPatrimonio(pool, f.prefixo));
  }),
);

router.get(
  '/equipamentos/:id/historico',
  exigir('equipamentos.ver'),
  h(async (req, res) => res.json(await svc.historico(req.params.id))),
);

router.get(
  '/patrimonio/:codigo',
  exigir('equipamentos.ver'),
  h(async (req, res) => res.json(await svc.buscarPorPatrimonio(z.string().trim().min(1).max(100).parse(req.params.codigo)))),
);

router.get(
  '/etiquetas',
  exigir('equipamentos.ver'),
  h(async (req, res) => {
    const f = z
      .object({
        ids: z
          .string()
          .max(8000)
          .regex(/^\d+(,\d+)*$/)
          .transform(s => s.split(','))
          .pipe(z.array(idZ)),
        modelo: z.enum(['folha', 'termica']).default('folha'),
      })
      .parse(req.query);
    const ids = [...new Set(f.ids)].slice(0, LIMITE.etiquetas);
    const linhas = await svc.paraEtiquetas(ids);
    await auditar(req, 'etiqueta.gerar', `${linhas.length} etiqueta(s) ${f.modelo}`);
    await etiquetas(res, linhas, f.modelo);
  }),
);

const cadastroZ = z.object({
  patrimonio: patrimonioZ.optional(),
  sugerido: z.boolean().optional(),
  tipo: curto(60),
  marca: curtoOpt(60),
  observacao: longoOpt(),
  data_entrada: dataZ.optional(),
  filial_origem_id: idZ.optional(),
  filial_atual_id: idZ,
  avarias: longoOpt(),
  data_compra: dataZ.optional(),
  fornecedor: curtoOpt(),
  garantia_ate: dataZ.optional(),
  status: z.enum(STATUS).optional(),
});

router.post(
  '/equipamentos',
  exigir('equipamentos.criar'),
  h(async (req, res) => {
    const e = await svc.criar(cadastroZ.parse(req.body), req.user.id);
    await auditar(req, 'equipamento.criar', e.patrimonio);
    res.status(201).json(e);
  }),
);

router.patch(
  '/equipamentos/:id',
  exigir('equipamentos.editar'),
  h(async (req, res) => {
    const d = cadastroZ
      .pick({ tipo: true, marca: true, observacao: true, avarias: true, data_compra: true, fornecedor: true, garantia_ate: true })
      .partial()
      .parse(req.body);
    await svc.editar(req.params.id, d);
    await auditar(req, 'equipamento.editar', `${req.params.id}: ${Object.keys(d).join(',')}`);
    res.json({ ok: true });
  }),
);

router.patch(
  '/equipamentos/:id/status',
  exigir('equipamentos.status'),
  h(async (req, res) => {
    const { status, avarias } = z.object({ status: z.enum(STATUS), avarias: longoOpt() }).parse(req.body);
    await svc.mudarStatus(req.params.id, status, avarias);
    await auditar(req, 'equipamento.status', `${req.params.id} -> ${status}`);
    res.json({ ok: true });
  }),
);

router.post(
  '/equipamentos/:id/saida',
  exigir('equipamentos.saida'),
  h(async (req, res) => {
    const d = z.object({ filial_destino_id: idZ, setor: curto(120), chamado: curto(60), observacao: longoOpt() }).parse(req.body);
    const m = await svc.registrarSaida(req.params.id, d, req.user.id);
    await auditar(req, 'equipamento.saida', `${req.params.id} chamado ${d.chamado}`);
    res.status(201).json(m);
  }),
);

router.post(
  '/equipamentos/:id/manutencoes',
  exigir('equipamentos.manutencao'),
  h(async (req, res) => {
    const d = z
      .object({ descricao: z.string().trim().min(3).max(2000), tecnico: curtoOpt(), data_inicio: dataZ.optional() })
      .parse(req.body);
    await svc.abrirManutencao(req.params.id, d, req.user.id);
    await auditar(req, 'manutencao.abrir', req.params.id);
    res.status(201).json({ ok: true });
  }),
);

router.post(
  '/equipamentos/:id/manutencoes/concluir',
  exigir('equipamentos.manutencao'),
  h(async (req, res) => {
    await svc.concluirManutencao(req.params.id);
    await auditar(req, 'manutencao.concluir', req.params.id);
    res.json({ ok: true });
  }),
);

export default router;
