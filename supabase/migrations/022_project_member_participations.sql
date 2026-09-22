-- Record stakeholder members who participated in a project/requirement on a date,
-- so the corporation can issue appreciation certificates.

CREATE TABLE IF NOT EXISTS project_member_participations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  stakeholder_id UUID NOT NULL REFERENCES stakeholders(id) ON DELETE CASCADE,
  stakeholder_member_id UUID NOT NULL REFERENCES stakeholder_members(id) ON DELETE CASCADE,
  participation_date DATE NOT NULL,
  notes TEXT,
  certificate_issued_at TIMESTAMPTZ,
  attachments JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (project_id, stakeholder_member_id, participation_date)
);

CREATE INDEX IF NOT EXISTS idx_project_member_participations_project
  ON project_member_participations (project_id);

CREATE INDEX IF NOT EXISTS idx_project_member_participations_stakeholder
  ON project_member_participations (stakeholder_id);

CREATE INDEX IF NOT EXISTS idx_project_member_participations_date
  ON project_member_participations (participation_date DESC);

CREATE OR REPLACE FUNCTION public.check_participation_member_belongs()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM stakeholder_members sm
    WHERE sm.id = NEW.stakeholder_member_id
      AND sm.stakeholder_id = NEW.stakeholder_id
  ) THEN
    RAISE EXCEPTION 'Member does not belong to the selected stakeholder';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_check_participation_member ON project_member_participations;
CREATE TRIGGER trg_check_participation_member
  BEFORE INSERT OR UPDATE ON project_member_participations
  FOR EACH ROW
  EXECUTE FUNCTION public.check_participation_member_belongs();

DROP TRIGGER IF EXISTS trg_project_member_participations_updated_at ON project_member_participations;
CREATE TRIGGER trg_project_member_participations_updated_at
  BEFORE UPDATE ON project_member_participations
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();

ALTER TABLE project_member_participations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS project_member_participations_auth_all ON project_member_participations;
CREATE POLICY project_member_participations_auth_all ON project_member_participations
  FOR ALL TO authenticated
  USING (true) WITH CHECK (true);
