import { useEffect, useState, useRef } from 'react';
import { Icon } from './icons.jsx';
import { clean } from '../lib/formatacao.js';

export function Form({ fields, onSubmit, label = 'Salvar', icone, initial, padrao, onCancel, className, children }) {
  const [v, setV] = useState(() => ({
    ...padrao,
    ...Object.fromEntries(fields.filter(f => initial?.[f.n] != null).map(f => [f.n, initial[f.n]])),
  }));
  const [erro, setErro] = useState('');
  const tocado = useRef(new Set());
  const padraoRef = useRef(padrao);
  padraoRef.current = padrao;
  const set = (n, x) => {
    tocado.current.add(n);
    setV(p => ({ ...p, [n]: x }));
  };
  const restaurar = n => {
    tocado.current.delete(n);
    setV(p => ({ ...p, [n]: padraoRef.current[n] }));
  };
  useEffect(() => {
    if (padrao)
      setV(p => {
        const n = { ...p };
        for (const [k, x] of Object.entries(padrao)) if (!tocado.current.has(k)) n[k] = x;
        return n;
      });
  }, [JSON.stringify(padrao)]);
  return (
    <form
      className={className}
      onSubmit={async e => {
        e.preventDefault();
        setErro('');
        try {
          await onSubmit(clean(v));
          if (!initial) {
            tocado.current.clear();
            setV({ ...padraoRef.current });
          }
        } catch (x) {
          setErro(x.message);
        }
      }}
    >
      {fields.map(f => {
        const sug = f.auto && padrao?.[f.n],
          igual = sug && (v[f.n] ?? '') === sug;
        const campo = f.opts ? (
          <select required={f.req} value={v[f.n] ?? ''} onChange={e => set(f.n, e.target.value)}>
            <option value="">—</option>
            {f.opts.map(o => (
              <option key={o.v ?? o} value={o.v ?? o}>
                {o.t ?? o}
              </option>
            ))}
          </select>
        ) : f.area ? (
          <textarea rows={3} placeholder={f.ph} required={f.req} value={v[f.n] ?? ''} onChange={e => set(f.n, e.target.value)} />
        ) : (
          <input
            type={f.t || 'text'}
            placeholder={f.ph}
            required={f.req}
            min={f.t === 'number' ? 0 : undefined}
            className={igual ? 'sugerido' : undefined}
            value={v[f.n] ?? ''}
            onChange={e => set(f.n, e.target.value)}
          />
        );
        return (
          <label key={f.n} className={f.cls}>
            <span className="rotulo">
              {f.l}
              {f.req && <span className="req">*</span>}
            </span>
            {f.auto ? (
              <span className="campo-auto">
                {campo}
                {igual && (
                  <em className="badge-auto">
                    <Icon n="brilho" s={13} />
                    Sugestão automática
                  </em>
                )}
              </span>
            ) : (
              campo
            )}
            {sug && !igual && (
              <small className="dica">
                Número alterado manualmente ·{' '}
                <button type="button" className="link" onClick={() => restaurar(f.n)}>
                  usar sugestão {sug}
                </button>
              </small>
            )}
          </label>
        );
      })}
      {children}
      <button>
        {icone && <Icon n={icone} s={17} />}
        {label}
      </button>
      {onCancel && (
        <button type="button" className="sec" onClick={onCancel}>
          Cancelar
        </button>
      )}
      {erro && <span className="erro">{erro}</span>}
    </form>
  );
}
