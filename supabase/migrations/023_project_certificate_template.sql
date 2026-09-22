-- Certificate template image per project / requirement.

ALTER TABLE projects ADD COLUMN IF NOT EXISTS certificate_template_url TEXT;

COMMENT ON COLUMN projects.certificate_template_url IS
  'Public URL for the appreciation certificate template used when printing participant certificates.';
