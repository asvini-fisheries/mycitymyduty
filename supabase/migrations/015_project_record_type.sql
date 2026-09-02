-- Distinguish corporation-wide projects from location-specific requirements

DO $$ BEGIN
  CREATE TYPE project_record_type AS ENUM ('project', 'requirement');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS record_type project_record_type NOT NULL DEFAULT 'requirement';

-- Existing rows are civic requirements (location-specific entries)
UPDATE projects SET record_type = 'requirement' WHERE record_type IS NULL;
