-- Migration: vehicles_v3
-- Add station_name to vehicle_inspections

ALTER TABLE vehicle_inspections ADD COLUMN IF NOT EXISTS station_name VARCHAR(300);
