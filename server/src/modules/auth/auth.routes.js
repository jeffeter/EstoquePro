/** Login e logout (rotas PÚBLICAS — montadas antes do middleware `autenticar`). */
import { Router } from 'express';
import bcrypt from 'bcryptjs';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import { env } from '../../config/env.js';
import { BCRYPT_CUSTO } from '../../config/constantes.js';
import { h } from '../../lib/async.js';
import { auditar } from '../../lib/auditoria.js';
import { NOME_COOKIE, assinarToken, buscarAtivoPorEmail, carregarUsuario, opcoesCookie } from './auth.service.js';

const router = Router();

// Hash descartável: quando o e-mail não existe, comparamos com ele para o tempo de resposta ser igual
// ao de um e-mail válido (impede descobrir quais e-mails estão cadastrados medindo o tempo).
const HASH_FALSO = bcrypt.hashSync('hash-descartavel-nao-e-senha', BCRYPT_CUSTO);

// Bloqueia força bruta: só tentativas que FALHAM contam, por IP (atrás de proxy, configure TRUST_PROXY).
const limitarLogin = rateLimit({
  windowMs: env.LOGIN_JANELA_MIN * 60_000,
  limit: env.LOGIN_MAX_TENTATIVAS,
  skipSuccessfulRequests: true,
  standardHeaders: true,
  legacyHeaders: false,
  message: { erro: 'Muitas tentativas. Aguarde alguns minutos e tente de novo.' },
});

const loginZ = z.object({ email: z.string().trim().email().max(254), senha: z.string().min(1).max(128) });

router.post(
  '/login',
  limitarLogin,
  h(async (req, res) => {
    const { email, senha } = loginZ.parse(req.body);
    const usuario = await buscarAtivoPorEmail(email);
    const confere = await bcrypt.compare(senha, usuario?.senha_hash ?? HASH_FALSO);
    if (!usuario || !confere) {
      await auditar(req, 'login.falha', email);
      return res.status(401).json({ erro: 'Credenciais inválidas' }); // mesma mensagem para e-mail inexistente e senha errada
    }
    res.cookie(NOME_COOKIE, assinarToken(usuario), { ...opcoesCookie, maxAge: env.JWT_EXPIRA_HORAS * 3600e3 });
    await auditar({ user: { id: usuario.id }, ip: req.ip }, 'login.ok', usuario.email);
    res.json(await carregarUsuario(usuario.id));
  }),
);

router.post('/logout', (req, res) => {
  res.clearCookie(NOME_COOKIE, opcoesCookie);
  res.json({ ok: true });
});

export default router;
