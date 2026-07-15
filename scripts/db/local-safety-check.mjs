import {
  assertLocalDatabaseEnv,
  assertProductionDatabaseEnv,
  fileExists,
  parseConnectionUrl,
  parseEnvFile,
  resolveFromRepo,
} from './env-utils.mjs';

function requireEnvKey(envMap, key, fileName) {
  const value = envMap[key];

  if (!value) {
    throw new Error(`Missing ${key} in ${fileName}.`);
  }

  return value;
}

function assertLocalSupabaseUrl(urlValue) {
  const parsed = parseConnectionUrl(urlValue, 'NEXT_PUBLIC_SUPABASE_URL');
  const isLocal = parsed.hostname === '127.0.0.1' || parsed.hostname === 'localhost';

  if (!isLocal) {
    throw new Error(
      `NEXT_PUBLIC_SUPABASE_URL is not local: ${parsed.hostname}. Refusing local-safety check.`
    );
  }
}

function printOk(label, value) {
  console.log(`OK  ${label}: ${value}`);
}

function main() {
  const envLocalPath = resolveFromRepo('.env.local');
  const envPrismaLocalPath = resolveFromRepo('.env.prisma.local');
  const envPrismaProdPath = resolveFromRepo('.env.prisma.prod');

  if (!fileExists(envLocalPath)) {
    throw new Error('Missing .env.local');
  }

  if (!fileExists(envPrismaLocalPath)) {
    throw new Error('Missing .env.prisma.local');
  }

  const envLocal = parseEnvFile(envLocalPath);
  const envPrismaLocal = parseEnvFile(envPrismaLocalPath);

  const runtimeSupabaseUrl = requireEnvKey(envLocal, 'NEXT_PUBLIC_SUPABASE_URL', '.env.local');
  const runtimeDatabaseUrl = requireEnvKey(envLocal, 'DATABASE_URL', '.env.local');
  const runtimeDirectUrl = requireEnvKey(envLocal, 'DIRECT_URL', '.env.local');

  assertLocalSupabaseUrl(runtimeSupabaseUrl);
  assertLocalDatabaseEnv({
    databaseUrl: runtimeDatabaseUrl,
    directUrl: runtimeDirectUrl,
  });

  assertLocalDatabaseEnv({
    databaseUrl: requireEnvKey(envPrismaLocal, 'DATABASE_URL', '.env.prisma.local'),
    directUrl: requireEnvKey(envPrismaLocal, 'DIRECT_URL', '.env.prisma.local'),
  });

  printOk('runtime Supabase URL', runtimeSupabaseUrl);
  printOk('runtime DATABASE_URL', runtimeDatabaseUrl);
  printOk('runtime DIRECT_URL', runtimeDirectUrl);
  printOk('prisma local DATABASE_URL', envPrismaLocal.DATABASE_URL);
  printOk('prisma local DIRECT_URL', envPrismaLocal.DIRECT_URL);

  if (fileExists(envPrismaProdPath)) {
    const envPrismaProd = parseEnvFile(envPrismaProdPath);

    assertProductionDatabaseEnv({
      databaseUrl: requireEnvKey(envPrismaProd, 'DATABASE_URL', '.env.prisma.prod'),
      directUrl: requireEnvKey(envPrismaProd, 'DIRECT_URL', '.env.prisma.prod'),
      expectedDatabaseHost: envPrismaProd.EXPECTED_DATABASE_HOST,
      expectedDirectHost: envPrismaProd.EXPECTED_DIRECT_HOST,
    });

    printOk('prisma prod DATABASE_URL host', parseConnectionUrl(envPrismaProd.DATABASE_URL, 'DATABASE_URL').hostname);
    printOk('prisma prod DIRECT_URL host', parseConnectionUrl(envPrismaProd.DIRECT_URL, 'DIRECT_URL').hostname);
  } else {
    console.log('INFO .env.prisma.prod not found (this is acceptable if you are not running production workflows).');
  }

  console.log('Safe local setup confirmed. Local app/database changes are targeting localhost only.');
}

try {
  main();
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}