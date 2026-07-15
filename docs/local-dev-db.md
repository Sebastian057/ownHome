# Local DEV Database

This repository uses a full local Supabase stack for development, but keeps `prisma/migrations` as the only source of truth for schema changes.

## Files

- `.env.local` — application runtime for local development
- `.env.prisma.local` — guarded Prisma commands against local DB only
- `.env.prisma.prod` — guarded Prisma commands against production only

Use the committed example files as templates:

- `.env.local.example`
- `.env.prisma.local.example`
- `.env.prisma.prod.example`

## Local bootstrap

1. Install dependencies.
2. Copy `.env.local.example` to `.env.local`.
3. Copy `.env.prisma.local.example` to `.env.prisma.local`.
4. If your current `.env.local` still points at remote Supabase or production credentials, replace it before running the app locally.
5. Start Supabase: `npm run db:local:start`
6. Print local URLs and keys: `npm run db:local:status`
7. Replace the placeholder keys in `.env.local` with the values reported by `db:local:status`.
8. Reset and hydrate local schema: `npm run db:local:reset`

## Daily local commands

- `npm run db:local:start` — start local Supabase
- `npm run db:local:stop` — stop local Supabase
- `npm run db:local:status` — print local service URLs and keys
- `npm run db:local:doctor` — validate that runtime and local Prisma envs point only to localhost
- `npm run db:local:sync` — sync current `schema.prisma`, then replay local SQL setup and seed
- `npm run db:local:deploy` — intentionally blocked until migration history gets a fresh-db baseline
- `npm run db:local:reset` — destructive local reset via `db push --force-reset`, local SQL policy replay, and budget category seed
- `npm run db:local:seed` — seed default budget categories without resetting
- `npm run db:local:use-demo-data` — import demo dataset from production to local (without auth/users), remapped to a local user
- `npm run db:local:studio` — Prisma Studio on local DB

## Production-based demo data (without users)

Use this when you want realistic local test data from production while keeping local auth/users separate.

1. Ensure local DB is ready and has at least one local user:

```bash
npm run db:local:start
npm run db:local:reset
```

2. Create `.env.prisma.prod` from `.env.prisma.prod.example` with production DB URLs.
3. Run import:

```bash
npm run db:local:use-demo-data
```

Behavior:

- Reads production data in read-only mode.
- Does not copy `auth.users` or `public.user_profiles`.
- Picks one source production user (or uses `DEMO_SOURCE_USER_ID` if provided).
- Maps all imported rows to one local user (`DEMO_TARGET_USER_ID` or latest local profile).
- Replaces local module data tables before import.

Optional environment overrides for a single run:

```bash
DEMO_SOURCE_USER_ID=<prod-user-id> DEMO_TARGET_USER_ID=<local-user-id> npm run db:local:use-demo-data
```

## Production workflow

1. Create and test migrations locally.
2. Run `npm run db:local:reset` on a clean local database.
3. Copy `.env.prisma.prod.example` to `.env.prisma.prod` and fill real production values.
4. Verify status: `npm run db:prod:status`
5. Take a production backup.
6. Run the deploy deliberately:

```bash
PROD_CONFIRM=ownhome-production npm run db:prod:migrate
```

## Guardrails

- Production runner blocks `prisma migrate dev`, `prisma migrate reset`, `prisma db push`, `prisma db pull`, `prisma db execute`, `prisma db drop`, and `prisma db seed`.
- Production runner requires host matching from `.env.prisma.prod`.
- Production `migrate deploy` requires `PROD_CONFIRM=ownhome-production`.
- Local runner refuses to operate if `DATABASE_URL` or `DIRECT_URL` are not local.

## Current limitation

- Historical Prisma migrations in this repository are not a complete fresh-database baseline.
- Because of that, both `prisma migrate dev` and `prisma migrate deploy` are blocked by design in the local workflow.
- Local bootstrap uses `schema.prisma` plus replay of a curated set of repository SQL files for RLS and SQL-only setup that Prisma does not model.
- Production still uses the existing migration history via `prisma migrate deploy`, but repairing or squashing migration history should be treated as a separate follow-up task.
- The current repair plan lives in `docs/migration-history-repair.md`.

## Important

- Do not use `.env` or `.env.local` with remote database URLs for Prisma commands.
- Do not use `supabase db reset` in this repository.
- `budget_categories` are seeded separately because they are required by the app but are not currently created by SQL migrations.