import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { randomBytes, randomUUID } from 'node:crypto';
import { createRequire } from 'node:module';
import { buildApp } from '../apps/api/src/app.ts';
import { IdentityService } from '../apps/api/src/access/identity-service.ts';
const root = resolve(import.meta.dirname, '..');
const require = createRequire(resolve(root, 'apps/api/package.json'));
const { Pool } = require('pg');
const url =
  process.env.TEST_DATABASE_URL ??
  readFileSync(resolve(root, 'apps/api/.env.local'), 'utf8')
    .match(/^DATABASE_URL=(.+)$/m)?.[1]
    ?.trim();
if (!url) throw new Error('Local development database is required');
const schema = `qa_browser_${randomUUID().replaceAll('-', '')}`;
const control = new Pool({ connectionString: url });
await control.query(`CREATE SCHEMA ${schema}`);
const pool = new Pool({
  connectionString: url,
  options: `-c search_path=${schema}`,
});
for (const directory of readdirSync(resolve(root, 'apps/api/prisma/migrations'))
  .filter((name) => /^\d/.test(name))
  .sort())
  await pool.query(
    readFileSync(
      resolve(root, 'apps/api/prisma/migrations', directory, 'migration.sql'),
      'utf8',
    ),
  );
const email = 'browser-qa@example.test';
const password = randomBytes(24).toString('hex');
await new IdentityService(pool).setup({
  email,
  password,
  name: 'Тестовая команда',
  company: 'BuildOS · QA',
});
writeFileSync(
  resolve(root, '.local/qa-login.json'),
  JSON.stringify({ email, password }),
  { mode: 0o600 },
);
const app = await buildApp({
  database: pool,
  origin: 'http://127.0.0.1:5174',
  ready: async () => true,
});
await app.listen({ host: '127.0.0.1', port: 3002 });
process.stdout.write(
  'Isolated browser QA API ready on 127.0.0.1:3002. Credentials were not printed.\n',
);
async function stop() {
  await app.close();
  await pool.end();
  if (/^qa_browser_[a-f0-9]{32}$/.test(schema))
    await control.query(`DROP SCHEMA ${schema} CASCADE`);
  await control.end();
  process.exit(0);
}
process.on('SIGINT', () => void stop());
process.on('SIGTERM', () => void stop());
