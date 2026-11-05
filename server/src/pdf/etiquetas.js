import PDFDocument from 'pdfkit';
import QRCode from 'qrcode';
import fs from 'fs';
import { LOGO, mm } from './comum.js';

const MODELOS = {
  folha: {
    w: 63.5,
    h: 38.1,
    cols: 3,
    rows: 7,
    left: 7.2,
    top: 15.1,
    gapx: 2.5,
  },
  termica: { w: 60, h: 40 },
};
function ajusta(d, txt, fonte, max, largura) {
  let s = max;
  d.font(fonte);
  while (s > 4.5 && (d.fontSize(s), d.widthOfString(txt)) > largura) s -= 0.5;
  return s;
}
const CONTORNO = true;

function desenha(d, x, y, W, H, it, qr) {
  const pad = mm(2.5);
  if (CONTORNO)
    d.save()
      .lineWidth(0.6)
      .roundedRect(x + 0.5, y + 0.5, W - 1, H - 1, mm(3))
      .stroke('#6b7280')
      .restore();
  const xDiv = x + W * 0.46;

  if (fs.existsSync(LOGO)) {
    const zx = x + pad,
      zw = xDiv - pad * 0.8 - zx,
      im = d.openImage(LOGO),
      k = Math.min(zw / im.width, (H - 2 * pad) / im.height),
      lw = im.width * k,
      lh = im.height * k;
    d.image(LOGO, zx + (zw - lw) / 2, y + (H - lh) / 2, {
      width: lw,
      height: lh,
    });
  }
  d.save()
    .lineWidth(0.9)
    .moveTo(xDiv, y + pad * 1.4)
    .lineTo(xDiv, y + H - pad * 1.4)
    .stroke('#111')
    .restore(); 

    const rx = xDiv + pad * 0.9,
    rw = x + W - pad - rx,
    rotulo = 6.5,
    folga = mm(1.4);
  const s = ajusta(d, it.patrimonio, 'Helvetica-Bold', 18, rw),
    tq = Math.min(rw, H - 2 * pad - folga - rotulo - 1.5 - s);
  const topo = y + (H - (tq + folga + rotulo + 1.5 + s)) / 2;
  d.image(qr, rx + (rw - tq) / 2, topo, { width: tq, height: tq });
  d.fillColor('#444')
    .font('Helvetica')
    .fontSize(rotulo)
    .text('PATRIMÔNIO', rx, topo + tq + folga, {
      width: rw,
      align: 'center',
      characterSpacing: 0.8,
      lineBreak: false,
    });
  d.fillColor('#000')
    .font('Helvetica-Bold')
    .fontSize(s)
    .text(it.patrimonio, rx, topo + tq + folga + rotulo + 1.5, {
      width: rw,
      align: 'center',
      lineBreak: false,
    });
}

export async function etiquetas(res, itens, modelo) {
  const M = MODELOS[modelo] ?? MODELOS.folha,
    folha = modelo !== 'termica';
  const W = mm(M.w),
    H = mm(M.h);
  const d = new PDFDocument({ autoFirstPage: false, margin: 0 });
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `inline; filename="etiquetas-${folha ? 'folha-a4' : 'termica'}.pdf"`);
  d.pipe(res);
  const por = folha ? M.cols * M.rows : 1;
  for (let i = 0; i < itens.length; i++) {
    if (i % por === 0) d.addPage(folha ? { size: 'A4', margin: 0 } : { size: [W, H], margin: 0 });
    const qr = await QRCode.toBuffer(itens[i].patrimonio, {
      margin: 1,
      width: 320,
      errorCorrectionLevel: 'M',
    });
    if (folha) {
      const k = i % por;
      desenha(d, mm(M.left) + (k % M.cols) * (W + mm(M.gapx)), mm(M.top) + Math.floor(k / M.cols) * H, W, H, itens[i], qr);
    } else desenha(d, 0, 0, W, H, itens[i], qr);
  }
  if (!itens.length) d.addPage().text('Nenhum equipamento selecionado.', 50, 50);
  d.end();
}
