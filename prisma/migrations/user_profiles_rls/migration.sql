ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Użytkownicy mają dostęp tylko do swoich profili
CREATE POLICY "users_own_profile" ON user_profiles
  FOR ALL USING (auth.uid()::text = user_id);

-- Admin może czytać wszystkie profile
CREATE POLICY "admin_read_all_profiles" ON user_profiles
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_id = auth.uid()::text AND role = 'admin'
    )
  );
