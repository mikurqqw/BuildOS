import { createRequire } from 'node:module';
import { resolve } from 'node:path';
const require = createRequire(
  resolve(import.meta.dirname, '../apps/api/package.json'),
);
const { Pool } = require('pg');
if (!process.env.CI_DATABASE_ADMIN_URL)
  throw new Error('CI_DATABASE_ADMIN_URL is required');
const pool = new Pool({ connectionString: process.env.CI_DATABASE_ADMIN_URL });
try {
  await pool.query(
    "CREATE ROLE buildos_ci LOGIN NOSUPERUSER NOCREATEDB PASSWORD 'synthetic-ci-password'",
  );
  await pool.query('GRANT CONNECT,CREATE ON DATABASE buildos TO buildos_ci');
} finally {
  await pool.end();
}
