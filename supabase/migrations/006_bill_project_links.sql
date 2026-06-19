-- Link stakeholder bills optionally to project and/or project activity

ALTER TABLE stakeholder_bills
  ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES projects(id) ON DELETE SET NULL;

ALTER TABLE stakeholder_bills
  ADD COLUMN IF NOT EXISTS project_activity_id UUID REFERENCES project_activities(id) ON DELETE SET NULL;
