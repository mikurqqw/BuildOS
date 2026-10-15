import { randomUUID } from 'node:crypto';
import type { Pool } from 'pg';
import { documentSchema } from '@buildos/shared';
import { transaction } from './repository.js';
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
    companyId: string,
    projectId: string,
    name: string,
    bytes: Buffer,
  ) {
    const mime = detectFile(name, bytes);
    const metadata = documentSchema.parse({
      id: randomUUID(),
      projectId,
      name,
      size: bytes.length,
      mime,
      createdAt: new Date().toISOString(),
    });
    await transaction(this.pool, companyId, async (client) => {
      const workspace = await client.query<{
        payload: { projects: { id: string }[] };
      }>('SELECT payload FROM "CompanyWorkspace" WHERE "companyId"=$1', [
        companyId,
      ]);
      if (
        !workspace.rows[0]?.payload.projects.some(
          (project) => project.id === projectId,
        )
      )
        throw new ApiError(404, 'PROJECT_NOT_FOUND');
      await client.query(
        'INSERT INTO "StoredFile"(id,"companyId",name,mime,bytes) VALUES($1,$2,$3,$4,$5)',
        [metadata.id, companyId, name, mime, bytes],
      );
    });
    return metadata;
  }
  async get(companyId: string, id: string) {
    return transaction(this.pool, companyId, async (client) => {
      const result = await client.query<{
        name: string;
        mime: string;
        bytes: Buffer;
      }>(
        'SELECT f.name,f.mime,f.bytes FROM "StoredFile" f WHERE f.id=$1 AND f."companyId"=$2 AND EXISTS (SELECT 1 FROM "CompanyWorkspace" w, jsonb_array_elements(w.payload->\'documents\') d WHERE w."companyId"=$2 AND d->>\'id\'=f.id)',
        [id, companyId],
      );
      if (!result.rows[0]) throw new ApiError(404, 'FILE_NOT_FOUND');
      return result.rows[0];
    });
  }
  async remove(companyId: string, id: string) {
    await transaction(this.pool, companyId, async (client) => {
      const attached = await client.query(
        'SELECT 1 FROM "CompanyWorkspace" w, jsonb_array_elements(w.payload->\'documents\') d WHERE w."companyId"=$1 AND d->>\'id\'=$2',
        [companyId, id],
      );
      if (attached.rowCount) throw new ApiError(409, 'FILE_STILL_ATTACHED');
      await client.query(
        'DELETE FROM "StoredFile" WHERE id=$1 AND "companyId"=$2',
        [id, companyId],
      );
    });
    return { ok: true };
  }
}
