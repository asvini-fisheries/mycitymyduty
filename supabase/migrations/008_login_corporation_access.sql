-- Login page: allow anon users to list active corporations for the picker
DROP POLICY IF EXISTS corporations_anon_read_active ON corporations;
CREATE POLICY corporations_anon_read_active ON corporations
  FOR SELECT TO anon
  USING (is_active = true);

-- First admin signup: create the initial corporation when the table is empty
CREATE OR REPLACE FUNCTION bootstrap_first_corporation(p_name TEXT, p_code TEXT)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id UUID;
  v_count INT;
BEGIN
  IF p_name IS NULL OR trim(p_name) = '' THEN
    RAISE EXCEPTION 'Corporation name is required';
  END IF;

  SELECT count(*)::int INTO v_count FROM corporations;
  IF v_count > 0 THEN
    RAISE EXCEPTION 'A corporation already exists';
  END IF;

  INSERT INTO corporations (name, code, is_active)
  VALUES (trim(p_name), nullif(trim(p_code), ''), true)
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

REVOKE ALL ON FUNCTION bootstrap_first_corporation(TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION bootstrap_first_corporation(TEXT, TEXT) TO anon, authenticated;
