import { createRequire } from 'node:module';
import { resolve, dirname } from 'node:path';
import { pathToFileURL } from 'node:url';
import { spawn } from 'node:child_process';
const root = resolve(import.meta.dirname, '..');
const apiRequire = createRequire(resolve(root, 'apps/api/package.json'));
const webRequire = createRequire(resolve(root, 'apps/web/package.json'));
const api = spawn(
  process.execPath,
  [
    '--watch',
    '--conditions=development',
    '--env-file-if-exists=apps/api/.env',
    '--env-file-if-exists=apps/api/.env.local',
    '--import',
    pathToFileURL(apiRequire.resolve('tsx')).href,
    'apps/api/src/server.ts',
  ],
  { cwd: root, stdio: 'inherit', windowsHide: true },
);
const web = spawn(
  process.execPath,
  [
    resolve(dirname(webRequire.resolve('vite/package.json')), 'bin/vite.js'),
    '--host',
    '127.0.0.1',
  ],
  { cwd: resolve(root, 'apps/web'), stdio: 'inherit', windowsHide: true },
);
const stop = () => {
  api.kill();
  web.kill();
};
process.on('SIGINT', stop);
process.on('SIGTERM', stop);
api.on('exit', (code) => {
  if (code) {
    web.kill();
    process.exitCode = code;
  }
});
web.on('exit', (code) => {
  api.kill();
  if (code) process.exitCode = code;
});
