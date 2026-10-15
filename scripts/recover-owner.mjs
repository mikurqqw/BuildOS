import { createRequire } from 'node:module';
import { randomBytes, createHash, randomUUID } from 'node:crypto';
const require = createRequire(
  new URL('../apps/api/package.json', import.meta.url),
);
const { Pool } = require('pg');
const [email, baseUrl] = process.argv.slice(2);
if (!process.env.DATABASE_URL || !email || !baseUrl) {
  console.error(
    'Usage: DATABASE_URL=<admin connection> node scripts/recover-owner.mjs <owner-email> <app-origin>',
  );
  process.exit(1);
}
let origin;
try {
  const parsed = new URL(baseUrl);
  if (
    !['http:', 'https:'].includes(parsed.protocol) ||
    parsed.username ||
    parsed.password
  )
    throw new Error();
  origin = parsed.origin;
} catch {
  console.error('Provide a valid application origin.');
  process.exit(1);
}
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const client = await pool.connect();
try {
  await client.query('BEGIN');
  const result = await client.query(
    'SELECT id,"companyId",name FROM "AppUser" WHERE email=$1 AND role=\'OWNER\' AND active=true FOR UPDATE',
    [email.trim().toLowerCase()],
  );
  const user = result.rows[0];
  if (!user) throw new Error('OWNER_NOT_FOUND');
  await client.query("SELECT set_config('app.company_id',$1,true)", [
    user.companyId,
  ]);
  const token = randomBytes(32).toString('hex');
  const hash = createHash('sha256').update(token).digest('hex');
  await client.query(
    'UPDATE "PasswordRecovery" SET "consumedAt"=now() WHERE "userId"=$1 AND "consumedAt" IS NULL',
    [user.id],
  );
  await client.query(
    'INSERT INTO "PasswordRecovery"("tokenHash","userId","expiresAt") VALUES($1,$2,now()+interval \'30 minutes\')',
    [hash, user.id],
  );
  await client.query(
    'INSERT INTO "AuditEvent"(id,"companyId","actorId","actorName",action,collection,"recordId") VALUES($1,$2,NULL,$3,$4,$5,$6)',
    [
      randomUUID(),
      user.companyId,
      'Database operator',
      'recovery.issue',
      'users',
      user.id,
    ],
  );
  await client.query('COMMIT');
  console.log(
    `Single-use link (30 minutes). Deliver privately:\n${origin}/?reset=${token}`,
  );
} catch (error) {
  await client.query('ROLLBACK');
  console.error(
    error instanceof Error && error.message === 'OWNER_NOT_FOUND'
      ? 'Active owner not found.'
      : 'Recovery failed. Verify database access and migrations.',
  );
  process.exitCode = 1;
} finally {
  client.release();
  await pool.end();
}
