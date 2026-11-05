import { ZodError } from 'zod';
import { HttpError } from '../lib/erros.js';

export const rotaNaoEncontrada = (req, res) => res.status(404).json({ erro: 'Rota não encontrada' });

export function tratarErros(e, req, res, next) {
  if (res.headersSent) return next(e); 

  if (e instanceof ZodError) return res.status(400).json({ erro: e.issues.map(i => `${i.path.join('.')}: ${i.message}`).join('; ') });
  if (e instanceof HttpError) return res.status(e.status).json({ erro: e.message });

  if (e.type === 'entity.parse.failed') return res.status(400).json({ erro: 'JSON inválido' });
  if (e.type === 'entity.too.large') return res.status(413).json({ erro: 'Conteúdo grande demais' });

  if (e.code === '23505') return res.status(409).json({ erro: 'Registro duplicado' });
  if (e.code === '23503') return res.status(400).json({ erro: 'Referência inválida' });
  if (e.code === '23514') return res.status(400).json({ erro: 'Valor não permitido' });
  if (['22P02', '22003', '22007', '22008'].includes(e.code)) return res.status(400).json({ erro: 'Valor inválido' });

  console.error(e); 
  res.status(500).json({ erro: 'Erro interno' });
}
