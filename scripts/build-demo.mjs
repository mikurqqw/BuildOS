import { spawnSync } from 'node:child_process';
import { cpSync, mkdirSync, rmSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
const root = resolve(import.meta.dirname, '..');
const result = spawnSync(
  process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm',
  ['--filter', '@buildos/web...', 'build'],
  {
    cwd: root,
    env: { ...process.env, VITE_DEMO_ONLY: 'true' },
    stdio: 'inherit',
    shell: process.platform === 'win32',
    windowsHide: true,
  },
);
if (result.status !== 0) process.exit(result.status ?? 1);
const output = resolve(root, 'dist');
if (dirname(output) !== root) throw new Error('Invalid build output directory');
rmSync(output, { recursive: true, force: true });
mkdirSync(output, { recursive: true });
cpSync(resolve(root, 'apps/web/dist'), output, {
  recursive: true,
});
