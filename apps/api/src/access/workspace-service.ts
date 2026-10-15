import type { Pool } from 'pg';
import { workspaceSchema } from '@buildos/shared';
import { transaction } from './repository.js';
import { ApiError } from './errors.js';
export class WorkspaceService {
  constructor(private pool: Pool) {}
  async get(companyId: string) {
    return transaction(this.pool, companyId, async (client) => {
      const result = await client.query<{ payload: unknown; version: number }>(
        'SELECT payload,version FROM "CompanyWorkspace" WHERE "companyId"=$1',
        [companyId],
      );
      if (!result.rows[0]) throw new ApiError(404, 'WORKSPACE_NOT_FOUND');
      return {
        data: workspaceSchema.parse(result.rows[0].payload),
        version: result.rows[0].version,
      };
    });
  }
  async save(companyId: string, version: number, input: unknown) {
    const parsed = workspaceSchema.safeParse(input);
    if (!parsed.success) throw new ApiError(422, 'INVALID_WORKSPACE');
    return transaction(this.pool, companyId, async (client) => {
      const result = await client.query<{ version: number }>(
        'UPDATE "CompanyWorkspace" SET payload=$1,version=version+1,"updatedAt"=now() WHERE "companyId"=$2 AND version=$3 RETURNING version',
        [JSON.stringify(parsed.data), companyId, version],
      );
      if (!result.rows[0]) throw new ApiError(409, 'WORKSPACE_CONFLICT');
      return { data: parsed.data, version: result.rows[0].version };
    });
  }
}
