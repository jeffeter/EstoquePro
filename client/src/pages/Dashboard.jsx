import { Table } from '../components/Table.jsx';
import { fd } from '../lib/formatacao.js';
import { useLoad } from '../lib/hooks.js';

export const Kpi = ({ n, l, c }) => (
  <div className={'kpi ' + (c || '')}>
    <b>{n}</b>
    <span>{l}</span>
  </div>
);

export function Bars({ rows, color = '#2563eb' }) {
  const max = Math.max(1, ...rows.map(r => r.total));
  return rows.length ? (
    rows.map(r => (
      <div className="bar" key={r.nome}>
        <span title={r.nome}>{r.nome}</span>
        <div>
          <i style={{ width: (r.total / max) * 100 + '%', background: color }} />
        </div>
        <b>{r.total}</b>
      </div>
    ))
  ) : (
    <p>Sem dados.</p>
  );
}

export function Dashboard() {
  const [d] = useLoad('/dashboard');
  if (!d.kpis) return null;
  const k = d.kpis;
  const max = Math.max(1, ...d.mov14.map(x => Math.max(x.entradas, x.saidas)));
  const hh = n => Math.max(2, (n / max) * 100);
  return (
    <>
      <div className="kpis">
        <Kpi n={k.ativos} l="Equipamentos ativos" />
        <Kpi n={k.disponivel} l="Disponíveis" c="ok" />
        <Kpi n={k.em_uso} l="Em uso" />
        <Kpi n={k.manutencao} l="Em manutenção" c="warn2" />
        <Kpi n={k.aguardando} l="Aguardando teste/baixa" c="warn2" />
        <Kpi n={k.garantia_15d} l="Garantia vence em 15 dias" c={k.garantia_15d ? 'warn2' : ''} />
        <Kpi n={k.garantia_vencida} l="Garantias vencidas" c={k.garantia_vencida ? 'bad' : ''} />
        <Kpi n={k.consumiveis_baixos} l="Consumíveis com estoque baixo" c={k.consumiveis_baixos ? 'bad' : 'ok'} />
        <Kpi n={k.baixados_mes} l="Baixas no mês" />
      </div>
      <div className="grid2">
        <div className="card">
          <h3>Equipamentos por status</h3>
          <Bars rows={d.status} color="#7c3aed" />
        </div>
        <div className="card">
          <h3>Equipamentos por tipo</h3>
          <Bars rows={d.tipos} />
        </div>
        <div className="card">
          <h3>Equipamentos por filial</h3>
          <Bars rows={d.filiais} color="#0891b2" />
        </div>
        <div className="card">
          <h3>
            Movimentação (14 dias)
            <span className="leg" style={{ color: '#16a34a' }}>
              ■ entradas
            </span>
            <span className="leg" style={{ color: '#2563eb' }}>
              ■ saídas
            </span>
          </h3>
          <div className="cols">
            {d.mov14.map(x => (
              <div key={x.dia} title={`${x.dia}: ${x.entradas} entradas, ${x.saidas} saídas`}>
                <div className="pair">
                  <i style={{ height: hh(x.entradas), background: '#16a34a' }} />
                  <i style={{ height: hh(x.saidas), background: '#2563eb' }} />
                </div>
                <small>{x.dia.slice(0, 2)}</small>
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className={'card ' + (d.alertas.length ? 'warn' : '')}>
        <h3>Garantias vencendo em até 15 dias — agendar vistoria/avaliação</h3>
        {d.alertas.length ? (
          <Table
            cols={[
              ['Patrimônio', r => r.patrimonio],
              ['Equipamento', r => `${r.tipo} ${r.marca || ''}`],
              ['Fornecedor', r => r.fornecedor],
              ['Vence em', r => fd(r.garantia_ate)],
              ['Dias', r => r.dias_restantes],
            ]}
            rows={d.alertas}
          />
        ) : (
          'Nenhum alerta.'
        )}
      </div>
      <div className={'card ' + (d.consumiveis_baixos.length ? 'alerta' : '')}>
        <h3>Consumíveis com estoque baixo</h3>
        {d.consumiveis_baixos.length ? (
          <Table
            cols={[
              ['Tipo', r => r.tipo],
              ['Item', r => r.nome],
              ['Qtd', r => <b>{r.quantidade}</b>],
              ['Mínimo', r => r.minimo],
            ]}
            rows={d.consumiveis_baixos}
          />
        ) : (
          'Tudo certo.'
        )}
      </div>
    </>
  );
}
