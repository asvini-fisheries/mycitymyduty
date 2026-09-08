-- Give every existing stakeholder a first member using the master contact details.
-- Member name = contact person (or stakeholder name), phone/email copied from the master, role = admin.

INSERT INTO stakeholder_members (stakeholder_id, name, role, phone, email, is_active)
SELECT
  s.id,
  COALESCE(NULLIF(btrim(s.contact_person), ''), s.name),
  'admin',
  NULLIF(btrim(s.phone), ''),
  NULLIF(btrim(s.email), ''),
  COALESCE(s.is_active, true)
FROM stakeholders s
WHERE NOT EXISTS (
  SELECT 1
  FROM stakeholder_members sm
  WHERE sm.stakeholder_id = s.id
);
