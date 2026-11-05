import { NOME_COOKIE, carregarUsuario, lerToken } from '../modules/auth/auth.service.js';


export const autenticar = async (req, res, next) => {
  const id = lerToken(req.cookies?.[NOME_COOKIE]);
  if (id === null) return res.status(401).json({ erro: 'Não autenticado' });
  try {
    const usuario = await carregarUsuario(id);
    if (!usuario) return res.status(401).json({ erro: 'Não autenticado' });
    req.user = usuario;
    next();
  } catch (e) {
    next(e);
  }
};

export const exigir =
  (...chaves) =>
  (req, res, next) =>
    chaves.every(c => req.user.permissoes.includes(c)) ? next() : res.status(403).json({ erro: 'Sem permissão' });
