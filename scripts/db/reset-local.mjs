import { spawnSync } from 'node:child_process';
import { resolveFromRepo } from './env-utils.mjs';

const repoRoot = resolveFromRepo();

const migrateReset = spawnSync(
  'node',
  [
    resolveFromRepo('scripts', 'db', 'prisma-runner.mjs'),
    'local',
    'db',
    'push',
    '--force-reset',
    '--skip-generate',
  ],
  {
    stdio: 'inherit',
    cwd: repoRoot,
    env: process.env,
    shell: process.platform === 'win32',
  }
);

if ((migrateReset.status ?? 1) !== 0) {
  process.exit(migrateReset.status ?? 1);
}

const seed = spawnSync(
  'node',
  [resolveFromRepo('scripts', 'db', 'apply-local-sql.mjs')],
  {
    stdio: 'inherit',
    cwd: repoRoot,
    env: process.env,
    shell: process.platform === 'win32',
  }
);

if ((seed.status ?? 1) !== 0) {
  process.exit(seed.status ?? 1);
}

const localSeed = spawnSync(
  'node',
  [resolveFromRepo('scripts', 'db', 'seed-budget-categories.mjs'), resolveFromRepo('.env.prisma.local')],
  {
    stdio: 'inherit',
    cwd: repoRoot,
    env: process.env,
    shell: process.platform === 'win32',
  }
);

process.exit(localSeed.status ?? 1);