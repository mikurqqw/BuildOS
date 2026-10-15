import type { Pool, PoolClient } from 'pg';
import { ApiError } from './errors.js';
export async function transaction<T>(
  pool: Pool,
  companyId: string | null,
  run: (client: PoolClient) => Promise<T>,
): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    if (companyId)
      await client.query("SELECT set_config('app.company_id',$1,true)", [
        companyId,
      ]);
    const result = await run(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}
export function requireOwner(role: string) {
  if (role !== 'OWNER') throw new ApiError(403, 'OWNER_REQUIRED');
}
