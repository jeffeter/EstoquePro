import { useEffect, useState, useRef } from 'react';
import { Icon } from './icons.jsx';

export function Menu({ rotulo, icone, classe = 'sec', titulo, children }) {
  const [pos, setPos] = useState(null);
  const ref = useRef(null);
  useEffect(() => {
    if (!pos) return;
    const fecha = e => {
        if (e.type === 'keydown' ? e.key === 'Escape' : !ref.current?.contains(e.target)) setPos(null);
      },
      rola = () => setPos(null);
    document.addEventListener('mousedown', fecha);
    document.addEventListener('keydown', fecha);
    window.addEventListener('scroll', rola, true);
    window.addEventListener('resize', rola);
    return () => {
      document.removeEventListener('mousedown', fecha);
      document.removeEventListener('keydown', fecha);
      window.removeEventListener('scroll', rola, true);
      window.removeEventListener('resize', rola);
    };
  }, [!!pos]);
  const abrir = e => {
    if (pos) return setPos(null);
    const r = e.currentTarget.getBoundingClientRect();
    setPos({ top: r.bottom + 6, right: Math.max(8, window.innerWidth - r.right) });
  };
  return (
    <span className="menu" ref={ref}>
      <button type="button" className={classe} aria-haspopup="menu" aria-expanded={!!pos} title={titulo} onClick={abrir}>
        {icone && <Icon n={icone} s={16} />}
        {rotulo}
        <Icon n="seta" s={14} />
      </button>
      {pos && (
        <div className="menu-lista" role="menu" style={{ top: pos.top, right: pos.right }} onClick={() => setPos(null)}>
          {children}
        </div>
      )}
    </span>
  );
}
