import { spawnSync } from 'node:child_process';
import { cpSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
const root = resolve(import.meta.dirname, '..');
const result = spawnSync(
  process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm',
  ['--filter', '@buildos/web', 'build'],
  {
    cwd: root,
    env: { ...process.env, VITE_DEMO_ONLY: 'true' },
    stdio: 'inherit',
    shell: process.platform === 'win32',
    windowsHide: true,
  },
);
if (result.status !== 0) process.exit(result.status ?? 1);
mkdirSync(resolve(root, 'dist'), { recursive: true });
cpSync(resolve(root, 'apps/web/dist'), resolve(root, 'dist'), {
  recursive: true,
});
