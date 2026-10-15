import { randomUUID } from 'node:crypto';
import type { Pool } from 'pg';
import { documentSchema, canWrite, canAccessProject } from '@buildos/shared';
import { transaction } from './repository.js';
import type { Principal } from './security.js';
import { audit } from './audit-service.js';
import { ApiError } from './errors.js';
export function detectFile(name: string, bytes: Buffer): string {
  if (
    !name ||
    name.length > 200 ||
    /[\\/]/.test(name) ||
    Array.from(name).some(
      (char) => char.charCodeAt(0) < 32 || char.charCodeAt(0) === 127,
    ) ||
    bytes.length > 20 * 1024 * 1024
  )
    throw new ApiError(422, 'INVALID_FILE');
  const ext = name.split('.').pop()?.toLowerCase();
  const magic = bytes.subarray(0, 12);
  if (ext === 'pdf' && magic.subarray(0, 5).toString() === '%PDF-')
    return 'application/pdf';
  if (
    ext === 'png' &&
    magic.subarray(0, 8).toString('hex') === '89504e470d0a1a0a'
  )
    return 'image/png';
  if (
    ['jpg', 'jpeg'].includes(ext ?? '') &&
    magic.subarray(0, 3).toString('hex') === 'ffd8ff'
  )
    return 'image/jpeg';
  if (
    ext === 'webp' &&
    magic.subarray(0, 4).toString() === 'RIFF' &&
    magic.subarray(8, 12).toString() === 'WEBP'
  )
    return 'image/webp';
  if (
    ['docx', 'xlsx'].includes(ext ?? '') &&
    magic.subarray(0, 4).toString('hex') === '504b0304'
  )
    return ext === 'docx'
      ? 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
  if (ext === 'txt') {
    try {
      new TextDecoder('utf-8', { fatal: true }).decode(bytes);
      if (bytes.includes(0)) throw new Error('Binary text');
      return 'text/plain';
    } catch {
      throw new ApiError(422, 'INVALID_FILE');
    }
  }
  throw new ApiError(422, 'INVALID_FILE');
}
export class FileService {
  constructor(private pool: Pool) {}
  async upload(
    user: Principal,
    projectId: string,
    name: string,
    bytes: Buffer,
  ) {
    if (!canWrite(user, 'documents') || !canAccessProject(user, projectId))
      throw new ApiError(403, 'FORBIDDEN');
    const mime = detectFile(name, bytes);
    const metadata = documentSchema.parse({
      id: randomUUID(),
      projectId,
      name,
      size: bytes.length,
      mime,
      createdAt: new Date().toISOString(),
    });
    await transaction(this.pool, user.companyId, async (client) => {
      const workspace = await client.query<{
        payload: { projects: { id: string }[] };
      }>('SELECT payload FROM "CompanyWorkspace" WHERE "companyId"=$1', [
        user.companyId,
      ]);
      if (
        !workspace.rows[0]?.payload.projects.some(
          (project) => project.id === projectId,
        )
      )
        throw new ApiError(404, 'PROJECT_NOT_FOUND');
      await client.query(
        'INSERT INTO "StoredFile"(id,"companyId",name,mime,bytes,"projectId") VALUES($1,$2,$3,$4,$5,$6)',
        [metadata.id, user.companyId, name, mime, bytes, projectId],
      );
      await audit(
        client,
        user,
        'file.upload',
        'documents',
        metadata.id,
        projectId,
      );
    });
    return metadata;
  }
  async get(user: Principal, id: string) {
    return transaction(this.pool, user.companyId, async (client) => {
      const result = await client.query<{
        projectId: string | null;
        name: string;
        mime: string;
        bytes: Buffer;
      }>(
        'SELECT f.name,f.mime,f.bytes,f."projectId" FROM "StoredFile" f WHERE f.id=$1 AND f."companyId"=$2 AND EXISTS (SELECT 1 FROM "CompanyWorkspace" w, jsonb_array_elements(w.payload->\'documents\') d WHERE w."companyId"=$2 AND d->>\'id\'=f.id)',
        [id, user.companyId],
      );
      if (!result.rows[0]) throw new ApiError(404, 'FILE_NOT_FOUND');
      if (
        !result.rows[0].projectId ||
        !canAccessProject(user, result.rows[0].projectId)
      )
        throw new ApiError(404, 'FILE_NOT_FOUND');
      return result.rows[0];
    });
  }
  async remove(user: Principal, id: string) {
    if (!canWrite(user, 'documents')) throw new ApiError(403, 'FORBIDDEN');
    await transaction(this.pool, user.companyId, async (client) => {
      await client.query(
        'SELECT 1 FROM "CompanyWorkspace" WHERE "companyId"=$1 FOR UPDATE',
        [user.companyId],
      );
      const existing = await client.query<{ projectId: string | null }>(
        'SELECT "projectId" FROM "StoredFile" WHERE id=$1 AND "companyId"=$2 FOR UPDATE',
        [id, user.companyId],
      );
      const file = existing.rows[0];
      if (!file || !file.projectId || !canAccessProject(user, file.projectId))
        throw new ApiError(404, 'FILE_NOT_FOUND');
      const attached = await client.query(
        'SELECT 1 FROM "CompanyWorkspace" w, jsonb_array_elements(w.payload->\'documents\') d WHERE w."companyId"=$1 AND d->>\'id\'=$2',
        [user.companyId, id],
      );
      if (attached.rowCount) throw new ApiError(409, 'FILE_STILL_ATTACHED');
      await audit(client, user, 'file.delete', 'documents', id, file.projectId);
      await client.query(
        'DELETE FROM "StoredFile" WHERE id=$1 AND "companyId"=$2',
        [id, user.companyId],
      );
    });
    return { ok: true };
  }
}
