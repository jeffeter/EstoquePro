import { z } from 'zod';
import { INT_MAX } from '../config/constantes.js';
import { err } from './erros.js';

export const idZ = z.coerce.number().int().positive().max(INT_MAX);

export const dataZ = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine(v => {
    const d = new Date(v + 'T00:00:00Z');
    return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === v;
  }, 'Data inválida');

export const curto = (max = 120) => z.string().trim().min(1).max(max);

export const curtoOpt = (max = 120) => z.string().trim().max(max).optional();

export const longoOpt = (max = 2000) => z.string().trim().max(max).optional();

export const busca = (max = 100) => z.string().trim().max(max).optional();

export const senhaZ = z.string().min(10, 'mínimo 10 caracteres').max(72, 'máximo 72 caracteres');

export function validarId(req, res, next, valor, nome) {
  const r = idZ.safeParse(valor);
  if (!r.success) return next(err(400, 'Identificador inválido'));
  req.params[nome] = r.data;
  next();
}
