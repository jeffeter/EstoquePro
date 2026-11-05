import { useEffect, useState, useRef } from 'react';
import jsQR from 'jsqr';
import { api } from '../lib/api.js';

export function Scanner({ onFound }) {
  const vid = useRef(),
    cv = useRef(),
    raf = useRef(),
    stream = useRef();
  const [ativo, setAtivo] = useState(false);
  const [msg, setMsg] = useState('');
  const [man, setMan] = useState('');
  const temCamera = !!navigator.mediaDevices?.getUserMedia;
  const parar = () => {
    cancelAnimationFrame(raf.current);
    stream.current?.getTracks().forEach(t => t.stop());
    stream.current = null;
    setAtivo(false);
  };
  useEffect(() => parar, []);
  const achou = async codigo => {
    parar();
    navigator.vibrate?.(80);
    try {
      await api('/patrimonio/' + encodeURIComponent(codigo));
      onFound(codigo);
    } catch (e) {
      setMsg(e.status === 404 ? `Patrimônio "${codigo.slice(0, 60)}" não encontrado no estoque.` : e.message);
    }
  };
  const loop = () => {
    const v = vid.current,
      c = cv.current;
    if (v && c && v.readyState === v.HAVE_ENOUGH_DATA && v.videoWidth) {
      const k = Math.min(1, 640 / v.videoWidth);
      c.width = v.videoWidth * k;
      c.height = v.videoHeight * k;
      const x = c.getContext('2d', { willReadFrequently: true });
      x.drawImage(v, 0, 0, c.width, c.height);
      const img = x.getImageData(0, 0, c.width, c.height),
        r = jsQR(img.data, img.width, img.height);
      if (r?.data) return achou(r.data.trim());
    }
    raf.current = requestAnimationFrame(loop);
  };
  const iniciar = async () => {
    setMsg('');
    try {
      const s = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' } }, audio: false });
      stream.current = s;
      vid.current.srcObject = s;
      await vid.current.play();
      setAtivo(true);
      loop();
    } catch (e) {
      parar();
      setMsg(
        'Não foi possível abrir a câmera: ' +
          (e.name === 'NotAllowedError' ? 'permissão negada (libere a câmera no navegador).' : e.message),
      );
    }
  };
  const daFoto = f => {
    const img = new Image();
    img.onload = () => {
      const c = document.createElement('canvas'),
        k = Math.min(1, 1400 / Math.max(img.width, img.height));
      c.width = img.width * k;
      c.height = img.height * k;
      const x = c.getContext('2d');
      x.drawImage(img, 0, 0, c.width, c.height);
      const d = x.getImageData(0, 0, c.width, c.height),
        r = jsQR(d.data, d.width, d.height);
      URL.revokeObjectURL(img.src);
      r?.data ? achou(r.data.trim()) : setMsg('Não encontrei um QR code na foto. Aproxime a etiqueta e tente de novo.');
    };
    img.src = URL.createObjectURL(f);
  };
  return (
    <div className="card" style={{ maxWidth: 560 }}>
      <h3>Leitor de QR code</h3>
      {!temCamera && (
        <p className="erro">
          A câmera ao vivo exige HTTPS (ou localhost). Use "Tirar foto da etiqueta" abaixo, digite o patrimônio, ou abra o sistema com{' '}
          <code>npm run dev:celular</code>.
        </p>
      )}
      <video
        ref={vid}
        playsInline
        muted
        style={{ width: '100%', borderRadius: 8, background: '#000', display: ativo ? 'block' : 'none' }}
      />
      <canvas ref={cv} style={{ display: 'none' }} />
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', margin: '10px 0' }}>
        {!ativo ? (
          <button disabled={!temCamera} onClick={iniciar}>
            Abrir câmera
          </button>
        ) : (
          <button className="red" onClick={parar}>
            Parar câmera
          </button>
        )}
        <label className="btn" style={{ background: '#475569', cursor: 'pointer', flexDirection: 'row', fontSize: 14 }}>
          Tirar foto da etiqueta
          <input
            type="file"
            accept="image/*"
            capture="environment"
            hidden
            onChange={e => {
              const f = e.target.files[0];
              e.target.value = '';
              if (f) daFoto(f);
            }}
          />
        </label>
      </div>
      {ativo && <p>Aponte a câmera para o QR code da etiqueta…</p>}
      {msg && <p className="erro">{msg}</p>}
      <form
        onSubmit={e => {
          e.preventDefault();
          if (man.trim()) achou(man.trim());
        }}
      >
        <label>
          Ou digite o patrimônio
          <input value={man} onChange={e => setMan(e.target.value)} placeholder="Ex.: NB-001" />
        </label>
        <button>Buscar</button>
      </form>
    </div>
  );
}
