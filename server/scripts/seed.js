import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { BCRYPT_CUSTO } from '../src/config/constantes.js';
import { pool, q } from '../src/db/pool.js';

const FRACAS = /simpli|admin|senha|password|troque|123456|qwerty/i;
const entrada = z
  .object({
    ADMIN_EMAIL: z.string().email('ADMIN_EMAIL inválido'),
    ADMIN_PASSWORD: z
      .string()
      .min(12, 'ADMIN_PASSWORD: mínimo 12 caracteres')
      .max(72, 'ADMIN_PASSWORD: máximo 72 caracteres')
      .refine(v => !FRACAS.test(v), 'ADMIN_PASSWORD é previsível (não use nome da empresa, "admin", "senha", sequências…)'),
  })
  .safeParse(process.env);

if (!entrada.success) {
  console.error(entrada.error.issues.map(i => `- ${i.message}`).join('\n'));
  process.exit(1);
}

const { ADMIN_EMAIL, ADMIN_PASSWORD } = entrada.data;
try {
  const {
    rows: [filial],
  } = await q(`INSERT INTO filiais(nome) VALUES('Matriz') ON CONFLICT(nome) DO UPDATE SET nome=EXCLUDED.nome RETURNING id`);
  const { rowCount } = await q(
    `INSERT INTO usuarios(nome,email,senha_hash,perfil,filial_id) VALUES('Administrador',$1,$2,'admin',$3) ON CONFLICT(email) DO NOTHING`,
    [ADMIN_EMAIL.toLowerCase(), await bcrypt.hash(ADMIN_PASSWORD, BCRYPT_CUSTO), filial.id],
  );
  console.log(rowCount ? `Administrador criado: ${ADMIN_EMAIL}` : `O usuário ${ADMIN_EMAIL} já existe; nada foi alterado.`);
} finally {
  await pool.end();
}
