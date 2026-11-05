import PDFDocument from 'pdfkit';
import fs from 'fs';
import { LOGO, dataHora } from './comum.js';

export function tabelaPdf(res, nome, titulo, heads, linhas) {
  const d = new PDFDocument({ size: 'A4', layout: 'landscape', margin: 30 });
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${nome}.pdf"`);
  d.pipe(res);
  const W = d.page.width - 60,
    txt = v => String(v ?? '').slice(0, 300);
  const pesos = heads.map((h, i) => Math.min(30, Math.max(h.length, 4, ...linhas.slice(0, 200).map(l => txt(l[i]).length))));
  const soma = pesos.reduce((a, b) => a + b, 0),
    larg = pesos.map(p => (W * p) / soma);
  let y = 0;
  const topo = () => {
    if (fs.existsSync(LOGO)) d.image(LOGO, 30, 22, { width: 36 });
    d.font('Helvetica-Bold').fontSize(13).fillColor('#000').text(titulo, 75, 26, { lineBreak: false });
    d.font('Helvetica')
      .fontSize(8)
      .fillColor('#555')
      .text(`Emitido em ${dataHora(new Date())} — ${linhas.length} registro(s)`, 75, 44, { lineBreak: false })
      .fillColor('#000');
    y = 66;
    d.rect(30, y, W, 18).fill('#1f2937');
    d.fillColor('#fff').font('Helvetica-Bold').fontSize(8);
    let x = 30;
    heads.forEach((h, i) => {
      d.text(h, x + 3, y + 5, {
        width: larg[i] - 6,
        lineBreak: false,
        ellipsis: true,
      });
      x += larg[i];
    });
    d.fillColor('#000');
    y += 18;
  };
  topo();
  linhas.forEach((l, ri) => {
    d.font('Helvetica').fontSize(8);
    const h = Math.max(14, ...l.map((v, i) => d.heightOfString(txt(v), { width: larg[i] - 6 }) + 6));
    if (y + h > d.page.height - 40) {
      d.addPage();
      topo();
    }
    if (ri % 2) d.rect(30, y, W, h).fill('#f3f4f6');
    d.fillColor('#000');
    let x = 30;
    l.forEach((v, i) => {
      d.text(txt(v), x + 3, y + 3, { width: larg[i] - 6 });
      x += larg[i];
    });
    y += h;
  });
  if (!linhas.length) d.text('Nenhum registro.', 30, y + 8);
  d.end();
}
