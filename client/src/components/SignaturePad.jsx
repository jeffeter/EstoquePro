import { useRef } from 'react';

export function SignaturePad({ onChange }) {
  const ref = useRef();
  const down = useRef(false);
  const pos = e => {
    const c = ref.current,
      r = c.getBoundingClientRect();
    return [((e.clientX - r.left) * c.width) / r.width, ((e.clientY - r.top) * c.height) / r.height];
  };
  const ctx = () => {
    const x = ref.current.getContext('2d');
    x.lineWidth = 2.6;
    x.lineCap = 'round';
    x.lineJoin = 'round';
    x.strokeStyle = '#111';
    return x;
  };
  return (
    <div style={{ width: '100%' }}>
      <canvas
        ref={ref}
        width={500}
        height={160}
        className="sigpad"
        onPointerDown={e => {
          e.preventDefault();
          ref.current.setPointerCapture(e.pointerId);
          down.current = true;
          const x = ctx(),
            [px, py] = pos(e);
          x.beginPath();
          x.moveTo(px, py);
          x.lineTo(px + 0.1, py + 0.1);
          x.stroke();
        }}
        onPointerMove={e => {
          if (!down.current) return;
          const x = ctx(),
            [px, py] = pos(e);
          x.lineTo(px, py);
          x.stroke();
        }}
        onPointerUp={() => {
          if (!down.current) return;
          down.current = false;
          onChange(ref.current.toDataURL('image/png'));
        }}
        onPointerCancel={() => {
          down.current = false;
        }}
      />
      <button
        type="button"
        className="sec"
        onClick={() => {
          ref.current.getContext('2d').clearRect(0, 0, 500, 160);
          onChange(null);
        }}
      >
        Limpar assinatura
      </button>
    </div>
  );
}
