-- Sample seed data for MyCityMyDuty demo

INSERT INTO corporations (code, name, address, contact_person, phone, email)
VALUES (
  'TCC-001',
  'Thoothukudi Corporation',
  'Municipal Corporation Office, Beach Road, Thoothukudi 628001',
  'Municipal Commissioner',
  '0461-232-0100',
  'info@thoothukudicorp.gov.in'
)
ON CONFLICT (code) DO NOTHING;

INSERT INTO service_categories (name, description)
VALUES
  ('Sanitation', 'Waste collection and street cleaning'),
  ('Roads', 'Road repair and maintenance'),
  ('Parks', 'Park maintenance and beautification'),
  ('Water Supply', 'Water pipeline and tank maintenance')
ON CONFLICT (name) DO NOTHING;

INSERT INTO stakeholder_categories (name, description)
VALUES
  ('NGO', 'Non-government organizations'),
  ('Contractor', 'Service contractors'),
  ('Resident Welfare Association', 'Local RWA groups'),
  ('CSR Partner', 'Corporate social responsibility partners')
ON CONFLICT (name) DO NOTHING;

INSERT INTO activities (name, description, unit)
VALUES
  ('Street Sweeping', 'Daily street cleaning', 'km'),
  ('Garbage Collection', 'Door-to-door waste pickup', 'trips'),
  ('Road Pothole Repair', 'Asphalt patching', 'sq.m'),
  ('Tree Plantation', 'Planting saplings in wards', 'nos')
ON CONFLICT (name) DO NOTHING;

DO $$
DECLARE
  v_corp_id UUID;
  v_zone_id UUID;
  v_ward_id UUID;
  v_area_id UUID;
  v_scat_id UUID;
  v_stake_id UUID;
  v_proj_id UUID;
  v_act_id UUID;
  v_pa_id UUID;
BEGIN
  SELECT id INTO v_corp_id FROM corporations WHERE code = 'TCC-001' LIMIT 1;
  IF v_corp_id IS NULL THEN RETURN; END IF;

  INSERT INTO zones (corporation_id, code, name)
  VALUES (v_corp_id, 'Z-N', 'North Zone')
  ON CONFLICT (corporation_id, name) DO NOTHING;
  SELECT id INTO v_zone_id FROM zones WHERE corporation_id = v_corp_id AND code = 'Z-N' LIMIT 1;

  INSERT INTO zone_wards (zone_id, ward_number, name)
  VALUES (v_zone_id, '001', 'Ward 001 - Palayamkottai')
  ON CONFLICT (zone_id, ward_number) DO NOTHING;
  SELECT id INTO v_ward_id FROM zone_wards WHERE zone_id = v_zone_id AND ward_number = '001' LIMIT 1;

  INSERT INTO ward_areas (ward_id, code, name)
  VALUES (v_ward_id, 'A-01', 'Millerpuram')
  ON CONFLICT (ward_id, name) DO NOTHING;
  SELECT id INTO v_area_id FROM ward_areas WHERE ward_id = v_ward_id AND code = 'A-01' LIMIT 1;

  INSERT INTO area_streets (area_id, name, street_type)
  VALUES (v_area_id, 'Beach Road', 'Main')
  ON CONFLICT (area_id, name) DO NOTHING;

  INSERT INTO corporation_officials (corporation_id, name, designation, department)
  SELECT v_corp_id, 'R. Kumar', 'Executive Engineer', 'Sanitation'
  WHERE NOT EXISTS (
    SELECT 1 FROM corporation_officials WHERE corporation_id = v_corp_id AND name = 'R. Kumar'
  );

  SELECT id INTO v_scat_id FROM stakeholder_categories WHERE name = 'NGO' LIMIT 1;

  INSERT INTO stakeholders (stakeholder_category_id, corporation_id, name, contact_person, phone)
  SELECT v_scat_id, v_corp_id, 'Clean City Foundation', 'Priya Sharma', '9876543210'
  WHERE NOT EXISTS (SELECT 1 FROM stakeholders WHERE name = 'Clean City Foundation');
  SELECT id INTO v_stake_id FROM stakeholders WHERE name = 'Clean City Foundation' LIMIT 1;

  INSERT INTO stakeholder_members (stakeholder_id, name, role, phone)
  SELECT v_stake_id, 'Priya Sharma', 'Coordinator', '9876543210'
  WHERE v_stake_id IS NOT NULL
    AND NOT EXISTS (
      SELECT 1 FROM stakeholder_members WHERE stakeholder_id = v_stake_id AND name = 'Priya Sharma'
    );

  INSERT INTO projects (corporation_id, code, name, description, budget, status, start_date)
  SELECT v_corp_id, 'PRJ-2025-01', 'North Zone Clean Streets Initiative',
    'Comprehensive street cleaning and waste management in North Zone wards',
    2500000, 'active', CURRENT_DATE
  WHERE NOT EXISTS (SELECT 1 FROM projects WHERE code = 'PRJ-2025-01');
  SELECT id INTO v_proj_id FROM projects WHERE code = 'PRJ-2025-01' LIMIT 1;

  SELECT id INTO v_act_id FROM activities WHERE name = 'Street Sweeping' LIMIT 1;

  INSERT INTO project_activities (project_id, activity_id, budget, status, planned_start)
  VALUES (v_proj_id, v_act_id, 500000, 'active', CURRENT_DATE)
  ON CONFLICT (project_id, activity_id) DO NOTHING;
  SELECT id INTO v_pa_id FROM project_activities WHERE project_id = v_proj_id AND activity_id = v_act_id LIMIT 1;

  INSERT INTO activity_executing_stakeholders (project_activity_id, stakeholder_id, role)
  VALUES (v_pa_id, v_stake_id, 'Primary Executor')
  ON CONFLICT (project_activity_id, stakeholder_id) DO NOTHING;

  INSERT INTO activity_funding_stakeholders (project_activity_id, stakeholder_id, committed_amount, funding_type)
  VALUES (v_pa_id, v_stake_id, 500000, 'CSR')
  ON CONFLICT (project_activity_id, stakeholder_id) DO NOTHING;

  INSERT INTO daily_activity_updates (project_activity_id, stakeholder_id, update_date, work_description, progress_pct)
  SELECT v_pa_id, v_stake_id, CURRENT_DATE, 'Completed sweeping on Beach Road — 2 km covered', 35
  WHERE v_pa_id IS NOT NULL AND v_stake_id IS NOT NULL
    AND NOT EXISTS (
      SELECT 1 FROM daily_activity_updates
      WHERE project_activity_id = v_pa_id AND update_date = CURRENT_DATE
    );
END $$;
