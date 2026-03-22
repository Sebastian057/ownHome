-- ============================================================
-- Trigger: auto-create user_profiles on new Supabase Auth user
-- ============================================================
-- Fires AFTER INSERT on auth.users (created by Supabase Auth).
-- Uses SECURITY DEFINER so it bypasses RLS and can write
-- to user_profiles regardless of the calling role.
-- ============================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_profiles (
    id,
    user_id,
    display_name,
    role,
    language,
    theme,
    created_at,
    updated_at
  ) VALUES (
    gen_random_uuid()::text,
    NEW.id::text,
    COALESCE(
      NULLIF(TRIM(NEW.raw_user_meta_data->>'display_name'), ''),
      NULLIF(TRIM(NEW.raw_user_meta_data->>'full_name'), ''),
      NULLIF(TRIM(NEW.raw_user_meta_data->>'name'), ''),
      split_part(NEW.email, '@', 1)
    ),
    'user',
    'pl',
    'light',
    NOW(),
    NOW()
  )
  ON CONFLICT (user_id) DO NOTHING;  -- idempotent: nie nadpisuj jeśli już istnieje

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- Usuń stary trigger jeśli istnieje (idempotent)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Utwórz trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();


-- ============================================================
-- Backfill: utwórz profile dla użytkowników którzy już istnieją
-- w auth.users ale nie mają jeszcze rekordu w user_profiles
-- ============================================================
INSERT INTO public.user_profiles (
  id,
  user_id,
  display_name,
  role,
  language,
  theme,
  created_at,
  updated_at
)
SELECT
  gen_random_uuid()::text,
  u.id::text,
  COALESCE(
    NULLIF(TRIM(u.raw_user_meta_data->>'display_name'), ''),
    NULLIF(TRIM(u.raw_user_meta_data->>'full_name'), ''),
    NULLIF(TRIM(u.raw_user_meta_data->>'name'), ''),
    split_part(u.email, '@', 1)
  ),
  'user',
  'pl',
  'light',
  u.created_at,
  NOW()
FROM auth.users u
WHERE NOT EXISTS (
  SELECT 1 FROM public.user_profiles p
  WHERE p.user_id = u.id::text
);
