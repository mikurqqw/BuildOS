import { z } from 'zod';
export const envSchema = z.object({
  HOST: z.string().default('127.0.0.1'),
  PORT: z.coerce.number().int().min(1).max(65535).default(3001),
  DATABASE_URL: z.url().refine((value) => /^postgres(ql)?:/.test(value)),
  REDIS_URL: z.url().refine((value) => /^rediss?:/.test(value)),
  WEB_ORIGIN: z.url().default('http://127.0.0.1:5173'),
  LOG_LEVEL: z.enum(['info', 'warn', 'error', 'debug']).default('info'),
  NODE_ENV: z
    .enum(['development', 'test', 'production'])
    .default('development'),
  QUEUE_ENABLED: z
    .enum(['true', 'false'])
    .default('false')
    .transform((value) => value === 'true'),
  SETUP_TOKEN: z.string().min(32).optional(),
});
export function readEnv() {
  const result = envSchema.safeParse(process.env);
  if (!result.success)
    throw new Error(
      `Invalid environment fields: ${result.error.issues.map((issue) => issue.path.join('.')).join(', ')}`,
    );
  if (result.data.NODE_ENV === 'production' && !result.data.SETUP_TOKEN)
    throw new Error('SETUP_TOKEN is required in production');
  return result.data;
}
