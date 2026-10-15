import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';
import type { FastifyRequest } from 'fastify';
import type { Pool } from 'pg';
import type { AuthUser } from '@buildos/shared';
import { ApiError } from './errors.js';
export const token = () => randomBytes(32).toString('hex');
export const digest = (value: string) =>
  createHash('sha256').update(value).digest('hex');
export const csrf = (value: string) => digest(`buildos-csrf:${value}`);
export const cookieName = 'buildos_session';
export type Principal = AuthUser & { sessionToken: string };
export async function authenticate(
  pool: Pool,
  request: FastifyRequest,
): Promise<Principal> {
  const value = request.cookies[cookieName];
  if (!value || !/^[a-f0-9]{64}$/.test(value))
    throw new ApiError(401, 'UNAUTHENTICATED');
  const result = await pool.query<AuthUser>(
    'SELECT u.id,u."companyId",u.name,u.email,u.role,u.position,u."allProjects",u."projectIds",c.name AS company FROM "AuthSession" s JOIN "AppUser" u ON u.id=s."userId" JOIN "Company" c ON c.id=u."companyId" WHERE s."tokenHash"=$1 AND s."expiresAt">now() AND u.active=true',
    [digest(value)],
  );
  const user = result.rows[0];
  if (!user) throw new ApiError(401, 'UNAUTHENTICATED');
  return { ...user, sessionToken: value };
}
export function checkOrigin(request: FastifyRequest, origin: string) {
  if (request.headers.origin !== origin)
    throw new ApiError(403, 'INVALID_ORIGIN');
}
export function checkCsrf(
  request: FastifyRequest,
  principal: Principal,
  origin: string,
) {
  checkOrigin(request, origin);
  const supplied = request.headers['x-csrf-token'];
  const expected = csrf(principal.sessionToken);
  if (
    typeof supplied !== 'string' ||
    supplied.length !== expected.length ||
    !timingSafeEqual(Buffer.from(supplied), Buffer.from(expected))
  )
    throw new ApiError(403, 'INVALID_CSRF');
}
