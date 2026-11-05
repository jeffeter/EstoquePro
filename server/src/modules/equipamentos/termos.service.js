import crypto from 'node:crypto';
import { q } from '../../db/pool.js';
import { err } from '../../lib/erros.js';

const ASSINATURA_PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

export const dadosTermo = async equipamentoId =>
  (
    await q(
      `SELECT e.patrimonio,e.tipo,e.marca,e.observacao,e.avarias, COALESCE(fd.nome,f.nome) loja, m.setor, m.chamado, m.data
  FROM equipamentos e LEFT JOIN filiais f ON f.id=e.filial_atual_id
  LEFT JOIN LATERAL (SELECT * FROM movimentacoes WHERE equipamento_id=e.id AND tipo='saida' ORDER BY data DESC LIMIT 1) m ON true
  LEFT JOIN filiais fd ON fd.id=m.filial_destino_id WHERE e.id=$1`,
      [equipamentoId],
    )
  ).rows[0];

export async function assinar(equipamentoId, d, usuarioId, ip) {
  const png = Buffer.from(d.assinatura.split(',')[1], 'base64');
  if (png.length < 100 || !png.subarray(0, 8).equals(ASSINATURA_PNG)) throw err(400, 'Assinatura inválida');
  const dados = await dadosTermo(equipamentoId);
  if (!dados) throw err(404, 'Equipamento não encontrado');
  const agora = new Date();
  const codigo = crypto
    .createHash('sha256')
    .update(
      JSON.stringify([
        dados,
        d.colaborador_nome,
        d.colaborador_telefone ?? null,
        d.colaborador_email ?? null,
        d.colaborador_cargo ?? null,
        crypto.createHash('sha256').update(png).digest('hex'),
        agora.toISOString(),
      ]),
    )
    .digest('hex');
  const {
    rows: [t],
  } = await q(
    `INSERT INTO termos(equipamento_id,colaborador_nome,colaborador_telefone,colaborador_email,colaborador_cargo,dados,assinatura,codigo,assinado_em,usuario_id,ip)
    VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING id,codigo`,
    [
      equipamentoId,
      d.colaborador_nome,
      d.colaborador_telefone ?? null,
      d.colaborador_email ?? null,
      d.colaborador_cargo ?? null,
      dados,
      png,
      codigo,
      agora,
      usuarioId,
      ip,
    ],
  );
  return { termo: t, patrimonio: dados.patrimonio };
}

export async function buscar(id) {
  const {
    rows: [t],
  } = await q('SELECT * FROM termos WHERE id=$1', [id]);
  if (!t) throw err(404, 'Termo não encontrado');
  return t;
}
