# Migration History Repair Plan

This repository can deploy incremental migrations to the existing production database, but it cannot rebuild a fresh database from `prisma/migrations` alone.

## Why this exists

- The current migration chain mixes historical data-fix SQL, RLS changes, and schema changes that are already reflected in `prisma/schema.prisma`.
- Fresh local replay fails on obsolete or already-applied steps such as `auth_user_trigger` and `shared_data_model`.
- Local development now uses `prisma db push` plus a curated SQL replay as a safe interim workflow.

## Target outcome

Restore a true fresh-database baseline so that a clean environment can eventually run Prisma migration replay safely again.

## Recommended approach

1. Freeze the current schema state as the baseline candidate.
2. Generate a new baseline migration from the current datamodel instead of replaying all historical directories.
3. Append only SQL objects that Prisma does not model but the app still requires.
4. Mark the baseline as applied on existing environments instead of re-running destructive historical SQL there.
5. Keep all future migrations additive and fresh-db safe.

## Detailed procedure

1. Create a dedicated branch for migration repair.
2. Verify the current production schema and `prisma/schema.prisma` are in sync enough to serve as the canonical baseline.
3. Generate baseline SQL from empty to current schema:

```bash
npx prisma migrate diff \
  --from-empty \
  --to-schema-datamodel prisma/schema.prisma \
  --script > prisma/migrations/<timestamp>_baseline_current_schema/migration.sql
```

4. Review the generated SQL and append only current, required SQL-only objects:
   - `public.handle_new_user()` in its current form
   - the auth trigger that populates `user_profiles`
   - active RLS policies aligned with the current per-user architecture
   - any additive SQL objects not represented in Prisma and still used by the app
5. Do not carry forward obsolete or contradictory history into the new baseline:
   - `auth_user_trigger` in the old `display_name` shape
   - `shared_data_model`
   - one-off backfill/dedup migrations whose results are already reflected in the live schema
6. Move superseded historical directories out of the active Prisma chain after the new baseline is ready. Keep them archived for reference only.
7. On existing databases, mark the new baseline as already applied instead of executing it again:

```bash
npx prisma migrate resolve --applied <timestamp>_baseline_current_schema
```

8. Validate the repaired chain in three places:
   - fresh local Supabase database with `migrate deploy`
   - a staging clone of production
   - production status check before any final rollout

## Validation checklist

- A fresh local database can run `prisma migrate deploy` without `db push` fallback.
- RLS and auth-trigger behavior still work after the baseline change.
- `budget_categories` are handled explicitly, either by seed or a deliberate migration decision.
- Production receives only a `migrate resolve` step for the new baseline, not a destructive schema replay.

## Current interim rule

Until this repair is completed, local development should continue using:

- `npm run db:local:sync`
- `npm run db:local:reset`

and should not rely on local `prisma migrate dev` or local `prisma migrate deploy`.