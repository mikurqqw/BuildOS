import Fastify, { LogController } from 'fastify';
import helmet from '@fastify/helmet';
import cors from '@fastify/cors';
import rateLimit from '@fastify/rate-limit';
import swagger from '@fastify/swagger';
import type { Pool } from 'pg';
import { registerAccess } from './access/routes.js';
import { ApiError } from './access/errors.js';
type Options = {
  ready: () => Promise<boolean>;
  origin?: string;
  logging?: boolean;
  logLevel?: 'info' | 'warn' | 'error' | 'debug';
  database?: Pool;
  secureCookies?: boolean;
  setupToken?: string;
};
export async function buildApp(options: Options) {
  const app = Fastify({
    bodyLimit: 1024 * 1024,
    logger: options.logging
      ? {
          level: options.logLevel ?? 'info',
          redact: [
            'req.headers.authorization',
            'req.headers.cookie',
            'res.headers.set-cookie',
            'password',
            'token',
          ],
        }
      : false,
    logController: new LogController({ disableRequestLogging: true }),
  });
  await app.register(helmet);
  await app.register(cors, {
    origin: options.origin ?? 'http://127.0.0.1:5173',
    credentials: true,
  });
  await app.register(rateLimit, { max: 120, timeWindow: '1 minute' });
  await app.register(swagger, {
    openapi: {
      info: {
        title: 'BuildOS foundation API',
        version: '0.1.0',
        description:
          'Employee identity, company workspace and operational API.',
      },
    },
  });
  app.get('/api/docs', async () => app.swagger());
  app.get('/api/docs/json', async () => app.swagger());
  if (options.database)
    await registerAccess(app, {
      database: options.database,
      origin: options.origin ?? 'http://127.0.0.1:5173',
      secure: options.secureCookies ?? false,
      setupToken: options.setupToken,
    });
  let requests = 0;
  app.addHook('onResponse', async () => {
    requests++;
  });
  app.get(
    '/healthz',
    {
      schema: {
        response: {
          200: {
            type: 'object',
            properties: {
              status: { type: 'string' },
              service: { type: 'string' },
            },
          },
        },
      },
    },
    async () => ({ status: 'ok', service: 'buildos-api' }),
  );
  app.get('/readyz', async (request, reply) => {
    let ready = false;
    try {
      ready = await options.ready();
    } catch {
      ready = false;
    }
    if (!ready)
      return reply.status(503).send({
        type: 'about:blank',
        title: 'Dependencies unavailable',
        status: 503,
        detail: 'PostgreSQL or Redis is not ready.',
        code: 'DEPENDENCIES_UNAVAILABLE',
        requestId: request.id,
      });
    return { status: 'ready' };
  });
  app.get('/metrics', async (_request, reply) =>
    reply
      .type('text/plain; version=0.0.4')
      .send(
        `# HELP buildos_http_requests_total Completed HTTP requests\n# TYPE buildos_http_requests_total counter\nbuildos_http_requests_total ${requests}\n# HELP buildos_uptime_seconds Process uptime\n# TYPE buildos_uptime_seconds gauge\nbuildos_uptime_seconds ${process.uptime()}\n`,
      ),
  );
  app.setNotFoundHandler((request, reply) =>
    reply.status(404).send({
      type: 'about:blank',
      title: 'Not found',
      status: 404,
      detail: 'The requested endpoint does not exist.',
      code: 'NOT_FOUND',
      requestId: request.id,
    }),
  );
  app.setErrorHandler((error, request, reply) => {
    const status =
      error instanceof Error &&
      'statusCode' in error &&
      typeof error.statusCode === 'number' &&
      error.statusCode >= 400
        ? error.statusCode
        : 500;
    if (status >= 500)
      request.log.error(
        {
          requestId: request.id,
          code:
            error instanceof Error && 'code' in error ? error.code : 'UNKNOWN',
        },
        'Request failed',
      );
    reply.status(status).send({
      type: 'about:blank',
      title: status >= 500 ? 'Internal server error' : 'Request rejected',
      status,
      detail:
        status >= 500
          ? 'The request could not be completed.'
          : 'Check request content and limits.',
      code:
        error instanceof ApiError
          ? error.code
          : status === 429
            ? 'RATE_LIMITED'
            : 'REQUEST_FAILED',
      requestId: request.id,
    });
  });
  return app;
}
