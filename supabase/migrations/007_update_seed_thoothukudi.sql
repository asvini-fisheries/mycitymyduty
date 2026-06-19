-- One-off update: replace Chennai Municipal Corporation seed with Thoothukudi Corporation
-- Safe for dev/demo DBs that already ran 003_seed_data.sql with CMC-001

DO $$
DECLARE
  v_corp_id UUID;
BEGIN
  SELECT id INTO v_corp_id
  FROM corporations
  WHERE code = 'CMC-001' OR name ILIKE '%Chennai%'
  LIMIT 1;

  IF v_corp_id IS NULL THEN
    RETURN;
  END IF;

  UPDATE corporations
  SET
    code = 'TCC-001',
    name = 'Thoothukudi Corporation',
    address = 'Municipal Corporation Office, Beach Road, Thoothukudi 628001',
    contact_person = 'Municipal Commissioner',
    phone = '0461-232-0100',
    email = 'info@thoothukudicorp.gov.in'
  WHERE id = v_corp_id;

  UPDATE zone_wards zw
  SET
    ward_number = '001',
    name = 'Ward 001 - Palayamkottai'
  FROM zones z
  WHERE zw.zone_id = z.id
    AND z.corporation_id = v_corp_id
    AND (zw.ward_number = '101' OR zw.name ILIKE '%Anna Nagar%');

  UPDATE ward_areas wa
  SET
    code = 'A-01',
    name = 'Millerpuram'
  FROM zone_wards zw
  JOIN zones z ON z.id = zw.zone_id
  WHERE wa.ward_id = zw.id
    AND z.corporation_id = v_corp_id
    AND (wa.name ILIKE '%Anna Nagar%' OR wa.code = 'A-01');

  UPDATE area_streets ast
  SET
    name = 'Beach Road',
    street_type = 'Main'
  FROM ward_areas wa
  JOIN zone_wards zw ON zw.id = wa.ward_id
  JOIN zones z ON z.id = zw.zone_id
  WHERE ast.area_id = wa.id
    AND z.corporation_id = v_corp_id
    AND ast.name = '2nd Avenue';

  UPDATE daily_activity_updates dau
  SET work_description = 'Completed sweeping on Beach Road — 2 km covered'
  FROM project_activities pa
  JOIN projects p ON p.id = pa.project_id
  WHERE dau.project_activity_id = pa.id
    AND p.corporation_id = v_corp_id
    AND dau.work_description ILIKE '%2nd Avenue%';
END $$;
