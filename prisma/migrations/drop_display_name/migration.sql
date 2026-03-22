-- ============================================================
-- Migracja: usuń display_name z user_profiles
-- full_name i email są przechowywane w Supabase Auth (auth.users)
-- user_profiles jest rozszerzeniem auth.users: role, język, motyw, telefon, avatar
-- ============================================================

-- 1. Zaktualizuj trigger PRZED usunięciem kolumny
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_profiles (
    id,
    user_id,
    role,
    language,
    theme,
    created_at,
    updated_at
  ) VALUES (
    gen_random_uuid()::text,
    NEW.id::text,
    'user',
    'pl',
    'light',
    NOW(),
    NOW()
  )
  ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Usuń kolumnę display_name
ALTER TABLE public.user_profiles DROP COLUMN IF EXISTS display_name;
