import { q, pool, tx } from '../../db/pool.js';
import { ROTULO_STATUS, LIMITE } from '../../config/constantes.js';
import { err } from '../../lib/erros.js';
import { equipamentosWhere } from './equipamentos.filtros.js';
import { patrimonioExiste, prefixoDe, proximoPatrimonio } from './patrimonio.js';

export const SQL_EQ = `SELECT e.*, f.nome AS filial FROM equipamentos e LEFT JOIN filiais f ON f.id=e.filial_atual_id`;

export const SQL_ALERTA = `SELECT id,patrimonio,tipo,marca,garantia_ate,fornecedor,(garantia_ate-CURRENT_DATE) AS dias_restantes
  FROM equipamentos WHERE status<>'baixado' AND garantia_ate IS NOT NULL AND garantia_ate <= CURRENT_DATE+15 AND garantia_ate >= CURRENT_DATE ORDER BY garantia_ate`;

export const alertasGarantia = async () => (await q(SQL_ALERTA)).rows;

export async function listar(filtro) {
  const w = equipamentosWhere(filtro);
  return (
    await q(
      `SELECT e.*, f.nome AS filial, COUNT(*) OVER()::int AS total_filtrado FROM equipamentos e LEFT JOIN filiais f ON f.id=e.filial_atual_id
    ${w.sql()} ORDER BY e.criado_em DESC LIMIT ${LIMITE.equipamentos}`,
      w.p,
    )
  ).rows;
}

export async function listarParaExportar(filtro) {
  const w = equipamentosWhere(filtro);
  return (await q(`${SQL_EQ} ${w.sql()} ORDER BY e.tipo, e.patrimonio`, w.p)).rows;
}

export async function opcoesDeFiltro({ equipamentos, consumiveis }) {
  const vazio = { rows: [] };
  const [t, m, c] = await Promise.all([
    equipamentos ? q(`SELECT DISTINCT ON (lower(tipo)) tipo FROM equipamentos ORDER BY lower(tipo), (tipo = lower(tipo))`) : vazio,
    equipamentos
      ? q(
          `SELECT DISTINCT ON (lower(marca)) marca FROM equipamentos WHERE COALESCE(marca,'') <> '' ORDER BY lower(marca), (marca = lower(marca))`,
        )
      : vazio,
    consumiveis ? q(`SELECT DISTINCT ON (lower(tipo)) tipo FROM consumiveis ORDER BY lower(tipo), (tipo = lower(tipo))`) : vazio,
  ]);
  return {
    equipamentos: { tipos: t.rows.map(x => x.tipo), marcas: m.rows.map(x => x.marca) },
    consumiveis: { tipos: c.rows.map(x => x.tipo) },
  };
}

export async function criar(d, usuarioId) {
  const auto = !d.patrimonio || d.sugerido === true;
  let prefixo = prefixoDe(d.patrimonio); 
  if (auto && prefixo == null) prefixo = (await proximoPatrimonio(pool)).prefixo;

  const gravar = async (c, pat) => {
    const {
      rows: [e],
    } = await c.query(
      `INSERT INTO equipamentos(patrimonio,tipo,marca,observacao,status,avarias,filial_atual_id,data_compra,fornecedor,garantia_ate)
      VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
      [
        pat,
        d.tipo,
        d.marca ?? null,
        d.observacao ?? null,
        d.status ?? 'aguardando_teste',
        d.avarias ?? null,
        d.filial_atual_id,
        d.data_compra ?? null,
        d.fornecedor ?? null,
        d.garantia_ate ?? null,
      ],
    );
    await c.query(
      `INSERT INTO movimentacoes(equipamento_id,tipo,data,filial_origem_id,filial_destino_id,usuario_id) VALUES($1,'entrada',COALESCE($2::timestamptz,now()),$3,$4,$5)`,
      [e.id, d.data_entrada ?? null, d.filial_origem_id ?? null, d.filial_atual_id, usuarioId],
    );
    return e;
  };

  if (!auto) {
    const duplicado = () => err(409, `O patrimônio ${d.patrimonio} já está cadastrado`);
    if (await patrimonioExiste(pool, d.patrimonio)) throw duplicado();
    try {
      return await tx(c => gravar(c, d.patrimonio));
    } catch (x) {
      throw x.code === '23505' ? duplicado() : x;
    }
  }

  for (let tentativa = 0; ; tentativa++) {
    try {
      return await tx(async c => {
        await c.query(`SELECT pg_advisory_xact_lock(hashtext($1))`, ['patrimonio:' + prefixo.toLowerCase()]);
        return gravar(c, (await proximoPatrimonio(c, prefixo)).patrimonio);
      });
    } catch (x) {
      if (x.code !== '23505' || tentativa >= 5) throw x; 
    }
  }
}

export async function editar(id, d) {
  const { rowCount } = await q(
    `UPDATE equipamentos SET tipo=COALESCE($1,tipo), marca=COALESCE($2,marca), observacao=COALESCE($3,observacao), avarias=COALESCE($4,avarias),
    data_compra=COALESCE($5,data_compra), fornecedor=COALESCE($6,fornecedor), garantia_ate=COALESCE($7,garantia_ate) WHERE id=$8 AND status<>'baixado'`,
    [
      d.tipo ?? null,
      d.marca ?? null,
      d.observacao ?? null,
      d.avarias ?? null,
      d.data_compra ?? null,
      d.fornecedor ?? null,
      d.garantia_ate ?? null,
      id,
    ],
  );
  if (!rowCount) throw err(404, 'Equipamento não encontrado ou já baixado');
}

export async function mudarStatus(id, status, avarias) {
  const { rowCount } = await q(`UPDATE equipamentos SET status=$1, avarias=COALESCE($2,avarias) WHERE id=$3 AND status<>'baixado'`, [
    status,
    avarias ?? null,
    id,
  ]);
  if (!rowCount) throw err(404, 'Equipamento não encontrado ou já baixado');
}

export async function registrarSaida(id, d, usuarioId) {
  return tx(async c => {
    const {
      rows: [e],
    } = await c.query('SELECT * FROM equipamentos WHERE id=$1 FOR UPDATE', [id]);
    if (!e) throw err(404, 'Equipamento não encontrado');
    if (['baixado', 'aguardando_baixa', 'manutencao'].includes(e.status))
      throw err(409, `Não é possível dar saída com status "${ROTULO_STATUS[e.status]}"`);
    const {
      rows: [m],
    } = await c.query(
      `INSERT INTO movimentacoes(equipamento_id,tipo,filial_origem_id,filial_destino_id,setor,chamado,observacao,usuario_id)
      VALUES($1,'saida',$2,$3,$4,$5,$6,$7) RETURNING id`,
      [e.id, e.filial_atual_id, d.filial_destino_id, d.setor, d.chamado, d.observacao ?? null, usuarioId],
    );
    await c.query(`UPDATE equipamentos SET status='em_uso', filial_atual_id=$1 WHERE id=$2`, [d.filial_destino_id, e.id]);
    return m;
  });
}

export async function historico(id) {
  const [mov, man, ter] = await Promise.all([
    q(
      `SELECT m.*, fo.nome origem, fd.nome destino, u.nome usuario FROM movimentacoes m LEFT JOIN filiais fo ON fo.id=m.filial_origem_id
      LEFT JOIN filiais fd ON fd.id=m.filial_destino_id LEFT JOIN usuarios u ON u.id=m.usuario_id WHERE m.equipamento_id=$1 ORDER BY m.data DESC`,
      [id],
    ),
    q('SELECT * FROM manutencoes WHERE equipamento_id=$1 ORDER BY data_inicio DESC', [id]),
    q('SELECT id, colaborador_nome, assinado_em FROM termos WHERE equipamento_id=$1 ORDER BY assinado_em DESC', [id]),
  ]);
  return { movimentacoes: mov.rows, manutencoes: man.rows, termos: ter.rows };
}

export async function buscarPorPatrimonio(codigo) {
  const {
    rows: [e],
  } = await q(`${SQL_EQ} WHERE upper(e.patrimonio)=upper($1)`, [codigo]);
  if (!e) throw err(404, 'Patrimônio não encontrado');
  return { equipamento: e, ...(await historico(e.id)) };
}

export async function paraEtiquetas(ids) {
  return (
    await q(
      `SELECT e.patrimonio,e.tipo,e.marca,f.nome filial FROM equipamentos e LEFT JOIN filiais f ON f.id=e.filial_atual_id WHERE e.id = ANY($1::int[]) ORDER BY e.patrimonio`,
      [ids],
    )
  ).rows;
}

export async function abrirManutencao(id, d, usuarioId) {
  await tx(async c => {
    const { rowCount } = await c.query(`UPDATE equipamentos SET status='manutencao' WHERE id=$1 AND status<>'baixado'`, [id]);
    if (!rowCount) throw err(404, 'Equipamento não encontrado ou já baixado');
    await c.query(
      'INSERT INTO manutencoes(equipamento_id,descricao,tecnico,data_inicio,usuario_id) VALUES($1,$2,$3,COALESCE($4::date,CURRENT_DATE),$5)',
      [id, d.descricao, d.tecnico ?? null, d.data_inicio ?? null, usuarioId],
    );
  });
}

export async function concluirManutencao(id) {
  await tx(async c => {
    await c.query('UPDATE manutencoes SET data_fim=CURRENT_DATE WHERE equipamento_id=$1 AND data_fim IS NULL', [id]);
    await c.query(`UPDATE equipamentos SET status='aguardando_teste' WHERE id=$1 AND status='manutencao'`, [id]);
  });
}
