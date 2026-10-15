import { randomUUID } from 'node:crypto';
import type { Pool } from 'pg';
import { inviteSchema } from '@buildos/shared';
import { transaction, requireOwner } from './repository.js';
import { ApiError } from './errors.js';
import { token, digest, type Principal } from './security.js';
export class TeamService {
  constructor(private pool: Pool) {}
  async list(user: Principal) {
    const [users, invitations] = await Promise.all([
      this.pool.query(
        'SELECT id,"companyId",name,email,role,position,active FROM "AppUser" WHERE "companyId"=$1 ORDER BY "createdAt"',
        [user.companyId],
      ),
      this.pool.query(
        'SELECT id,name,email,position,"expiresAt" FROM "Invitation" WHERE "companyId"=$1 AND "acceptedAt" IS NULL AND "expiresAt">now() ORDER BY "expiresAt"',
        [user.companyId],
      ),
    ]);
    return {
      users: users.rows,
      invitations: invitations.rows.map((item) => ({
        ...item,
        expiresAt: (item.expiresAt as Date).toISOString(),
      })),
    };
  }
  async invite(user: Principal, input: unknown) {
    requireOwner(user.role);
    const parsed = inviteSchema.safeParse(input);
    if (!parsed.success) throw new ApiError(422, 'INVALID_INPUT');
    const value = token();
    await transaction(this.pool, user.companyId, async (client) => {
      if (
        (
          await client.query('SELECT 1 FROM "AppUser" WHERE email=$1', [
            parsed.data.email,
          ])
        ).rowCount
      )
        throw new ApiError(409, 'EMAIL_EXISTS');
      await client.query(
        'DELETE FROM "Invitation" WHERE "companyId"=$1 AND email=$2 AND "acceptedAt" IS NULL AND "expiresAt"<=now()',
        [user.companyId, parsed.data.email],
      );
      if (
        (
          await client.query(
            'SELECT 1 FROM "Invitation" WHERE "companyId"=$1 AND email=$2 AND "acceptedAt" IS NULL',
            [user.companyId, parsed.data.email],
          )
        ).rowCount
      )
        throw new ApiError(409, 'INVITE_EXISTS');
      await client.query(
        'INSERT INTO "Invitation"(id,"companyId",name,email,position,"tokenHash","expiresAt") VALUES($1,$2,$3,$4,$5,$6,now()+interval \'3 days\')',
        [
          randomUUID(),
          user.companyId,
          parsed.data.name,
          parsed.data.email,
          parsed.data.position,
          digest(value),
        ],
      );
    });
    return { token: value };
  }
  async access(user: Principal, id: string, active: boolean) {
    requireOwner(user.role);
    if (user.id === id) throw new ApiError(409, 'CANNOT_CHANGE_SELF');
    await transaction(this.pool, user.companyId, async (client) => {
      const result = await client.query(
        'UPDATE "AppUser" SET active=$1 WHERE id=$2 AND "companyId"=$3 AND role<>\'OWNER\' RETURNING id',
        [active, id, user.companyId],
      );
      if (!result.rowCount) throw new ApiError(404, 'MEMBER_NOT_FOUND');
      if (!active)
        await client.query('DELETE FROM "AuthSession" WHERE "userId"=$1', [id]);
    });
    return { ok: true };
  }
  async revoke(user: Principal, id: string) {
    requireOwner(user.role);
    await this.pool.query(
      'DELETE FROM "Invitation" WHERE id=$1 AND "companyId"=$2 AND "acceptedAt" IS NULL',
      [id, user.companyId],
    );
    return { ok: true };
  }
}
