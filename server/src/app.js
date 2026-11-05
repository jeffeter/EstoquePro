import cookieParser from 'cookie-parser';
import express from 'express';
import helmet from 'helmet';
import { env } from './config/env.js';
import { rotaNaoEncontrada, tratarErros } from './middleware/erros.js';
import rotas from './rotas.js';

export function criarApp() {
  const app = express();
  app.disable('x-powered-by'); 
  app.set('trust proxy', env.TRUST_PROXY); 
  app.use(helmet()); 

  app.use('/api', (req, res, next) => {
    res.setHeader('Cache-Control', 'no-store');
    next();
  });

  app.use(express.json({ limit: '400kb' })); 
  app.use(cookieParser());
  app.use('/api', rotas);
  app.use(rotaNaoEncontrada);
  app.use(tratarErros);
  return app;
}
