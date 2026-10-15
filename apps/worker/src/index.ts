import { Pool } from 'pg';
import { Queue, Worker } from 'bullmq';
import { z } from 'zod';
import pino from 'pino';
const result = z
  .object({ DATABASE_URL: z.url(), REDIS_URL: z.url() })
  .safeParse(process.env);
if (!result.success)
  throw new Error('DATABASE_URL and REDIS_URL must be valid URLs');
const env = result.data;
const logger = pino({ redact: ['password', 'token', 'authorization'] });
const pool = new Pool({
  connectionString: env.DATABASE_URL,
  max: 3,
  connectionTimeoutMillis: 3000,
});
pool.on('error', () => logger.error('Database connection failed'));
const redisUrl = new URL(env.REDIS_URL);
const connection = {
  host: redisUrl.hostname,
  port: Number(redisUrl.port) || 6379,
  username: redisUrl.username
    ? decodeURIComponent(redisUrl.username)
    : undefined,
  password: redisUrl.password
    ? decodeURIComponent(redisUrl.password)
    : undefined,
  db: Number(redisUrl.pathname.slice(1)) || 0,
  maxRetriesPerRequest: null,
  ...(redisUrl.protocol === 'rediss:' ? { tls: {} } : {}),
};
const queue = new Queue('buildos-system-events', { connection });
const heartbeatSchema = z.object({
  type: z.literal('platform.heartbeat'),
  payload: z.object({ timestamp: z.iso.datetime() }),
});
const worker = new Worker(
  'buildos-system-events',
  async (job) => {
    const event = heartbeatSchema.parse(job.data);
    logger.info(
      { eventId: job.id, type: event.type },
      'Operational event processed',
    );
  },
  { connection, concurrency: 2 },
);
worker.on('error', () => logger.error('Queue connection failed'));
worker.on('failed', (job) =>
  logger.warn({ eventId: job?.id }, 'Event failed; inspect dead-letter jobs'),
);
let stopped = false;
async function dispatch() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const rows = await client.query<{
      id: string;
      type: string;
      payload: unknown;
    }>(
      'SELECT id,type,payload FROM "OutboxEvent" WHERE "publishedAt" IS NULL ORDER BY "createdAt" LIMIT 50 FOR UPDATE SKIP LOCKED',
    );
    for (const row of rows.rows) {
      await queue.add(
        row.type,
        { type: row.type, payload: row.payload },
        {
          jobId: row.id,
          attempts: 5,
          backoff: { type: 'exponential', delay: 1000 },
        },
      );
      await client.query(
        'UPDATE "OutboxEvent" SET "publishedAt"=now() WHERE id=$1',
        [row.id],
      );
    }
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}
async function run() {
  while (!stopped) {
    try {
      await dispatch();
    } catch {
      logger.error('Outbox dispatch unavailable; retrying');
    }
    await new Promise((resolve) => setTimeout(resolve, 2000));
  }
}
async function close() {
  stopped = true;
  await worker.close();
  await queue.close();
  await pool.end();
}
for (const signal of ['SIGINT', 'SIGTERM'])
  process.on(signal, () => {
    void close().catch(() => {
      process.exitCode = 1;
    });
  });
void run();
