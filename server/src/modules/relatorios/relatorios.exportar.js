
import ExcelJS from 'exceljs';
import { tabelaPdf } from '../../pdf/index.js';

const neutralizar = v => (typeof v === 'string' && /^[=+\-@\t\r]/.test(v) ? "'" + v : v);

const tag = t =>
  t
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^A-Za-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .replace(/^(\d)/, '_$1') || 'campo';

const xml = v =>
  String(v)
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');

/**
 * @param {import('express').Response} res
 * @param {'csv'|'xlsx'|'pdf'|'xml'} formato
 * @param {string} nome   
 * @param {string} titulo
 * @param {Array<[string, (linha:any)=>any]>} colunas  
 * @param {any[]} linhas
 */
export async function exportar(res, formato, nome, titulo, colunas, linhas) {
  const bruto = linhas.map(l => colunas.map(([, f]) => f(l) ?? ''));

  if (formato === 'pdf')
    return tabelaPdf(
      res,
      nome,
      titulo,
      colunas.map(c => c[0]),
      bruto,
    );

  if (formato === 'xml') {
    const tags = colunas.map(c => tag(c[0]));
    const corpo =
      `<?xml version="1.0" encoding="UTF-8"?>\n<relatorio titulo="${xml(titulo)}" gerado_em="${new Date().toISOString()}" total="${linhas.length}">\n` +
      bruto.map(l => `  <registro>${l.map((v, i) => `<${tags[i]}>${xml(v)}</${tags[i]}>`).join('')}</registro>`).join('\n') +
      '\n</relatorio>\n';
    res.setHeader('Content-Type', 'application/xml; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${nome}.xml"`);
    return res.send(corpo);
  }

  const seguras = bruto.map(l => l.map(neutralizar));

  if (formato === 'csv') {
    const aspas = v => `"${String(v).replace(/"/g, '""')}"`;
    const csv = '\uFEFF' + [colunas.map(c => aspas(c[0])), ...seguras.map(l => l.map(aspas))].map(l => l.join(';')).join('\r\n');
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${nome}.csv"`);
    return res.send(csv);
  }

  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet(nome.slice(0, 31)); 
  ws.addRow(colunas.map(c => c[0])).font = { bold: true };
  seguras.forEach(l => ws.addRow(l));
  ws.columns.forEach(c => {
    c.width = 20;
  });
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename="${nome}.xlsx"`);
  await wb.xlsx.write(res);
  res.end();
}
