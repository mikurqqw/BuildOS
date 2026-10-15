import { randomUUID } from 'node:crypto';
import type { Pool, PoolClient } from 'pg';
import type { Principal } from './security.js';
import { z } from 'zod';
import { ApiError } from './errors.js';
import { transaction } from './repository.js';
export async function audit(
  client: PoolClient,
  user: Principal,
  action: string,
  collection: string,
  recordId: string | null = null,
  projectId: string | null = null,
) {
  await client.query(
    'INSERT INTO "AuditEvent"(id,"companyId","actorId","actorName",action,collection,"recordId","projectId") VALUES($1,$2,$3,$4,$5,$6,$7,$8)',
    [
      randomUUID(),
      user.companyId,
      user.id,
      user.name,
      action,
      collection,
      recordId,
      projectId,
    ],
  );
}
export async function listAudit(
  pool: Pool,
  user: Principal,
  limit: number,
  before?: string,
) {
  let cursor: { time: string; id: string } | undefined;
  if (before) {
    try {
      cursor = z
        .object({
          time: z
            .string()
            .max(64)
            .regex(/^\d{4}-\d{2}-\d{2} /)
            .refine((value) => Number.isFinite(Date.parse(value))),
          id: z.uuid(),
        })
        .parse(JSON.parse(Buffer.from(before, 'base64url').toString('utf8')));
    } catch {
      throw new ApiError(422, 'INVALID_INPUT');
    }
  }
  return transaction(pool, user.companyId, async (client) => {
    const result = await client.query<{
      id: string;
      actorId: string | null;
      actorName: string;
      action: string;
      collection: string;
      recordId: string | null;
      projectId: string | null;
      createdAt: Date;
      cursorTime: string;
    }>(
      'SELECT id,"actorId","actorName",action,collection,"recordId","projectId","createdAt","createdAt"::text AS "cursorTime" FROM "AuditEvent" WHERE "companyId"=$1 AND ($2::timestamptz IS NULL OR ("createdAt",id)<($2::timestamptz,$7::uuid)) AND (($3::boolean AND "projectId" IS NOT NULL) OR $4::boolean OR "projectId"=ANY($5::text[])) ORDER BY "createdAt" DESC,id DESC LIMIT $6',
      [
        user.companyId,
        cursor?.time ?? null,
        user.allProjects,
        user.role === 'OWNER',
        user.projectIds,
        limit + 1,
        cursor?.id ?? null,
      ],
    );
    const events = result.rows.slice(0, limit).map((row) => ({
      id: row.id,
      actorId: row.actorId,
      actorName: row.actorName,
      action: row.action,
      collection: row.collection,
      recordId: row.recordId,
      projectId: row.projectId,
      createdAt: row.createdAt.toISOString(),
    }));
    return {
      events,
      nextCursor:
        result.rows.length > limit
          ? Buffer.from(
              JSON.stringify({
                time: result.rows[limit - 1]!.cursorTime,
                id: result.rows[limit - 1]!.id,
              }),
            ).toString('base64url')
          : null,
    };
  });
}
