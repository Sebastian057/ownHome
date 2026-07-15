import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const LOCAL_HOSTS = new Set(['127.0.0.1', 'localhost']);

export function getRepoRoot() {
  return path.resolve(__dirname, '..', '..');
}

export function resolveFromRepo(...segments) {
  return path.resolve(getRepoRoot(), ...segments);
}

export function fileExists(filePath) {
  return fs.existsSync(filePath);
}

export function parseEnvFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const result = {};

  for (const rawLine of content.split(/\r?\n/u)) {
    const line = rawLine.trim();

    if (!line || line.startsWith('#')) {
      continue;
    }

    const separatorIndex = line.indexOf('=');
    if (separatorIndex === -1) {
      continue;
    }

    const key = line.slice(0, separatorIndex).trim();
    let value = line.slice(separatorIndex + 1).trim();

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    result[key] = value;
  }

  return result;
}

export function loadEnvFile(filePath) {
  if (!fileExists(filePath)) {
    throw new Error(`Missing env file: ${filePath}`);
  }

  const parsed = parseEnvFile(filePath);

  for (const [key, value] of Object.entries(parsed)) {
    process.env[key] = value;
  }

  return parsed;
}

export function parseConnectionUrl(urlValue, label) {
  if (!urlValue) {
    throw new Error(`Missing ${label}.`);
  }

  let parsedUrl;

  try {
    parsedUrl = new URL(urlValue);
  } catch {
    throw new Error(`Invalid ${label}: ${urlValue}`);
  }

  return parsedUrl;
}

export function assertLocalDatabaseEnv({ databaseUrl, directUrl }) {
  const parsedDatabaseUrl = parseConnectionUrl(databaseUrl, 'DATABASE_URL');
  const parsedDirectUrl = parseConnectionUrl(directUrl, 'DIRECT_URL');

  for (const parsedUrl of [parsedDatabaseUrl, parsedDirectUrl]) {
    if (!LOCAL_HOSTS.has(parsedUrl.hostname)) {
      throw new Error(
        `Refusing local DB command because URL host is not local: ${parsedUrl.hostname}`
      );
    }
  }
}

export function assertProductionDatabaseEnv({ databaseUrl, directUrl, expectedDatabaseHost, expectedDirectHost }) {
  const parsedDatabaseUrl = parseConnectionUrl(databaseUrl, 'DATABASE_URL');
  const parsedDirectUrl = parseConnectionUrl(directUrl, 'DIRECT_URL');

  for (const parsedUrl of [parsedDatabaseUrl, parsedDirectUrl]) {
    if (LOCAL_HOSTS.has(parsedUrl.hostname)) {
      throw new Error(
        `Refusing production DB command because URL host is local: ${parsedUrl.hostname}`
      );
    }
  }

  if (expectedDatabaseHost && parsedDatabaseUrl.hostname !== expectedDatabaseHost) {
    throw new Error(
      `DATABASE_URL host mismatch. Expected ${expectedDatabaseHost}, got ${parsedDatabaseUrl.hostname}.`
    );
  }

  if (expectedDirectHost && parsedDirectUrl.hostname !== expectedDirectHost) {
    throw new Error(
      `DIRECT_URL host mismatch. Expected ${expectedDirectHost}, got ${parsedDirectUrl.hostname}.`
    );
  }
}

export function isDangerousPrismaCommand(prismaArgs) {
  const command = prismaArgs.join(' ');

  return [
    'migrate dev',
    'migrate reset',
    'db push',
    'db execute',
    'db seed',
    'db pull',
    'db drop',
  ].some((blocked) => command.startsWith(blocked));
}

export function formatEnvTarget(envFilePath) {
  return path.relative(getRepoRoot(), envFilePath).replace(/\\/gu, '/');
}