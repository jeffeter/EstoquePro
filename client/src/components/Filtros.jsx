import { Icon } from './icons.jsx';

export const BarraFiltros = ({ ativos, onLimpar, resumo, children }) => (
  <div className="filtros">
    {children}
    {ativos > 0 && (
      <button type="button" className="branco" onClick={onLimpar}>
        <Icon n="atualizar" s={15} />
        Limpar filtros ({ativos})
      </button>
    )}
    {resumo && <span className="resumo">{resumo}</span>}
  </div>
);

export const Sel = ({ l, v, on, opts, vazio = 'Todos' }) => (
  <label>
    {l}
    <select value={v ?? ''} onChange={e => on(e.target.value)}>
      <option value="">{vazio}</option>
      {opts.map(o =>
        typeof o === 'string' ? (
          <option key={o} value={o}>
            {o}
          </option>
        ) : (
          <option key={o.v} value={o.v}>
            {o.t}
          </option>
        ),
      )}
    </select>
  </label>
);
