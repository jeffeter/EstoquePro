import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Icon } from './icons.jsx';

export function Modal({ titulo, icone, perigo, sub, largo, fecharNoFundo, onClose, children }) {
  const ref = useRef(null),
    fechar = useRef(onClose);
  fechar.current = onClose;
  useEffect(() => {
    const anterior = document.activeElement,
      corpo = document.body,
      overflow = corpo.style.overflow;
    corpo.style.overflow = 'hidden';
    const focaveis = () =>
      [
        ...ref.current.querySelectorAll(
          'a[href],button:not(:disabled),input:not(:disabled),select:not(:disabled),textarea:not(:disabled),canvas',
        ),
      ].filter(e => (e.tagName === 'CANVAS' ? false : e.getClientRects().length));
    const tecla = e => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        fechar.current();
      }
      if (e.key === 'Tab' && ref.current) {
        const f = focaveis();
        if (!f.length) return;
        const i = f.indexOf(document.activeElement);
        if (e.shiftKey && i <= 0) {
          e.preventDefault();
          f[f.length - 1].focus();
        } else if (!e.shiftKey && (i === f.length - 1 || i < 0)) {
          e.preventDefault();
          f[0].focus();
        }
      }
    };
    document.addEventListener('keydown', tecla);
    const t = setTimeout(
      () =>
        (
          ref.current?.querySelector('.modal-corpo input:not([type=checkbox]), .modal-corpo select, .modal-corpo textarea') ??
          ref.current?.querySelector('.modal-corpo button, .modal-x')
        )?.focus(),
      40,
    );
    return () => {
      clearTimeout(t);
      document.removeEventListener('keydown', tecla);
      corpo.style.overflow = overflow;
      if (anterior?.isConnected) anterior.focus?.();
    };
  }, []);
  return createPortal(
    <div
      className="modal-fundo"
      onMouseDown={e => {
        if (fecharNoFundo && e.target === e.currentTarget) onClose();
      }}
    >
      <div className={'modal' + (largo ? ' largo' : '')} role="dialog" aria-modal="true" aria-label={titulo} ref={ref}>
        <div className="modal-topo">
          <span className={'modal-icone' + (perigo ? ' perigo' : '')}>
            <Icon n={icone} s={22} />
          </span>
          <div>
            <h2>{titulo}</h2>
            {sub && <div className="modal-sub">{sub}</div>}
          </div>
          <button type="button" className="modal-x" onClick={onClose} aria-label="Fechar" title="Fechar (Esc)">
            <Icon n="x" s={18} />
          </button>
        </div>
        <div className="modal-corpo">{children}</div>
      </div>
    </div>,
    document.body,
  );
}
