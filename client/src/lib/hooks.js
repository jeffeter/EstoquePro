import { useEffect, useState, useCallback, useRef } from 'react';
import { api } from './api.js';

export function useLoad(path, deps = []) {
  const [data, setData] = useState([]);
  const [erro, setErro] = useState('');
  const seq = useRef(0);
  const load = useCallback(() => {
    if (!path) return Promise.resolve();
    const n = ++seq.current;
    return api(path)
      .then(d => {
        if (n === seq.current) {
          setData(d);
          setErro('');
        }
      })
      .catch(e => {
        if (n === seq.current) setErro(e.message);
      });
  }, [path]);
  useEffect(() => {
    load();
  }, [load, ...deps]);
  return [data, load, erro];
}

export function useTema() {
  const [t, setT] = useState(() => document.documentElement.dataset.tema || 'claro');
  const alternar = () => {
    const n = t === 'escuro' ? 'claro' : 'escuro';
    setT(n);
    document.documentElement.dataset.tema = n;
    try {
      localStorage.setItem('tema', n);
    } catch {
      /* navegador sem armazenamento */
    }
  };
  return [t, alternar];
}

export function usePagina(rows, chave, tam = 10) {
  const [p, setP] = useState(1);
  useEffect(() => {
    setP(1);
  }, [chave]); 
  const total = Math.max(1, Math.ceil(rows.length / tam)),
    pg = Math.min(p, total);
  return { itens: rows.slice((pg - 1) * tam, pg * tam), pg, total, tam, n: rows.length, ir: setP };
}

export function useDebounced(v, ms = 300) {
  const [d, setD] = useState(v);
  useEffect(() => {
    const t = setTimeout(() => setD(v), ms);
    return () => clearTimeout(t);
  }, [v, ms]);
  return d;
}

export function useFiltros(inicial = {}) {
  const [f, setF] = useState(inicial);
  const set = (k, v) => setF(p => ({ ...p, [k]: v }));
  return { f, set, limpar: () => setF({}), ativos: Object.values(f).filter(v => v !== '' && v != null && v !== false).length };
}
