import { BarraFiltros, Sel } from '../components/Filtros.jsx';
import { Paginacao } from '../components/Paginacao.jsx';
import { Table } from '../components/Table.jsx';
import { ST } from '../lib/constantes.js';
import { clean, fd } from '../lib/formatacao.js';
import { useDebounced, useFiltros, useLoad, usePagina } from '../lib/hooks.js';

export function Relatorios({ filiais, pode }) {
  const { f, set, limpar, ativos } = useFiltros();
  const busca = useDebounced(f.busca ?? '');
  const qs = new URLSearchParams(clean({ ...f, busca })).toString();
  const fb = useFiltros();
  const buscaB = useDebounced(fb.f.busca ?? '');
  const qsB = new URLSearchParams(clean({ ...fb.f, busca: buscaB })).toString();
  const [mov, , erroMov] = useLoad('/relatorios/movimentacoes' + (qs ? '?' + qs : ''));
  const [qt] = useLoad('/relatorios/quantitativo');
  const [baixas, , erroBx] = useLoad('/baixas' + (qsB ? '?' + qsB : ''));
  const pagMov = usePagina(mov, qs),
    pagBx = usePagina(baixas, qsB);
  const podeExp = pode('relatorios.exportar');
  const exp = (c, extra = '') =>
    !podeExp
      ? null
      : [
          ['xlsx', 'Excel'],
          ['csv', 'CSV'],
          ['pdf', 'PDF'],
          ['xml', 'XML'],
        ].map(([fm, t]) => (
          <a key={fm} className="btn" href={`/api/relatorios/exportar/${c}?formato=${fm}${extra}`}>
            {t}
          </a>
        ));
  return (
    <>
      <div className="card">
        <h3>Entradas e saídas</h3>
        {erroMov && <p className="erro">{erroMov}</p>}
        <BarraFiltros
          ativos={ativos}
          onLimpar={limpar}
          resumo={
            mov.length
              ? `${mov.length} registro(s)${mov.length >= 1000 ? ' — limite de 1000, refine o período' : ''}`
              : 'Nenhum registro encontrado'
          }
        >
          <label>
            Buscar
            <input
              placeholder="Patrimônio, item, setor ou chamado"
              style={{ width: 260 }}
              value={f.busca ?? ''}
              onChange={e => set('busca', e.target.value)}
            />
          </label>
          <label>
            De
            <input type="date" value={f.de ?? ''} onChange={e => set('de', e.target.value)} />
          </label>
          <label>
            Até
            <input type="date" value={f.ate ?? ''} onChange={e => set('ate', e.target.value)} />
          </label>
          <Sel
            l="Tipo"
            v={f.tipo}
            on={v => set('tipo', v)}
            opts={[
              { v: 'entrada', t: 'Entrada' },
              { v: 'saida', t: 'Saída' },
              { v: 'baixa', t: 'Baixa' },
            ]}
          />
          <Sel l="Filial" v={f.filial_id} on={v => set('filial_id', v)} opts={filiais.map(x => ({ v: x.id, t: x.nome }))} />
        </BarraFiltros>
        <div style={{ display: 'flex', gap: 6, margin: '10px 0', alignItems: 'center', flexWrap: 'wrap' }}>
          {exp('movimentacoes', qs ? '&' + qs : '')}
          <button className="sec" onClick={() => window.print()}>
            Imprimir
          </button>
        </div>
        <Table
          cols={[
            ['Data', r => fd(r.data)],
            ['Tipo', r => r.tipo],
            ['Patrimônio', r => r.patrimonio],
            ['Item', r => r.item],
            ['Qtd', r => r.quantidade ?? 1],
            ['Origem', r => r.origem],
            ['Destino', r => r.destino],
            ['Chamado', r => r.chamado],
            ['Obs.', r => r.observacao],
          ]}
          rows={pagMov.itens}
        />
        <Paginacao pag={pagMov} />
      </div>
      {podeExp && (
        <div className="card">
          <h3>Exportar cadastros</h3>Equipamentos: {exp('equipamentos')} &nbsp; Consumíveis: {exp('consumiveis')} &nbsp; Baixas:{' '}
          {exp('baixas')}
        </div>
      )}
      <div className="card">
        <h3>Quantitativo — equipamentos</h3>
        <Table
          cols={[
            ['Tipo', r => r.tipo],
            ['Status', r => ST[r.status]],
            ['Filial', r => r.filial],
            ['Total', r => r.total],
          ]}
          rows={qt.equipamentos || []}
        />
        <h3>Quantitativo — consumíveis</h3>
        <Table
          rowClass={r => (r.baixo ? 'baixo' : '')}
          cols={[
            ['Tipo', r => r.tipo],
            ['Nome', r => r.nome],
            ['Qtd', r => r.quantidade],
          ]}
          rows={qt.consumiveis || []}
        />
      </div>
      <div className="card">
        <h3>Equipamentos baixados</h3>
        {erroBx && <p className="erro">{erroBx}</p>}
        <BarraFiltros
          ativos={fb.ativos}
          onLimpar={fb.limpar}
          resumo={baixas.length ? `${baixas.length} baixa(s)` : 'Nenhuma baixa encontrada'}
        >
          <label>
            Buscar
            <input
              placeholder="Patrimônio, tipo, marca, motivo ou defeito"
              style={{ width: 300 }}
              value={fb.f.busca ?? ''}
              onChange={e => fb.set('busca', e.target.value)}
            />
          </label>
          <label>
            De
            <input type="date" value={fb.f.de ?? ''} onChange={e => fb.set('de', e.target.value)} />
          </label>
          <label>
            Até
            <input type="date" value={fb.f.ate ?? ''} onChange={e => fb.set('ate', e.target.value)} />
          </label>
        </BarraFiltros>
        <Table
          cols={[
            ['Patrimônio', r => r.patrimonio],
            ['Tipo', r => `${r.tipo} ${r.marca || ''}`],
            ['Data', r => fd(r.data_baixa)],
            ['Motivo', r => r.motivo],
            ['Defeito', r => r.defeito_encontrado],
          ]}
          rows={pagBx.itens}
          actions={r => (
            <button className="sec" onClick={() => window.open(`/api/baixas/${r.id}/laudo`, '_blank')}>
              🖨 Laudo
            </button>
          )}
        />
        <Paginacao pag={pagBx} nome="baixas" />
      </div>
    </>
  );
}
