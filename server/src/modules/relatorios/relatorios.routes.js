import { Router } from 'express';
import { z } from 'zod';
import { LIMITE, ROTULO_STATUS } from '../../config/constantes.js';
import { h } from '../../lib/async.js';
import { dataBR } from '../../lib/datas.js';
import { err } from '../../lib/erros.js';
import { busca, dataZ, idZ } from '../../lib/validadores.js';
import { exigir } from '../../middleware/autenticacao.js';
import * as baixas from '../baixas/baixas.service.js';
import * as consumiveis from '../consumiveis/consumiveis.service.js';
import { filtroEquipamentos } from '../equipamentos/equipamentos.filtros.js';
import * as equipamentos from '../equipamentos/equipamentos.service.js';
import { exportar } from './relatorios.exportar.js';
import * as svc from './relatorios.service.js';

const router = Router();

const FORMATOS = z.enum(['csv', 'xlsx', 'pdf', 'xml']);
const filtroMov = z.object({
  de: dataZ.optional(),
  ate: dataZ.optional(),
  tipo: z.enum(['entrada', 'saida', 'baixa']).optional(),
  busca: busca(),
  filial_id: idZ.optional(),
  formato: FORMATOS.optional(),
});

router.get(
  '/relatorios/movimentacoes',
  exigir('relatorios.ver'),
  h(async (req, res) => res.json((await svc.movimentacoes(filtroMov.parse(req.query))).slice(0, LIMITE.movimentacoesTela))),
);

router.get(
  '/relatorios/quantitativo',
  exigir('relatorios.ver'),
  h(async (req, res) => res.json(await svc.quantitativo())),
);

const CONJUNTOS = {
  movimentacoes: {
    titulo: 'Relatório de entradas e saídas',
    colunas: [
      ['Data', x => dataBR(x.data)],
      ['Tipo', x => x.tipo],
      ['Patrimônio', x => x.patrimonio],
      ['Item', x => x.item],
      ['Quantidade', x => x.quantidade ?? 1],
      ['Origem', x => x.origem],
      ['Destino', x => x.destino],
      ['Setor', x => x.setor],
      ['Chamado', x => x.chamado],
      ['Observação', x => x.observacao],
      ['Usuário', x => x.usuario],
    ],
    linhas: query => svc.movimentacoes(filtroMov.parse(query)),
  },
  equipamentos: {
    titulo: 'Relatório de equipamentos',
    colunas: [
      ['Patrimônio', x => x.patrimonio],
      ['Tipo', x => x.tipo],
      ['Marca', x => x.marca],
      ['Observação / Especificações', x => x.observacao],
      ['Filial', x => x.filial],
      ['Status', x => ROTULO_STATUS[x.status]],
      ['Avarias', x => x.avarias],
      ['Data da compra', x => dataBR(x.data_compra)],
      ['Fornecedor', x => x.fornecedor],
      ['Garantia até', x => dataBR(x.garantia_ate)],
    ],
    linhas: query => equipamentos.listarParaExportar(filtroEquipamentos.parse(query)),
  },
  consumiveis: {
    titulo: 'Relatório de consumíveis',
    colunas: [
      ['Tipo', x => x.tipo],
      ['Nome', x => x.nome],
      ['Quantidade', x => x.quantidade],
      ['Mínimo', x => x.minimo],
      ['Filial', x => x.filial],
      ['Situação', x => (x.quantidade <= x.minimo ? 'ESTOQUE BAIXO' : 'OK')],
    ],
    linhas: () => consumiveis.listarAtivosParaExportar(),
  },
  baixas: {
    titulo: 'Relatório de equipamentos baixados',
    colunas: [
      ['Data da baixa', x => dataBR(x.data_baixa)],
      ['Patrimônio', x => x.patrimonio],
      ['Tipo', x => x.tipo],
      ['Marca', x => x.marca],
      ['Motivo', x => x.motivo],
      ['Defeito encontrado', x => x.defeito_encontrado],
      ['Testes realizados', x => x.testes_realizados],
      ['Responsável', x => x.usuario],
    ],
    linhas: () => baixas.listarParaExportar(),
  },
};

router.get(
  '/relatorios/exportar/:conjunto',
  exigir('relatorios.exportar'),
  h(async (req, res) => {
    const conjunto = Object.hasOwn(CONJUNTOS, req.params.conjunto) ? CONJUNTOS[req.params.conjunto] : null;
    if (!conjunto) throw err(404, 'Relatório inexistente');
    const formato = FORMATOS.optional().parse(req.query.formato) ?? 'xlsx';
    const nome = `${req.params.conjunto}-${new Date().toISOString().slice(0, 10)}`;
    await exportar(res, formato, nome, conjunto.titulo, conjunto.colunas, await conjunto.linhas(req.query));
  }),
);

export default router;
