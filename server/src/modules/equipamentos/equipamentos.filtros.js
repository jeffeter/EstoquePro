import { z } from 'zod';
import { STATUS } from '../../config/constantes.js';
import { busca, curtoOpt, idZ } from '../../lib/validadores.js';
import { likeDe, where } from '../../lib/sql.js';

export const filtroEquipamentos = z.object({
  busca: busca(),
  tipo: curtoOpt(60),
  marca: curtoOpt(60),
  status: z.enum([...STATUS, 'baixado']).optional(),
  filial_id: idZ.optional(),
  avarias: z.enum(['sim', 'nao']).optional(),
  garantia: z.enum(['vigente', 'a_vencer', 'vencida', 'sem']).optional(),
});

const GARANTIA = {
  vigente: 'e.garantia_ate >= CURRENT_DATE',
  a_vencer: 'e.garantia_ate BETWEEN CURRENT_DATE AND CURRENT_DATE + 15',
  vencida: 'e.garantia_ate < CURRENT_DATE',
  sem: 'e.garantia_ate IS NULL',
};

export function equipamentosWhere(f) {
  const w = where();
  if (f.busca) w.add(`(e.patrimonio ILIKE ? OR e.tipo ILIKE ? OR e.marca ILIKE ? OR e.observacao ILIKE ?)`, likeDe(f.busca));
  if (f.tipo) w.add('lower(e.tipo) = lower(?)', f.tipo);
  if (f.marca) w.add('lower(e.marca) = lower(?)', f.marca);
  if (f.status) w.add('e.status = ?', f.status);
  if (f.filial_id) w.add('e.filial_atual_id = ?', f.filial_id);
  if (f.avarias === 'sim') w.raw(`COALESCE(e.avarias,'') <> ''`);
  if (f.avarias === 'nao') w.raw(`COALESCE(e.avarias,'') = ''`);
  if (f.garantia) w.raw(GARANTIA[f.garantia]);
  return w;
}
