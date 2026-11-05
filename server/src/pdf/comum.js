import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { env } from '../config/env.js';
export const LOGO = path.join(path.dirname(fileURLToPath(import.meta.url)), '../../assets/logo.png');
export const TZ = env.TZ_EXIBICAO;
export const MESES = [
  'janeiro',
  'fevereiro',
  'março',
  'abril',
  'maio',
  'junho',
  'julho',
  'agosto',
  'setembro',
  'outubro',
  'novembro',
  'dezembro',
];
export const L = n => '_'.repeat(n);
export const mm = v => v * 2.83465;
export function partes(v) {
  if (!v) return null;
  if (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v)) {
    const [y, m, d] = v.split('-').map(Number);
    return { y, m, d };
  }
  const x = new Date(v);
  return { y: x.getFullYear(), m: x.getMonth() + 1, d: x.getDate() };
}
export const curta = v => {
  const p = partes(v);
  return p ? `${String(p.d).padStart(2, '0')}/${String(p.m).padStart(2, '0')}/${p.y}` : '-';
};
export const extenso = v => {
  const p = partes(v);
  return p ? `${p.d} de ${MESES[p.m - 1]} de ${p.y}` : null;
};
export const dataHora = v => new Date(v).toLocaleString('pt-BR', { timeZone: TZ });

export function base(res, nome, titulo) {
  const d = new PDFDocument({ size: 'A4', margin: 50 });
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `inline; filename="${nome.replace(/[^\w.-]/g, '_')}.pdf"`);
  d.pipe(res);
  if (fs.existsSync(LOGO)) d.image(LOGO, 50, 38, { width: 70 });
  d.font('Helvetica-Oblique').fontSize(18).text('Simplifique Home Center', 135, 68);
  d.moveTo(50, 118).lineTo(545, 118).lineWidth(1).stroke();
  d.font('Helvetica-Bold').fontSize(13).text(titulo, 50, 135, { width: 495, align: 'center' });
  d.x = 50;
  d.y = 175;
  d.fontSize(10.5);
  return d;
}
export const secao = (d, t) => {
  d.moveDown(0.6).font('Helvetica-Bold').text(t, 50, d.y, { width: 495 }).moveDown(0.3);
};
export const campo = (d, k, v) => {
  d.font('Helvetica-Bold')
    .text(k + ': ', 50, d.y, { continued: true, width: 495 })
    .font('Helvetica')
    .text(String(v ?? '-'), { continued: false })
    .moveDown(0.3);
};
export const bloco = (d, t, v) => {
  secao(d, t);
  d.font('Helvetica').text(v || '-', 50, d.y, {
    width: 495,
    align: 'justify',
  });
};
export function assinaturas(d, a, b, sig) {
  const y = d.y + 55;
  if (sig)
    d.image(sig, 70, y - 50, {
      fit: [170, 48],
      align: 'center',
      valign: 'bottom',
    });
  d.moveTo(60, y).lineTo(250, y).moveTo(330, y).lineTo(520, y).lineWidth(0.7).stroke();
  d.font('Helvetica')
    .fontSize(10)
    .text(a, 60, y + 4, { width: 190, align: 'center' })
    .text(b, 330, y + 4, { width: 190, align: 'center' });
  d.y = y + 30;
}
