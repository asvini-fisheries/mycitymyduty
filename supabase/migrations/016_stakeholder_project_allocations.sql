-- Allocate projects / requirements to stakeholders

CREATE TABLE IF NOT EXISTS stakeholder_project_allocations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stakeholder_id UUID NOT NULL REFERENCES stakeholders(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  notes TEXT,
  allocated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(stakeholder_id, project_id)
);

CREATE INDEX IF NOT EXISTS idx_stakeholder_project_allocations_stakeholder
  ON stakeholder_project_allocations(stakeholder_id);

CREATE INDEX IF NOT EXISTS idx_stakeholder_project_allocations_project
  ON stakeholder_project_allocations(project_id);

DROP TRIGGER IF EXISTS trg_stakeholder_project_allocations_updated_at ON stakeholder_project_allocations;
CREATE TRIGGER trg_stakeholder_project_allocations_updated_at
  BEFORE UPDATE ON stakeholder_project_allocations
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

ALTER TABLE stakeholder_project_allocations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS stakeholder_project_allocations_auth_all ON stakeholder_project_allocations;
CREATE POLICY stakeholder_project_allocations_auth_all ON stakeholder_project_allocations
  FOR ALL TO authenticated
  USING (true) WITH CHECK (true);
