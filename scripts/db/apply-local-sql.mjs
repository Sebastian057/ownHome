import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { resolveFromRepo } from './env-utils.mjs';

const repoRoot = resolveFromRepo();
const migrationsDir = resolveFromRepo('prisma', 'migrations');
const prismaRunnerPath = resolveFromRepo('scripts', 'db', 'prisma-runner.mjs');
const localSqlMigrations = [
  // Prisma db push applies the structural schema. Local replay only restores
  // SQL concerns that Prisma does not represent, mainly RLS policies.
  'add_meters_module',
  'finance_modules_rls',
  'init_rls',
  'user_profiles_rls',
  'vehicles_rls',
];

const migrationFiles = localSqlMigrations.map((migrationName) => {
  const filePath = path.join(migrationsDir, migrationName, 'migration.sql');

  if (!fs.existsSync(filePath)) {
    throw new Error(`Missing local SQL migration file: ${migrationName}`);
  }

  return filePath;
});

for (const filePath of migrationFiles) {
  console.log(`Applying local SQL sync: ${path.relative(repoRoot, filePath).replace(/\\/gu, '/')}`);

  const result = spawnSync(
    'node',
    [
      prismaRunnerPath,
      'local',
      'db',
      'execute',
      '--schema',
      'prisma/schema.prisma',
      '--file',
      filePath,
    ],
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