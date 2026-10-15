import {
  existsSync,
  mkdirSync,
  writeFileSync,
  readFileSync,
  unlinkSync,
} from 'node:fs';
import { resolve, dirname } from 'node:path';
import { createRequire } from 'node:module';
import { spawnSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';
const root = resolve(import.meta.dirname, '..');
const local = resolve(root, '.local');
mkdirSync(local, { recursive: true });
const binary = process.env.POSTGRES_BIN ?? 'C:/Program Files/PostgreSQL/18/bin';
const executable = (name) =>
  resolve(binary, process.platform === 'win32' ? `${name}.exe` : name);
if (!existsSync(executable('initdb')))
  throw new Error('Set POSTGRES_BIN to a PostgreSQL bin directory.');
const runtimeFile = resolve(local, 'database.json');
const runtime = existsSync(runtimeFile)
  ? JSON.parse(readFileSync(runtimeFile, 'utf8'))
  : {
      admin: randomBytes(24).toString('hex'),
      password: randomBytes(24).toString('hex'),
    };
if (!existsSync(runtimeFile))
  writeFileSync(runtimeFile, JSON.stringify(runtime), { mode: 0o600 });
const data = resolve(local, 'postgres');
function run(name, args) {
  const result = spawnSync(executable(name), args, {
    windowsHide: true,
    stdio: 'ignore',
  });
  if (result.status !== 0)
    throw new Error(
      `${name} failed (exit ${result.status}). Check .local/postgres.log.`,
    );
}
if (!existsSync(resolve(data, 'PG_VERSION'))) {
  const passwordFile = resolve(local, 'init-password.tmp');
  writeFileSync(passwordFile, runtime.admin, { mode: 0o600 });
  try {
    run('initdb', [
      '-D',
      data,
      '-U',
      'buildos_admin',
      `--pwfile=${passwordFile}`,
      '--encoding=UTF8',
      '--locale=C',
      '--auth=scram-sha-256',
    ]);
  } finally {
    unlinkSync(passwordFile);
  }
}
if (
  spawnSync(executable('pg_ctl'), ['-D', data, 'status'], {
    windowsHide: true,
    stdio: 'ignore',
  }).status !== 0
)
  run('pg_ctl', [
    '-D',
    data,
    '-l',
    resolve(local, 'postgres.log'),
    '-o',
    '-h 127.0.0.1 -p 55432',
    '-w',
    'start',
  ]);
const require = createRequire(resolve(root, 'apps/api/package.json'));
const { Pool } = require('pg');
const pool = new Pool({
  connectionString: `postgresql://buildos_admin:${runtime.admin}@127.0.0.1:55432/postgres`,
});
try {
  if (
    !(await pool.query("SELECT 1 FROM pg_roles WHERE rolname='buildos'"))
      .rowCount
  ) {
    const command = await pool.query(
      "SELECT format('CREATE ROLE buildos LOGIN NOSUPERUSER NOCREATEDB PASSWORD %L',$1::text) AS command",
      [runtime.password],
    );
    await pool.query(command.rows[0].command);
  }
  if (
    !(await pool.query("SELECT 1 FROM pg_database WHERE datname='buildos'"))
      .rowCount
  )
    await pool.query('CREATE DATABASE buildos OWNER buildos');
} finally {
  await pool.end();
}
const url = `postgresql://buildos:${runtime.password}@127.0.0.1:55432/buildos`;
const envFile = resolve(root, 'apps/api/.env.local');
writeFileSync(
  envFile,
  `DATABASE_URL=${url}\nREDIS_URL=redis://127.0.0.1:6379\nQUEUE_ENABLED=false\nWEB_ORIGIN=http://127.0.0.1:5173\nHOST=127.0.0.1\nPORT=3001\nNODE_ENV=development\n`,
  { mode: 0o600 },
);
const prisma = resolve(
  dirname(require.resolve('prisma/package.json')),
  'build/index.js',
);
const migration = spawnSync(
  process.execPath,
  [
    prisma,
    'migrate',
    'deploy',
    '--schema',
    resolve(root, 'apps/api/prisma/schema.prisma'),
  ],
  {
    cwd: root,
    env: { ...process.env, DATABASE_URL: url },
    windowsHide: true,
    encoding: 'utf8',
  },
);
if (migration.status !== 0)
  throw new Error(
    'Migration failed; database credentials have not been printed.',
  );
process.stdout.write(
  'Isolated PostgreSQL ready on 127.0.0.1:55432; migrations applied. Existing system service unchanged.\n',
);
