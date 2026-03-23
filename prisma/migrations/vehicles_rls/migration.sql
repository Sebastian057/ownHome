-- RLS policies for vehicles module tables

ALTER TABLE vehicles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users_own_vehicles" ON vehicles
  FOR ALL USING (auth.uid()::text = user_id);

ALTER TABLE vehicle_insurances ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users_own_vehicle_insurances" ON vehicle_insurances
  FOR ALL USING (auth.uid()::text = user_id);

ALTER TABLE vehicle_inspections ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users_own_vehicle_inspections" ON vehicle_inspections
  FOR ALL USING (auth.uid()::text = user_id);

ALTER TABLE vehicle_service_visits ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users_own_vehicle_service_visits" ON vehicle_service_visits
  FOR ALL USING (auth.uid()::text = user_id);

ALTER TABLE vehicle_maintenance_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users_own_vehicle_maintenance_items" ON vehicle_maintenance_items
  FOR ALL USING (auth.uid()::text = user_id);

-- Supabase Storage bucket policies (run in Supabase Dashboard SQL editor)
-- CREATE POLICY "public_read_vehicle_photos"
--   ON storage.objects FOR SELECT
--   USING (bucket_id = 'vehicle-photos');
--
-- CREATE POLICY "owner_upload_vehicle_photos"
--   ON storage.objects FOR INSERT
--   WITH CHECK (
--     bucket_id = 'vehicle-photos' AND
--     auth.uid()::text = (storage.foldername(name))[1]
--   );
