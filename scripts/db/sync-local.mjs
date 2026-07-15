import { spawnSync } from 'node:child_process';
import { resolveFromRepo } from './env-utils.mjs';

const repoRoot = resolveFromRepo();

function runNodeScript(relativePath) {
  const result = spawnSync('node', [resolveFromRepo(...relativePath)], {
    stdio: 'inherit',
    cwd: repoRoot,
    env: process.env,
    shell: process.platform === 'win32',
  });

  if ((result.status ?? 1) !== 0) {
    process.exit(result.status ?? 1);
  }
}

function runPrismaLocal(...prismaArgs) {
  const result = spawnSync(
    'node',
    [resolveFromRepo('scripts', 'db', 'prisma-runner.mjs'), 'local', ...prismaArgs],
    {
      stdio: 'inherit',
      cwd: repoRoot,
      env: process.env,
      shell: process.platform === 'win32',
    }
  );

  if ((result.status ?? 1) !== 0) {
    process.exit(result.status ?? 1);
  }
}

runPrismaLocal('db', 'push', '--skip-generate');
runNodeScript(['scripts', 'db', 'apply-local-sql.mjs']);
runNodeScript(['scripts', 'db', 'seed-budget-categories.mjs', '.env.prisma.local']);