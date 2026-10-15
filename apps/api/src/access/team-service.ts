import { randomUUID } from 'node:crypto';
import type { Pool } from 'pg';
import { inviteSchema, memberAccessSchema } from '@buildos/shared';
import { transaction, requireOwner } from './repository.js';
import { ApiError } from './errors.js';
import { audit } from './audit-service.js';
import { token, digest, type Principal } from './security.js';
export class TeamService {
  constructor(private pool: Pool) {}
  async list(user: Principal) {
    const [users, invitations] = await Promise.all([
      this.pool.query(
        'SELECT id,"companyId",name,email,role,position,active,"allProjects","projectIds" FROM "AppUser" WHERE "companyId"=$1 ORDER BY "createdAt"',
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
  async access(user: Principal, id: string, input: unknown) {
    requireOwner(user.role);
    if (user.id === id) throw new ApiError(409, 'CANNOT_CHANGE_SELF');
    const parsed = memberAccessSchema.safeParse(input);
    if (!parsed.success) throw new ApiError(422, 'INVALID_INPUT');
    const values = parsed.data;
    await transaction(this.pool, user.companyId, async (client) => {
      const target = await client.query(
        'SELECT id FROM "AppUser" WHERE id=$1 AND "companyId"=$2 AND role<>\'OWNER\' FOR UPDATE',
        [id, user.companyId],
      );
      if (!target.rowCount) throw new ApiError(404, 'MEMBER_NOT_FOUND');
      if (values.projectIds) {
        const workspace = await client.query<{
          payload: { projects: { id: string }[] };
        }>('SELECT payload FROM "CompanyWorkspace" WHERE "companyId"=$1', [
          user.companyId,
        ]);
        if (
          values.projectIds.some(
            (projectId) =>
              !workspace.rows[0]?.payload.projects.some(
                (project) => project.id === projectId,
              ),
          )
        )
          throw new ApiError(422, 'INVALID_PROJECT');
      }
      await client.query(
        'UPDATE "AppUser" SET active=COALESCE($1,active),role=COALESCE($2,role),"allProjects"=COALESCE($3,"allProjects"),"projectIds"=COALESCE($4,"projectIds") WHERE id=$5',
        [
          values.active ?? null,
          values.role ?? null,
          values.allProjects ?? null,
          values.projectIds ?? null,
          id,
        ],
      );
      await client.query('DELETE FROM "AuthSession" WHERE "userId"=$1', [id]);
      await audit(client, user, 'access.update', 'users', id);
    });
    return { ok: true };
  }
  async recovery(user: Principal, id: string) {
    requireOwner(user.role);
    if (id === user.id) throw new ApiError(409, 'CANNOT_CHANGE_SELF');
    const value = token();
    await transaction(this.pool, user.companyId, async (client) => {
      const target = await client.query(
        'SELECT id FROM "AppUser" WHERE id=$1 AND "companyId"=$2 AND role<>\'OWNER\' AND active=true FOR UPDATE',
        [id, user.companyId],
      );
      if (!target.rowCount) throw new ApiError(404, 'MEMBER_NOT_FOUND');
      await client.query(
        'UPDATE "PasswordRecovery" SET "consumedAt"=now() WHERE "userId"=$1 AND "consumedAt" IS NULL',
        [id],
      );
      await client.query(
        'INSERT INTO "PasswordRecovery"("tokenHash","userId","expiresAt") VALUES($1,$2,now()+interval \'30 minutes\')',
        [digest(value), id],
      );
      await audit(client, user, 'recovery.issue', 'users', id);
    });
    return { token: value };
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
