-- Backfill user_master for auth.users missing a profile row (failed signup / trigger gaps).
-- Adds set_my_corporation() so sign-in can link corporation_id without RLS recursion.

INSERT INTO public.user_master (id, email, full_name, role)
SELECT
  u.id,
  COALESCE(u.email, ''),
  COALESCE(
    NULLIF(trim(u.raw_user_meta_data->>'full_name'), ''),
    split_part(COALESCE(u.email, 'user'), '@', 1)
  ),
  CASE
    WHEN lower(trim(COALESCE(u.raw_user_meta_data->>'role', ''))) IN (
      'admin', 'official', 'stakeholder', 'viewer'
    )
    THEN lower(trim(u.raw_user_meta_data->>'role'))::user_role
    ELSE 'admin'::user_role
  END
FROM auth.users u
WHERE NOT EXISTS (
  SELECT 1 FROM public.user_master um WHERE um.id = u.id
);

CREATE OR REPLACE FUNCTION public.set_my_corporation(p_corporation_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid UUID := auth.uid();
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF p_corporation_id IS NULL THEN
    RAISE EXCEPTION 'Corporation id is required';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.corporations c
    WHERE c.id = p_corporation_id AND c.is_active = true
  ) THEN
    RAISE EXCEPTION 'Invalid or inactive corporation';
  END IF;

  INSERT INTO public.user_master (id, email, full_name, role)
  SELECT
    u.id,
    COALESCE(u.email, ''),
    COALESCE(
      NULLIF(trim(u.raw_user_meta_data->>'full_name'), ''),
      split_part(COALESCE(u.email, 'user'), '@', 1)
    ),
    CASE
      WHEN lower(trim(COALESCE(u.raw_user_meta_data->>'role', ''))) IN (
        'admin', 'official', 'stakeholder', 'viewer'
      )
      THEN lower(trim(u.raw_user_meta_data->>'role'))::user_role
      ELSE 'admin'::user_role
    END
  FROM auth.users u
  WHERE u.id = v_uid
  ON CONFLICT (id) DO NOTHING;

  UPDATE public.user_master
  SET corporation_id = p_corporation_id
  WHERE id = v_uid;
END;
$$;

REVOKE ALL ON FUNCTION public.set_my_corporation(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.set_my_corporation(UUID) TO authenticated;
