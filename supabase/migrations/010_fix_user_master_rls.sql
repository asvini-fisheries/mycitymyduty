-- Fix user_master RLS infinite recursion (admin policy must not query user_master under RLS).

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_master
    WHERE id = auth.uid()
      AND role = 'admin'
  );
$$;

REVOKE ALL ON FUNCTION public.is_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;

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
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

GRANT SELECT, UPDATE ON public.user_master TO authenticated;
