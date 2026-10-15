import type { Pool } from 'pg';
import {
  workspaceSchema,
  visibleWorkspace,
  mergeWorkspace,
  validateWorkspaceChange,
  type Workspace,
} from '@buildos/shared';
import { transaction } from './repository.js';
import { ApiError } from './errors.js';
import type { Principal } from './security.js';
import { randomUUID } from 'node:crypto';
export class WorkspaceService {
  constructor(private pool: Pool) {}
  async get(user: Principal) {
    return transaction(this.pool, user.companyId, async (client) => {
      const result = await client.query<{ payload: unknown; version: number }>(
        'SELECT payload,version FROM "CompanyWorkspace" WHERE "companyId"=$1',
        [user.companyId],
      );
      const row = result.rows[0];
      if (!row) throw new ApiError(404, 'WORKSPACE_NOT_FOUND');
      return {
        data: visibleWorkspace(workspaceSchema.parse(row.payload), user),
        version: row.version,
      };
    });
  }
  async save(user: Principal, version: number, input: unknown) {
    const parsed = workspaceSchema.safeParse(input);
    if (!parsed.success) throw new ApiError(422, 'INVALID_WORKSPACE');
    return transaction(this.pool, user.companyId, async (client) => {
      const result = await client.query<{ payload: unknown; version: number }>(
        'SELECT payload,version FROM "CompanyWorkspace" WHERE "companyId"=$1 FOR UPDATE',
        [user.companyId],
      );
      const row = result.rows[0];
      if (!row) throw new ApiError(404, 'WORKSPACE_NOT_FOUND');
      if (row.version !== version)
        throw new ApiError(409, 'WORKSPACE_CONFLICT');
      const previous = workspaceSchema.parse(row.payload);
      let next: Workspace;
      try {
        next = validateWorkspaceChange(
          previous,
          mergeWorkspace(previous, parsed.data, user),
          user,
        );
      } catch (error) {
        const code =
          error instanceof Error ? error.message : 'INVALID_WORKSPACE';
        throw new ApiError(code.startsWith('FORBIDDEN') ? 403 : 422, code);
      }
      const stored = await client.query<{
        id: string;
        projectId: string | null;
        name: string;
        mime: string;
        size: number;
      }>(
        'SELECT id,"projectId",name,mime,octet_length(bytes) AS size FROM "StoredFile" WHERE "companyId"=$1 AND id=ANY($2::text[]) FOR SHARE',
        [user.companyId, next.documents.map((document) => document.id)],
      );
      const files = new Map(stored.rows.map((file) => [file.id, file]));
      for (const document of next.documents) {
        const file = files.get(document.id);
        if (
          !file ||
          file.projectId !== document.projectId ||
          file.name !== document.name ||
          file.mime !== document.mime ||
          file.size !== document.size
        )
          throw new ApiError(422, 'INVALID_FILE_REFERENCE');
      }
      const events: {
        id: string;
        action: string;
        collection: string;
        recordId: string;
        projectId: string | null;
      }[] = [];
      for (const collection of [
        'projects',
        'tasks',
        'issues',
        'budgetLines',
        'documents',
        'requests',
        'stockMovements',
        'payments',
        'stages',
        'suppliers',
        'members',
      ] as const) {
        const old = new Map(
          previous[collection].map((item) => [item.id, item]),
        );
        const current = new Map(
          next[collection].map((item) => [item.id, item]),
        );
        for (const [id, item] of current) {
          if (JSON.stringify(old.get(id)) !== JSON.stringify(item))
            events.push({
              id: randomUUID(),
              action: old.has(id) ? 'update' : 'create',
              collection,
              recordId: id,
              projectId:
                'projectId' in item
                  ? String(item.projectId)
                  : collection === 'projects'
                    ? id
                    : null,
            });
        }
        for (const [id, item] of old) {
          if (!current.has(id))
            events.push({
              id: randomUUID(),
              action: 'delete',
              collection,
              recordId: id,
              projectId:
                'projectId' in item
                  ? String(item.projectId)
                  : collection === 'projects'
                    ? id
                    : null,
            });
        }
      }
      if (events.length)
        await client.query(
          'INSERT INTO "AuditEvent"(id,"companyId","actorId","actorName",action,collection,"recordId","projectId") SELECT e.id,$1,$2,$3,e.action,e.collection,e."recordId",e."projectId" FROM jsonb_to_recordset($4::jsonb) AS e(id uuid,action text,collection text,"recordId" text,"projectId" text)',
          [user.companyId, user.id, user.name, JSON.stringify(events)],
        );
      await client.query(
        'UPDATE "CompanyWorkspace" SET payload=$1,version=version+1,"updatedAt"=now() WHERE "companyId"=$2',
        [JSON.stringify(next), user.companyId],
      );
      return { data: visibleWorkspace(next, user), version: version + 1 };
    });
  }
}
