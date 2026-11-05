import 'dotenv/config';
import { z } from 'zod';

const SEGREDOS_PROIBIDOS = /troque|change.?me|exemplo|example|secret|senha/i;

const esquema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().int().min(1).max(65535).default(3001),
  HOST: z.string().default('127.0.0.1'),
  DATABASE_URL: z.string().url('DATABASE_URL deve ser uma URL postgres://usuario:senha@host:porta/banco'),
  JWT_SECRET: z
    .string()
    .min(32, 'JWT_SECRET deve ter no mínimo 32 caracteres')
    .refine(v => !SEGREDOS_PROIBIDOS.test(v), 'JWT_SECRET parece um valor de exemplo; gere um aleatório (veja .env.example)'),
  JWT_EXPIRA_HORAS: z.coerce.number().int().min(1).max(72).default(8),
  TRUST_PROXY: z.coerce.number().int().min(0).max(5).default(0),
  COOKIE_SECURE: z
    .enum(['true', 'false'])
    .optional()
    .transform(v => (v === undefined ? undefined : v === 'true')),
  LOGIN_MAX_TENTATIVAS: z.coerce.number().int().min(1).max(1000).default(10),
  LOGIN_JANELA_MIN: z.coerce.number().int().min(1).max(1440).default(15),
  PATRIMONIO_PREFIXO_PADRAO: z.string().max(20).default('PAT-'),
  PATRIMONIO_DIGITOS: z.coerce.number().int().min(1).max(15).default(6),
  TZ_EXIBICAO: z.string().default('America/Fortaleza'),
});

const lido = esquema.safeParse(process.env);
if (!lido.success) {
  const problemas = lido.error.issues.map(i => `  - ${i.path.join('.')}: ${i.message}`).join('\n');
  console.error(`Configuração inválida (veja server/.env.example):\n${problemas}`);
  process.exit(1);
}

const e = lido.data;
export const env = Object.freeze({
  ...e,
  producao: e.NODE_ENV === 'production',
  cookieSeguro: e.COOKIE_SECURE ?? e.NODE_ENV === 'production',
});
