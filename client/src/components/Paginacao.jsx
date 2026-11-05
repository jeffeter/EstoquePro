import { Fragment } from 'react';
import { Icon } from './icons.jsx';

export const Paginacao = ({ pag, nome = 'registros' }) => {
  if (!pag.n) return null;
  const { pg, total } = pag;
  const nums =
    total <= 7
      ? Array.from({ length: total }, (_, i) => i + 1)
      : [...new Set([1, pg - 1, pg, pg + 1, total].filter(x => x >= 1 && x <= total))].sort((a, b) => a - b);
  return (
    <div className="paginacao">
      <span>
        Mostrando <b>{(pg - 1) * pag.tam + 1}</b> a <b>{Math.min(pg * pag.tam, pag.n)}</b> de <b>{pag.n}</b> {nome}
      </span>
      <div className="pager">
        <button type="button" disabled={pg <= 1} aria-label="Página anterior" onClick={() => pag.ir(pg - 1)}>
          <Icon n="esq" />
        </button>
        {nums.map((x, i) => (
          <Fragment key={x}>
            {i > 0 && x - nums[i - 1] > 1 && <span>…</span>}
            <button
              type="button"
              className={x === pg ? 'on' : ''}
              aria-label={'Página ' + x}
              aria-current={x === pg ? 'page' : undefined}
              onClick={() => pag.ir(x)}
            >
              {x}
            </button>
          </Fragment>
        ))}
        <button type="button" disabled={pg >= total} aria-label="Próxima página" onClick={() => pag.ir(pg + 1)}>
          <Icon n="dir" />
        </button>
      </div>
    </div>
  );
};
