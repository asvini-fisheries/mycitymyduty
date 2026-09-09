-- Assign stakeholders to a zone so they can be grouped zone-wise.

ALTER TABLE stakeholders
  ADD COLUMN IF NOT EXISTS zone_id UUID REFERENCES zones(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS stakeholders_zone_id_idx ON stakeholders (zone_id);
