-- Migration: add_meters_module
-- Safe: additive only, IF NOT EXISTS on all statements

-- 1. Enum MeterType
DO $$ BEGIN
  CREATE TYPE "MeterType" AS ENUM ('WATER', 'ELECTRICITY', 'GAS');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 2. Tabela meter_readings
CREATE TABLE IF NOT EXISTS meter_readings (
  id           TEXT          NOT NULL DEFAULT gen_random_uuid()::text,
  user_id      TEXT          NOT NULL,
  type         "MeterType"   NOT NULL,
  value        DECIMAL(10,3) NOT NULL,
  reading_date DATE          NOT NULL,
  notes        VARCHAR(500),
  created_at   TIMESTAMPTZ   NOT NULL DEFAULT now(),
  deleted_at   TIMESTAMPTZ,

  CONSTRAINT meter_readings_pkey PRIMARY KEY (id)
);

-- 3. Indeksy
CREATE INDEX IF NOT EXISTS meter_readings_user_id_idx
  ON meter_readings (user_id);

CREATE INDEX IF NOT EXISTS meter_readings_user_id_type_idx
  ON meter_readings (user_id, type);

CREATE INDEX IF NOT EXISTS meter_readings_user_id_type_reading_date_idx
  ON meter_readings (user_id, type, reading_date);

-- 4. RLS
ALTER TABLE meter_readings ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "users_own_meter_readings" ON meter_readings
    FOR ALL USING (auth.uid()::text = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
