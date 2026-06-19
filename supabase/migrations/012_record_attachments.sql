-- MyCityMyDuty - Image attachments with descriptions (JSONB)
-- Replaces document_attachments TEXT[] with attachments JSONB on all master/transaction tables.

-- ============================================================
-- STORAGE BUCKET
-- ============================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'mycitymyduty-attachments',
  'mycitymyduty-attachments',
  true,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "mycitymyduty_attachments_select" ON storage.objects;
CREATE POLICY "mycitymyduty_attachments_select"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'mycitymyduty-attachments');

DROP POLICY IF EXISTS "mycitymyduty_attachments_insert" ON storage.objects;
CREATE POLICY "mycitymyduty_attachments_insert"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'mycitymyduty-attachments');

DROP POLICY IF EXISTS "mycitymyduty_attachments_update" ON storage.objects;
CREATE POLICY "mycitymyduty_attachments_update"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'mycitymyduty-attachments');

DROP POLICY IF EXISTS "mycitymyduty_attachments_delete" ON storage.objects;
CREATE POLICY "mycitymyduty_attachments_delete"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'mycitymyduty-attachments');

-- ============================================================
-- ADD attachments COLUMN TO ALL RELEVANT TABLES
-- ============================================================

DO $$
DECLARE
  t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'corporations', 'zones', 'zone_wards', 'ward_areas', 'area_streets',
    'corporation_officials', 'service_categories', 'stakeholder_categories',
    'stakeholders', 'stakeholder_members', 'stakeholder_equipment', 'central_committees',
    'projects', 'activities', 'project_activities', 'activity_resource_requirements',
    'activity_executing_stakeholders', 'activity_funding_stakeholders',
    'daily_activity_updates', 'daily_activity_resources_used',
    'stakeholder_bills', 'stakeholder_payments'
  ]
  LOOP
    EXECUTE format(
      'ALTER TABLE %I ADD COLUMN IF NOT EXISTS attachments JSONB NOT NULL DEFAULT ''[]''::jsonb',
      t
    );
  END LOOP;
END $$;

-- ============================================================
-- MIGRATE LEGACY document_attachments TEXT[] -> attachments JSONB
-- ============================================================

DO $$
DECLARE
  t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'stakeholders', 'projects', 'daily_activity_updates', 'stakeholder_bills'
  ]
  LOOP
    EXECUTE format($sql$
      UPDATE %I
      SET attachments = COALESCE(
        (
          SELECT jsonb_agg(
            jsonb_build_object(
              'url', elem,
              'description', '',
              'file_name', regexp_replace(elem, '^.*/', ''),
              'uploaded_at', to_char(NOW() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"')
            )
          )
          FROM unnest(document_attachments) AS elem
        ),
        '[]'::jsonb
      )
      WHERE document_attachments IS NOT NULL
        AND cardinality(document_attachments) > 0
    $sql$, t);

    EXECUTE format('ALTER TABLE %I DROP COLUMN IF EXISTS document_attachments', t);
  END LOOP;
END $$;
