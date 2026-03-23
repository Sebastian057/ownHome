-- Migration: vehicles_v4
-- Backfill NULL slugs for existing vehicles and enforce NOT NULL constraint

-- Step 1: generate slug from name for any vehicles without one
UPDATE vehicles
SET slug = trim(both '-' from regexp_replace(lower(trim(name)), '[^a-z0-9]+', '-', 'g'))
WHERE slug IS NULL OR slug = '';

-- Step 2: fallback for vehicles whose name produced an empty slug
UPDATE vehicles
SET slug = 'pojazd'
WHERE slug IS NULL OR slug = '';

-- Step 3: deduplicate slugs per user (append -2, -3, ... keeping the earliest)
DO $$
DECLARE
  rec  RECORD;
  rec2 RECORD;
  counter INT;
BEGIN
  FOR rec IN
    SELECT user_id, slug
    FROM vehicles
    WHERE deleted_at IS NULL
    GROUP BY user_id, slug
    HAVING COUNT(*) > 1
  LOOP
    counter := 2;
    FOR rec2 IN
      SELECT id FROM vehicles
      WHERE user_id = rec.user_id AND slug = rec.slug
      ORDER BY created_at ASC
      OFFSET 1
    LOOP
      UPDATE vehicles SET slug = rec.slug || '-' || counter WHERE id = rec2.id;
      counter := counter + 1;
    END LOOP;
  END LOOP;
END $$;

-- Step 4: enforce NOT NULL (safe now — every row has a slug)
ALTER TABLE vehicles ALTER COLUMN slug SET NOT NULL;

-- Step 5: ensure unique index exists
CREATE UNIQUE INDEX IF NOT EXISTS vehicles_user_id_slug_key ON vehicles(user_id, slug);
