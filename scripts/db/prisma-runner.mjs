import { spawnSync } from 'node:child_process';
import {
  assertLocalDatabaseEnv,
  assertProductionDatabaseEnv,
  formatEnvTarget,
  isDangerousPrismaCommand,
  loadEnvFile,
  resolveFromRepo,
} from './env-utils.mjs';

const [target, ...prismaArgs] = process.argv.slice(2);

if (!target || prismaArgs.length === 0) {
  console.error('Usage: node scripts/db/prisma-runner.mjs <local|prod> <prisma args...>');
  process.exit(1);
}

if (target !== 'local' && target !== 'prod') {
  console.error(`Unsupported target: ${target}`);
  process.exit(1);
}

const envFilePath =
  target === 'local'
    ? resolveFromRepo('.env.prisma.local')
    : resolveFromRepo('.env.prisma.prod');

loadEnvFile(envFilePath);

if (target === 'local') {
  assertLocalDatabaseEnv({
    databaseUrl: process.env.DATABASE_URL,
    directUrl: process.env.DIRECT_URL,
  });
} else {
  assertProductionDatabaseEnv({
    databaseUrl: process.env.DATABASE_URL,
    directUrl: process.env.DIRECT_URL,
    expectedDatabaseHost: process.env.EXPECTED_DATABASE_HOST,
    expectedDirectHost: process.env.EXPECTED_DIRECT_HOST,
  });

  if (isDangerousPrismaCommand(prismaArgs)) {
    console.error(`Blocked Prisma command on production target: ${prismaArgs.join(' ')}`);
    process.exit(1);
  }

  const isDeploy = prismaArgs.join(' ') === 'migrate deploy';
  if (isDeploy && process.env.PROD_CONFIRM !== 'ownhome-production') {
    console.error(
      'Refusing production migration. Set PROD_CONFIRM=ownhome-production for a deliberate deploy.'
    );
    process.exit(1);
  }
}

console.log(`Using Prisma env: ${formatEnvTarget(envFilePath)}`);
console.log(`Running: prisma ${prismaArgs.join(' ')}`);

const result = spawnSync('npx', ['prisma', ...prismaArgs], {
  stdio: 'inherit',
  cwd: resolveFromRepo(),
  env: process.env,
  shell: process.platform === 'win32',
});

process.exit(result.status ?? 1);