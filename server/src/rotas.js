import { Router } from 'express';
import { q } from './db/pool.js';
import { h } from './lib/async.js';
import { autenticar } from './middleware/autenticacao.js';
import authRoutes from './modules/auth/auth.routes.js';
import auditoriaRoutes from './modules/auditoria/auditoria.routes.js';
import baixasRoutes from './modules/baixas/baixas.routes.js';
import cargosRoutes from './modules/cargos/cargos.routes.js';
import consumiveisRoutes from './modules/consumiveis/consumiveis.routes.js';
import dashboardRoutes from './modules/dashboard/dashboard.routes.js';
import equipamentosRoutes from './modules/equipamentos/equipamentos.routes.js';
import termosRoutes from './modules/equipamentos/termos.routes.js';
import filiaisRoutes from './modules/filiais/filiais.routes.js';
import relatoriosRoutes from './modules/relatorios/relatorios.routes.js';
import usuariosRoutes from './modules/usuarios/usuarios.routes.js';

const api = Router();

api.get(
  '/health',
  h(async (req, res) => {
    try {
      await q('SELECT 1');
      res.json({ ok: true });
    } catch {
      res.status(503).json({ ok: false });
    }
  }),
);
api.use(authRoutes);

api.use(autenticar);
api.get('/me', (req, res) => res.json(req.user));

api.use(
  filiaisRoutes,
  usuariosRoutes,
  cargosRoutes,
  equipamentosRoutes,
  termosRoutes,
  baixasRoutes,
  consumiveisRoutes,
  dashboardRoutes,
  relatoriosRoutes,
  auditoriaRoutes,
);

export default api;
