import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { pool } from '../src/db/pool.js';

const PASTA = path.join(path.dirname(fileURLToPath(import.meta.url)), '../db/migrations');
const args = process.argv.slice(2);
const so = f => args.includes(f);
const nomeArquivo = args.find(a => !a.startsWith('--'));

const todas = fs
  .readdirSync(PASTA)
  .filter(f => /^\d+_.+\.sql$/.test(f))
  .sort();

async function main() {
  const alvo = new URL(process.env.DATABASE_URL); 
  console.log(`Banco "${alvo.pathname.slice(1)}" em ${alvo.hostname}:${alvo.port || 5432}`);
  await pool.query(
    'CREATE TABLE IF NOT EXISTS schema_migrations (arquivo TEXT PRIMARY KEY, aplicado_em TIMESTAMPTZ NOT NULL DEFAULT now())',
  );
  const aplicadas = new Set((await pool.query('SELECT arquivo FROM schema_migrations')).rows.map(r => r.arquivo));

  if (so('--status')) {
    for (const f of todas) console.log(`${aplicadas.has(f) ? '[aplicada] ' : '[pendente] '}${f}`);
    return;
  }
  if (so('--baseline')) {
    for (const f of todas) await pool.query('INSERT INTO schema_migrations(arquivo) VALUES($1) ON CONFLICT DO NOTHING', [f]);
    console.log(`${todas.length} migração(ões) marcadas como aplicadas.`);
    return;
  }

  const alvoArquivo = nomeArquivo && path.basename(nomeArquivo);
  if (alvoArquivo && !todas.includes(alvoArquivo)) throw new Error(`Migração não encontrada em db/migrations: ${alvoArquivo}`);
  const pendentes = todas.filter(f => !aplicadas.has(f) && (!alvoArquivo || f === alvoArquivo));
  if (!pendentes.length) return console.log('Nada a aplicar: o banco já está atualizado.');

  for (const f of pendentes) {
    const sql = fs.readFileSync(path.join(PASTA, f), 'utf8');
    const c = await pool.connect();
    try {
      await c.query('BEGIN');
      await c.query(sql);
      await c.query('INSERT INTO schema_migrations(arquivo) VALUES($1)', [f]);
      await c.query('COMMIT');
      console.log(`aplicada: ${f}`);
    } catch (e) {
      await c.query('ROLLBACK');
      throw new Error(`${f} falhou (nada foi alterado por ela): ${e.message}`);
    } finally {
      c.release();
    }
  }
  console.log('Migrações concluídas. Reinicie o servidor.');
}

try {
  await main();
} catch (e) {
  console.error('Falhou:', e.message);
  process.exitCode = 1;
} finally {
  await pool.end();
}
