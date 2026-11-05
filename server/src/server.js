import { env } from './config/env.js';
import { pool } from './db/pool.js';
import { criarApp } from './app.js';

const servidor = criarApp().listen(env.PORT, env.HOST, () => console.log(`API em http://${env.HOST}:${env.PORT} (${env.NODE_ENV})`));

function encerrar(sinal) {
  console.log(`${sinal} recebido, encerrando…`);
  servidor.close(async () => {
    await pool.end().catch(() => {});
    process.exit(0);
  });
  setTimeout(() => process.exit(1), 10_000).unref();
}
process.on('SIGTERM', () => encerrar('SIGTERM'));
process.on('SIGINT', () => encerrar('SIGINT'));
