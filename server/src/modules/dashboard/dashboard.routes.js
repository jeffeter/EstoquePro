/** Painel: indicadores, gráficos e alertas. Uma única chamada, várias consultas em paralelo. */
import { Router } from 'express';
import { ROTULO_STATUS } from '../../config/constantes.js';
import { q } from '../../db/pool.js';
import { h } from '../../lib/async.js';
import { exigir } from '../../middleware/autenticacao.js';
import { alertasGarantia } from '../equipamentos/equipamentos.service.js';

const router = Router();

router.get(
  '/garantias/alertas',
  exigir('painel.ver'),
  h(async (req, res) => res.json(await alertasGarantia())),
);

router.get(
  '/dashboard',
  exigir('painel.ver'),
  h(async (req, res) => {
    const [st, tp, fl, mv, al, ven, co, bx] = await Promise.all([
      q(`SELECT status, COUNT(*)::int total FROM equipamentos GROUP BY 1`),
      q(`SELECT tipo, COUNT(*)::int total FROM equipamentos WHERE status<>'baixado' GROUP BY 1 ORDER BY 2 DESC LIMIT 8`),
      q(
        `SELECT COALESCE(f.nome,'-') nome, COUNT(*)::int total FROM equipamentos e LEFT JOIN filiais f ON f.id=e.filial_atual_id WHERE e.status<>'baixado' GROUP BY 1 ORDER BY 2 DESC LIMIT 8`,
      ),
      q(`SELECT to_char(d,'DD/MM') dia, COUNT(m.id) FILTER (WHERE m.tipo='entrada' AND m.equipamento_id IS NOT NULL)::int entradas, COUNT(m.id) FILTER (WHERE m.tipo='saida' AND m.equipamento_id IS NOT NULL)::int saidas
       FROM generate_series(CURRENT_DATE-13, CURRENT_DATE, '1 day') d LEFT JOIN movimentacoes m ON m.data::date=d::date GROUP BY d ORDER BY d`),
      alertasGarantia(),
      q(`SELECT COUNT(*)::int n FROM equipamentos WHERE status<>'baixado' AND garantia_ate < CURRENT_DATE`),
      q(`SELECT id,tipo,nome,quantidade,minimo FROM consumiveis WHERE ativo AND quantidade<=minimo ORDER BY quantidade, tipo`),
      q(`SELECT COUNT(*)::int n FROM baixas WHERE data_baixa >= date_trunc('month', CURRENT_DATE)`),
    ]);
    const porStatus = Object.fromEntries(st.rows.map(x => [x.status, x.total]));
    const ativos = st.rows.filter(x => x.status !== 'baixado').reduce((soma, x) => soma + x.total, 0);
    res.json({
      kpis: {
        ativos,
        disponivel: porStatus.disponivel ?? 0,
        em_uso: porStatus.em_uso ?? 0,
        manutencao: porStatus.manutencao ?? 0,
        aguardando: (porStatus.aguardando_baixa ?? 0) + (porStatus.aguardando_teste ?? 0),
        garantia_15d: al.length,
        garantia_vencida: ven.rows[0].n,
        baixados_mes: bx.rows[0].n,
        consumiveis_baixos: co.rows.length,
      },
      status: st.rows.filter(x => x.status !== 'baixado').map(x => ({ nome: ROTULO_STATUS[x.status], total: x.total })),
      tipos: tp.rows.map(x => ({ nome: x.tipo, total: x.total })),
      filiais: fl.rows,
      mov14: mv.rows,
      alertas: al,
      consumiveis_baixos: co.rows,
    });
  }),
);

export default router;
