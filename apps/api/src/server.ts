import { Pool } from 'pg';
import { Redis } from 'ioredis';
import { buildApp } from './app.js';
import { readEnv } from './env.js';
const env = readEnv();
const database = new Pool({
  connectionString: env.DATABASE_URL,
  connectionTimeoutMillis: 2000,
  max: 5,
});
const redis = new Redis(env.REDIS_URL, {
  lazyConnect: true,
  connectTimeout: 2000,
  maxRetriesPerRequest: 1,
  retryStrategy: () => null,
});
redis.on('error', () => {
  /* Readiness reports connection failures without logging connection credentials. */
});
database.on('error', () => {
  /* A failed idle connection is replaced by pg; readiness exposes availability. */
});
const app = await buildApp({
  origin: env.WEB_ORIGIN,
  logging: true,
  logLevel: env.LOG_LEVEL,
  database,
  secureCookies: env.NODE_ENV === 'production',
  setupToken: env.SETUP_TOKEN,
  ready: async () => {
    if (
      env.QUEUE_ENABLED &&
      (redis.status === 'wait' || redis.status === 'end')
    )
      await redis.connect();
    await database.query('SELECT 1');
    if (env.QUEUE_ENABLED) await redis.ping();
    return true;
  },
});
app.addHook('onClose', async () => {
  redis.disconnect();
  await database.end();
});
for (const signal of ['SIGINT', 'SIGTERM'])
  process.on(signal, () => {
    void app.close().catch(() => {
      process.exitCode = 1;
    });
  });
try {
  await app.listen({ host: env.HOST, port: env.PORT });
} catch {
  app.log.error('API startup failed');
  await app.close();
  process.exitCode = 1;
}
