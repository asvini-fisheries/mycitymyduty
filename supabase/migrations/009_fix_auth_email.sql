-- Fix email/password signup: user_role enum, handle_new_user trigger, user_master RLS
--
-- Supabase Dashboard (dev): Authentication → Providers → Email → disable
-- "Confirm email" for immediate login after signup, OR keep it enabled and
-- have users confirm via email before signing in (login page handles that case).

-- Ensure user_role enum exists with all MyCityMyDuty roles (standalone project)
DO $$ BEGIN
  CREATE TYPE user_role AS ENUM ('admin', 'official', 'stakeholder', 'viewer');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum e
    JOIN pg_type t ON e.enumtypid = t.oid
    WHERE t.typname = 'user_role' AND e.enumlabel = 'admin'
  ) THEN
    ALTER TYPE user_role ADD VALUE 'admin';
  END IF;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum e
    JOIN pg_type t ON e.enumtypid = t.oid
    WHERE t.typname = 'user_role' AND e.enumlabel = 'official'
  ) THEN
    ALTER TYPE user_role ADD VALUE 'official';
  END IF;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum e
    JOIN pg_type t ON e.enumtypid = t.oid
    WHERE t.typname = 'user_role' AND e.enumlabel = 'stakeholder'
  ) THEN
    ALTER TYPE user_role ADD VALUE 'stakeholder';
  END IF;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum e
    JOIN pg_type t ON e.enumtypid = t.oid
    WHERE t.typname = 'user_role' AND e.enumlabel = 'viewer'
  ) THEN
    ALTER TYPE user_role ADD VALUE 'viewer';
  END IF;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Signup trigger: create user_master from auth.users (role from signup metadata)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  assigned_role user_role := 'admin';
  role_text TEXT;
BEGIN
  role_text := lower(trim(COALESCE(NEW.raw_user_meta_data->>'role', '')));
  IF role_text IN ('admin', 'official', 'stakeholder', 'viewer') THEN
    assigned_role := role_text::user_role;
  END IF;

  INSERT INTO public.user_master (id, email, full_name, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.email, ''),
    COALESCE(
      NULLIF(trim(NEW.raw_user_meta_data->>'full_name'), ''),
      split_part(COALESCE(NEW.email, 'user'), '@', 1)
    ),
    assigned_role
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = EXCLUDED.full_name,
    role = EXCLUDED.role;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- user_master RLS: own profile + admin user management; trigger insert via SECURITY DEFINER
ALTER TABLE public.user_master ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS user_master_auth_all ON public.user_master;
DROP POLICY IF EXISTS user_master_select_own ON public.user_master;
DROP POLICY IF EXISTS user_master_update_own ON public.user_master;
DROP POLICY IF EXISTS user_master_admin_all ON public.user_master;

CREATE POLICY user_master_select_own ON public.user_master
  FOR SELECT TO authenticated
  USING (id = auth.uid());

CREATE POLICY user_master_update_own ON public.user_master
  FOR UPDATE TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

CREATE POLICY user_master_admin_all ON public.user_master
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_master um
      WHERE um.id = auth.uid() AND um.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_master um
      WHERE um.id = auth.uid() AND um.role = 'admin'
    )
  );

-- Table grants for authenticated auth flow (insert handled by trigger as definer)
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT SELECT, UPDATE ON public.user_master TO authenticated;
GRANT ALL ON public.user_master TO service_role;
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO service_role;
