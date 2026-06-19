-- Super Admin role, corporation logo_url, and signup trigger update
--
-- Role model:
--   super_admin — platform operator; can create corporations and see Corporations menu
--   admin       — corporation admin (default on signup after first user)
--   official, stakeholder, viewer — scoped roles within a corporation
--
-- First user signup: handle_new_user assigns super_admin when user_master is empty.
-- To promote an existing user: UPDATE user_master SET role = 'super_admin' WHERE id = '...';

-- ============================================================
-- user_role: add super_admin
-- ============================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum e
    JOIN pg_type t ON e.enumtypid = t.oid
    WHERE t.typname = 'user_role' AND e.enumlabel = 'super_admin'
  ) THEN
    ALTER TYPE user_role ADD VALUE 'super_admin';
  END IF;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================
-- corporations.logo_url
-- ============================================================

ALTER TABLE corporations ADD COLUMN IF NOT EXISTS logo_url TEXT;

COMMENT ON COLUMN corporations.logo_url IS
  'Public URL for corporation logo in storage (corporations/{id}/logo.{ext})';

-- ============================================================
-- Signup trigger: first user is super_admin
-- ============================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  assigned_role user_role := 'admin';
  role_text TEXT;
  existing_users BIGINT;
BEGIN
  SELECT COUNT(*) INTO existing_users FROM public.user_master;

  IF existing_users = 0 THEN
    assigned_role := 'super_admin';
  ELSE
    role_text := lower(trim(COALESCE(NEW.raw_user_meta_data->>'role', '')));
    IF role_text IN ('super_admin', 'admin', 'official', 'stakeholder', 'viewer') THEN
      assigned_role := role_text::user_role;
    END IF;
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
