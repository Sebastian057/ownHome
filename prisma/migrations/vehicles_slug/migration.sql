-- Migration: vehicles_slug
-- Add human-readable slug field to vehicles, generated from name

ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS slug VARCHAR(120);

-- Backfill: generate slug from name
-- lowercase, replace non-alphanumeric sequences with '-', trim leading/trailing '-'
UPDATE vehicles
SET slug = trim(both '-' from regexp_replace(lower(trim(name)), '[^a-z0-9]+', '-', 'g'))
WHERE slug IS NULL OR slug = '';

-- Handle any empty slugs (e.g. if name was all special chars) → use 'pojazd'
UPDATE vehicles SET slug = 'pojazd' WHERE slug = '' OR slug IS NULL;

-- Deduplicate: if two vehicles for the same user have the same slug,
-- append -2, -3, ... to all but the first (ordered by createdAt)
DO $$
DECLARE
  rec RECORD;
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
      OFFSET 1  -- skip the first (keep original slug)
    LOOP
      UPDATE vehicles SET slug = rec.slug || '-' || counter WHERE id = rec2.id;
      counter := counter + 1;
    END LOOP;
  END LOOP;
END $$;

-- Now enforce NOT NULL and unique index
ALTER TABLE vehicles ALTER COLUMN slug SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS vehicles_user_id_slug_key ON vehicles(user_id, slug);
