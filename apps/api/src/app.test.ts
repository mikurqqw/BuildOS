import { expect, it } from 'vitest';
import { buildApp } from './app';
it('reports liveness without pretending infrastructure is ready', async () => {
  const app = await buildApp({ ready: async () => false });
  try {
    expect((await app.inject('/healthz')).statusCode).toBe(200);
    const result = await app.inject('/readyz');
    expect(result.statusCode).toBe(503);
    expect(result.json()).toMatchObject({
      code: 'DEPENDENCIES_UNAVAILABLE',
      status: 503,
    });
  } finally {
    await app.close();
  }
});
it('exposes metrics and handles unknown endpoints in unified format', async () => {
  const app = await buildApp({ ready: async () => true });
  try {
    expect((await app.inject('/readyz')).statusCode).toBe(200);
    expect((await app.inject('/metrics')).body).toContain(
      'buildos_http_requests_total',
    );
    expect((await app.inject('/api/docs')).json()).toMatchObject({
      openapi: '3.0.3',
    });
    expect((await app.inject('/missing')).json()).toMatchObject({
      status: 404,
      code: 'NOT_FOUND',
    });
  } finally {
    await app.close();
  }
});
