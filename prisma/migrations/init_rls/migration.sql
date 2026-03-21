-- Enable RLS on scheduled_events
ALTER TABLE scheduled_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_own_scheduled_events" ON scheduled_events
  FOR ALL USING (auth.uid()::text = "userId");
