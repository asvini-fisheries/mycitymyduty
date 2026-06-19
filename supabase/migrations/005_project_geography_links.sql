-- Link projects to optional ward / area / street geography (incremental)
-- Safe to run on databases created before ward_id/area_id/street_id were in 001.

ALTER TABLE projects ADD COLUMN IF NOT EXISTS ward_id UUID REFERENCES zone_wards(id) ON DELETE SET NULL;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS area_id UUID REFERENCES ward_areas(id) ON DELETE SET NULL;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS street_id UUID REFERENCES area_streets(id) ON DELETE SET NULL;
