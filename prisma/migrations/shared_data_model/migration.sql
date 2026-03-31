-- Migration: shared_data_model
-- Purpose: Switch from per-user data isolation to shared household model.
-- All authenticated users see all data. userId remains on records as "created by".
--
-- Changes:
--   1. Deduplicate budget_periods (year, month) conflicts — keep the one with most data
--   2. Deduplicate vehicles slug conflicts — rename duplicates
--   3. Drop old unique constraints that included userId
--   4. Create new constraints without userId
--   5. Drop old per-user RLS policies and replace with any-authenticated-user policies

-- ─── 1. Deduplicate budget_periods by (year, month) ──────────────────────────
-- If two users created a period for the same year/month,
-- keep the one with the most transactions, reassign all children to it, delete duplicates.

DO $$
DECLARE
  conflict RECORD;
  keep_id TEXT;
  dup_id TEXT;
BEGIN
  FOR conflict IN
    SELECT year, month
    FROM budget_periods
    GROUP BY year, month
    HAVING COUNT(*) > 1
  LOOP
    -- Pick the period with the most transactions (or most recently created)
    SELECT id INTO keep_id
    FROM budget_periods
    WHERE year = conflict.year AND month = conflict.month
    ORDER BY (
      SELECT COUNT(*) FROM transactions WHERE "periodId" = budget_periods.id AND "deletedAt" IS NULL
    ) DESC, "createdAt" DESC
    LIMIT 1;

    -- For each duplicate, reassign children then delete
    FOR dup_id IN
      SELECT id FROM budget_periods
      WHERE year = conflict.year AND month = conflict.month AND id != keep_id
    LOOP
      -- Move transactions (skip if sourceId already exists in keep to avoid dups)
      UPDATE transactions
      SET "periodId" = keep_id
      WHERE "periodId" = dup_id
        AND "sourceId" NOT IN (
          SELECT COALESCE("sourceId", '') FROM transactions WHERE "periodId" = keep_id AND "sourceId" IS NOT NULL
        );

      -- Move budget_incomes
      UPDATE budget_incomes SET "periodId" = keep_id WHERE "periodId" = dup_id;

      -- Move budget_category_plans (skip if category already exists in keep)
      UPDATE budget_category_plans
      SET "periodId" = keep_id
      WHERE "periodId" = dup_id
        AND category NOT IN (
          SELECT category FROM budget_category_plans WHERE "periodId" = keep_id
        );

      -- Move recurring_payments
      UPDATE recurring_payments SET "periodId" = keep_id WHERE "periodId" = dup_id;

      -- Delete remaining children (duplicates of what keep already has)
      DELETE FROM transactions WHERE "periodId" = dup_id;
      DELETE FROM budget_incomes WHERE "periodId" = dup_id;
      DELETE FROM budget_category_plans WHERE "periodId" = dup_id;

      -- Delete the duplicate period
      DELETE FROM budget_periods WHERE id = dup_id;
    END LOOP;
  END LOOP;
END $$;

-- ─── 2. Deduplicate vehicle slugs globally (across users) ────────────────────

DO $$
DECLARE
  rec RECORD;
  rec2 RECORD;
  counter INT;
BEGIN
  FOR rec IN
    SELECT slug
    FROM vehicles
    WHERE deleted_at IS NULL
    GROUP BY slug
    HAVING COUNT(*) > 1
  LOOP
    counter := 2;
    FOR rec2 IN
      SELECT id FROM vehicles
      WHERE slug = rec.slug AND deleted_at IS NULL
      ORDER BY created_at ASC
      OFFSET 1  -- keep the first, rename the rest
    LOOP
      UPDATE vehicles SET slug = rec.slug || '-' || counter WHERE id = rec2.id;
      counter := counter + 1;
    END LOOP;
  END LOOP;
END $$;

-- ─── 3. Drop old unique constraints ──────────────────────────────────────────

-- budget_periods: (userId, year, month)
ALTER TABLE budget_periods DROP CONSTRAINT IF EXISTS "budget_periods_userId_year_month_key";

-- budget_templates: userId unique
ALTER TABLE budget_templates DROP CONSTRAINT IF EXISTS "budget_templates_userId_key";

-- vehicles: (user_id, slug)
DROP INDEX IF EXISTS vehicles_user_id_slug_key;

-- ─── 4. Create new unique constraints without userId ─────────────────────────

-- budget_periods: one period per (year, month) globally
ALTER TABLE budget_periods ADD CONSTRAINT "budget_periods_year_month_key" UNIQUE (year, month);

-- vehicles: slug unique globally
CREATE UNIQUE INDEX vehicles_slug_key ON vehicles(slug) WHERE deleted_at IS NULL;

-- budget_templates: no unique constraint (multiple can exist; app uses first)

-- ─── 5. Update RLS — allow any authenticated user ────────────────────────────

-- budget_templates
DROP POLICY IF EXISTS "users_own_budget_templates" ON budget_templates;
CREATE POLICY "authenticated_access_budget_templates" ON budget_templates
  FOR ALL USING (auth.role() = 'authenticated');

-- budget_template_incomes
DROP POLICY IF EXISTS "users_own_budget_template_incomes" ON budget_template_incomes;
CREATE POLICY "authenticated_access_budget_template_incomes" ON budget_template_incomes
  FOR ALL USING (auth.role() = 'authenticated');

-- budget_template_expenses
DROP POLICY IF EXISTS "users_own_budget_template_expenses" ON budget_template_expenses;
CREATE POLICY "authenticated_access_budget_template_expenses" ON budget_template_expenses
  FOR ALL USING (auth.role() = 'authenticated');

-- budget_periods
DROP POLICY IF EXISTS "users_own_budget_periods" ON budget_periods;
CREATE POLICY "authenticated_access_budget_periods" ON budget_periods
  FOR ALL USING (auth.role() = 'authenticated');

-- budget_incomes
DROP POLICY IF EXISTS "users_own_budget_incomes" ON budget_incomes;
CREATE POLICY "authenticated_access_budget_incomes" ON budget_incomes
  FOR ALL USING (auth.role() = 'authenticated');

-- budget_category_plans
DROP POLICY IF EXISTS "users_own_budget_category_plans" ON budget_category_plans;
CREATE POLICY "authenticated_access_budget_category_plans" ON budget_category_plans
  FOR ALL USING (auth.role() = 'authenticated');

-- transactions
DROP POLICY IF EXISTS "users_own_transactions" ON transactions;
CREATE POLICY "authenticated_access_transactions" ON transactions
  FOR ALL USING (auth.role() = 'authenticated');

-- subscriptions
DROP POLICY IF EXISTS "users_own_subscriptions" ON subscriptions;
CREATE POLICY "authenticated_access_subscriptions" ON subscriptions
  FOR ALL USING (auth.role() = 'authenticated');

-- recurring_templates
DROP POLICY IF EXISTS "users_own_recurring_templates" ON recurring_templates;
CREATE POLICY "authenticated_access_recurring_templates" ON recurring_templates
  FOR ALL USING (auth.role() = 'authenticated');

-- recurring_payments
DROP POLICY IF EXISTS "users_own_recurring_payments" ON recurring_payments;
CREATE POLICY "authenticated_access_recurring_payments" ON recurring_payments
  FOR ALL USING (auth.role() = 'authenticated');

-- vehicles
DROP POLICY IF EXISTS "users_own_vehicles" ON vehicles;
CREATE POLICY "authenticated_access_vehicles" ON vehicles
  FOR ALL USING (auth.role() = 'authenticated');

-- vehicle_insurances
DROP POLICY IF EXISTS "users_own_vehicle_insurances" ON vehicle_insurances;
CREATE POLICY "authenticated_access_vehicle_insurances" ON vehicle_insurances
  FOR ALL USING (auth.role() = 'authenticated');

-- vehicle_inspections
DROP POLICY IF EXISTS "users_own_vehicle_inspections" ON vehicle_inspections;
CREATE POLICY "authenticated_access_vehicle_inspections" ON vehicle_inspections
  FOR ALL USING (auth.role() = 'authenticated');

-- vehicle_service_visits
DROP POLICY IF EXISTS "users_own_vehicle_service_visits" ON vehicle_service_visits;
CREATE POLICY "authenticated_access_vehicle_service_visits" ON vehicle_service_visits
  FOR ALL USING (auth.role() = 'authenticated');

-- vehicle_maintenance_items
DROP POLICY IF EXISTS "users_own_vehicle_maintenance_items" ON vehicle_maintenance_items;
CREATE POLICY "authenticated_access_vehicle_maintenance_items" ON vehicle_maintenance_items
  FOR ALL USING (auth.role() = 'authenticated');

-- vehicle_service_visit_files
ALTER TABLE vehicle_service_visit_files ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "users_own_vehicle_service_visit_files" ON vehicle_service_visit_files;
CREATE POLICY "authenticated_access_vehicle_service_visit_files" ON vehicle_service_visit_files
  FOR ALL USING (auth.role() = 'authenticated');

-- vehicle_maintenance_logs
ALTER TABLE vehicle_maintenance_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "users_own_vehicle_maintenance_logs" ON vehicle_maintenance_logs;
CREATE POLICY "authenticated_access_vehicle_maintenance_logs" ON vehicle_maintenance_logs
  FOR ALL USING (auth.role() = 'authenticated');

-- scheduled_events
DROP POLICY IF EXISTS "users_own_scheduled_events" ON scheduled_events;
CREATE POLICY "authenticated_access_scheduled_events" ON scheduled_events
  FOR ALL USING (auth.role() = 'authenticated');
