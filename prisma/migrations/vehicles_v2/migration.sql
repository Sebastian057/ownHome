-- Insurance: migrate type → types array
ALTER TABLE vehicle_insurances ADD COLUMN IF NOT EXISTS types text[] DEFAULT '{}';
UPDATE vehicle_insurances SET types = ARRAY[type::text] WHERE type IS NOT NULL AND array_length(types, 1) IS NULL;
ALTER TABLE vehicle_insurances DROP COLUMN IF EXISTS type;

-- New table: vehicle_service_visit_files
CREATE TABLE IF NOT EXISTS vehicle_service_visit_files (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  visit_id TEXT NOT NULL REFERENCES vehicle_service_visits(id),
  vehicle_id TEXT NOT NULL REFERENCES vehicles(id),
  user_id TEXT NOT NULL,
  file_name VARCHAR(500) NOT NULL,
  file_url VARCHAR(1000) NOT NULL,
  file_type VARCHAR(20) NOT NULL,
  mime_type VARCHAR(100) NOT NULL,
  size_bytes INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_vsf_visit ON vehicle_service_visit_files(visit_id);
CREATE INDEX IF NOT EXISTS idx_vsf_user ON vehicle_service_visit_files(user_id);

ALTER TABLE vehicle_service_visit_files ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users_own_vehicle_service_visit_files" ON vehicle_service_visit_files
  FOR ALL USING (auth.uid()::text = user_id);

-- New table: vehicle_maintenance_logs
CREATE TABLE IF NOT EXISTS vehicle_maintenance_logs (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id TEXT NOT NULL REFERENCES vehicles(id),
  user_id TEXT NOT NULL,
  category VARCHAR(100) NOT NULL,
  label VARCHAR(200),
  date DATE NOT NULL,
  mileage INTEGER,
  cost DECIMAL(10,2),
  currency CHAR(3) DEFAULT 'PLN',
  notes VARCHAR(2000),
  deleted_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_vml_vehicle ON vehicle_maintenance_logs(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_vml_user ON vehicle_maintenance_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_vml_user_deleted ON vehicle_maintenance_logs(user_id, deleted_at);

ALTER TABLE vehicle_maintenance_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users_own_vehicle_maintenance_logs" ON vehicle_maintenance_logs
  FOR ALL USING (auth.uid()::text = user_id);
