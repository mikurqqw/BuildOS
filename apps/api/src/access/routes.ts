import type { FastifyInstance } from 'fastify';
import cookie from '@fastify/cookie';
import multipart from '@fastify/multipart';
import type { Pool } from 'pg';
import { z } from 'zod';
import { userSchema, memberAccessSchema } from '@buildos/shared';
import { IdentityService } from './identity-service.js';
import { WorkspaceService } from './workspace-service.js';
import { TeamService } from './team-service.js';
import { listAudit } from './audit-service.js';
import { FileService } from './file-service.js';
import { ApiError } from './errors.js';
import {
  authenticate,
  checkOrigin,
  checkCsrf,
  cookieName,
  csrf,
  digest,
} from './security.js';
export async function registerAccess(
  app: FastifyInstance,
  options: {
    database: Pool;
    origin: string;
    secure: boolean;
    setupToken?: string;
  },
) {
  await app.register(cookie);
  await app.register(multipart, {
    limits: { fileSize: 20 * 1024 * 1024, files: 1, fields: 0 },
  });
  const identity = new IdentityService(options.database, options.setupToken);
  const workspace = new WorkspaceService(options.database);
  const team = new TeamService(options.database);
  const files = new FileService(options.database);
  const cookies = {
    httpOnly: true,
    sameSite: 'strict' as const,
    secure: options.secure,
    path: '/',
    maxAge: 7 * 24 * 60 * 60,
  };
  app.addHook('onSend', async (request, reply) => {
    if (request.url.startsWith('/api/v1/'))
      reply.header('Cache-Control', 'no-store');
  });
  app.get('/api/v1/auth/status', () => identity.status());
  app.get('/api/v1/auth/session', async (request) => {
    const principal = await authenticate(options.database, request);
    return {
      user: userSchema.parse(principal),
      csrfToken: csrf(principal.sessionToken),
    };
  });
  for (const operation of ['setup', 'login', 'accept', 'reset'] as const)
    app.post(
      `/api/v1/auth/${operation}`,
      { config: { rateLimit: { max: 5, timeWindow: '15 minutes' } } },
      async (request, reply) => {
        checkOrigin(request, options.origin);
        const user = await identity[operation](request.body);
        const previous = request.cookies[cookieName];
        if (previous)
          await options.database.query(
            'DELETE FROM "AuthSession" WHERE "tokenHash"=$1',
            [digest(previous)],
          );
        const value = await identity.session(user);
        reply.setCookie(cookieName, value, cookies);
        return { user, csrfToken: csrf(value) };
      },
    );
  app.post('/api/v1/auth/logout', async (request, reply) => {
    const user = await authenticate(options.database, request);
    checkCsrf(request, user, options.origin);
    await options.database.query(
      'DELETE FROM "AuthSession" WHERE "tokenHash"=$1',
      [digest(user.sessionToken)],
    );
    reply.clearCookie(cookieName, { path: '/' });
    return { ok: true };
  });
  app.get('/api/v1/workspace', async (request, reply) => {
    const user = await authenticate(options.database, request);
    const result = await workspace.get(user);
    reply.header('ETag', `"${result.version}"`);
    return result;
  });
  app.put(
    '/api/v1/workspace',
    { bodyLimit: 16 * 1024 * 1024 },
    async (request, reply) => {
      const user = await authenticate(options.database, request);
      checkCsrf(request, user, options.origin);
      const version = request.headers['if-match'];
      if (typeof version !== 'string' || !/^"\d+"$/.test(version))
        throw new ApiError(428, 'VERSION_REQUIRED');
      if (
        !Number.isSafeInteger(Number(version.slice(1, -1))) ||
        Number(version.slice(1, -1)) > 2147483647
      )
        throw new ApiError(422, 'INVALID_VERSION');
      const result = await workspace.save(
        user,
        Number(version.slice(1, -1)),
        request.body,
      );
      reply.header('ETag', `"${result.version}"`);
      return result;
    },
  );
  app.get('/api/v1/audit', async (request) => {
    const user = await authenticate(options.database, request);
    const parsed = z
      .object({
        limit: z.coerce.number().int().min(1).max(100).default(50),
        before: z.string().max(512).optional(),
      })
      .safeParse(request.query);
    if (!parsed.success) throw new ApiError(422, 'INVALID_INPUT');
    return listAudit(
      options.database,
      user,
      parsed.data.limit,
      parsed.data.before,
    );
  });
  app.post<{ Params: { id: string } }>(
    '/api/v1/team/:id/recovery',
    async (request) => {
      const user = await authenticate(options.database, request);
      checkCsrf(request, user, options.origin);
      if (!z.uuid().safeParse(request.params.id).success)
        throw new ApiError(422, 'INVALID_INPUT');
      return team.recovery(user, request.params.id);
    },
  );
  app.get('/api/v1/team', async (request) =>
    team.list(await authenticate(options.database, request)),
  );
  app.post('/api/v1/team/invitations', async (request) => {
    const user = await authenticate(options.database, request);
    checkCsrf(request, user, options.origin);
    return team.invite(user, request.body);
  });
  app.delete<{ Params: { id: string } }>(
    '/api/v1/team/invitations/:id',
    async (request) => {
      const user = await authenticate(options.database, request);
      checkCsrf(request, user, options.origin);
      if (!z.uuid().safeParse(request.params.id).success)
        throw new ApiError(422, 'INVALID_INPUT');
      return team.revoke(user, request.params.id);
    },
  );
  app.patch<{ Params: { id: string } }>('/api/v1/team/:id', async (request) => {
    const user = await authenticate(options.database, request);
    checkCsrf(request, user, options.origin);
    const parsed = memberAccessSchema.safeParse(request.body);
    if (!parsed.success || !z.uuid().safeParse(request.params.id).success)
      throw new ApiError(422, 'INVALID_INPUT');
    return team.access(user, request.params.id, parsed.data);
  });
  app.post<{ Querystring: { projectId: string } }>(
    '/api/v1/files',
    async (request) => {
      const user = await authenticate(options.database, request);
      checkCsrf(request, user, options.origin);
      const file = await request.file();
      if (!file || typeof request.query.projectId !== 'string')
        throw new ApiError(422, 'INVALID_FILE');
      const bytes = await file.toBuffer();
      if (file.file.truncated) throw new ApiError(413, 'FILE_TOO_LARGE');
      return files.upload(user, request.query.projectId, file.filename, bytes);
    },
  );
  app.get<{ Params: { id: string } }>(
    '/api/v1/files/:id',
    async (request, reply) => {
      const user = await authenticate(options.database, request);
      const file = await files.get(user, request.params.id);
      return reply
        .type(file.mime)
        .header(
          'Content-Disposition',
          `attachment; filename*=UTF-8''${encodeURIComponent(file.name)}`,
        )
        .send(file.bytes);
    },
  );
  app.delete<{ Params: { id: string } }>(
    '/api/v1/files/:id',
    async (request) => {
      const user = await authenticate(options.database, request);
      checkCsrf(request, user, options.origin);
      return files.remove(user, request.params.id);
    },
  );
}
