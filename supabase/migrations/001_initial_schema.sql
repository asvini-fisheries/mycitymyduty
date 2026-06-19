-- MyCityMyDuty - Initial Schema
-- Run in Supabase SQL Editor or via Supabase CLI

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- user_role enum (standalone MyCityMyDuty database)
DO $$ BEGIN
  CREATE TYPE user_role AS ENUM ('admin', 'official', 'stakeholder', 'viewer');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;


DO $$ BEGIN
  CREATE TYPE project_status AS ENUM ('planned', 'active', 'on_hold', 'completed', 'cancelled');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE bill_status AS ENUM ('draft', 'submitted', 'approved', 'paid', 'rejected');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE payment_mode AS ENUM ('cash', 'bank_transfer', 'upi', 'cheque');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE approval_status AS ENUM ('draft', 'submitted', 'approved', 'rejected');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================
-- OPTIONAL FIELDS (nullable â€” schema design, Jun 2026)
-- ============================================================
-- GSTIN/PAN ................ corporations, stakeholders
-- latitude / longitude ....... corporations, zones, zone_wards, ward_areas,
--                              area_streets, projects, daily_activity_updates
-- document_attachments TEXT[]  stakeholders, projects, daily_activity_updates,
--                              stakeholder_bills
-- Approval workflow ........ projects, daily_activity_updates, stakeholder_bills
--   approval_status, submitted_at, approved_by, approved_at, rejection_reason
--   (stakeholder_bills reuse bill_status for status; no separate approval_status)

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- USERS
-- ============================================================

CREATE TABLE IF NOT EXISTS user_master (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT NOT NULL,
  phone TEXT,
  role user_role NOT NULL DEFAULT 'viewer',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- GEOGRAPHY MASTERS
-- ============================================================

CREATE TABLE IF NOT EXISTS corporations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE,
  name TEXT NOT NULL,
  address TEXT,
  contact_person TEXT,
  phone TEXT,
  email TEXT,
  gstin TEXT,
  pan TEXT,
  latitude DECIMAL(10, 7),
  longitude DECIMAL(10, 7),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS zones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  corporation_id UUID NOT NULL REFERENCES corporations(id) ON DELETE CASCADE,
  code TEXT,
  name TEXT NOT NULL,
  description TEXT,
  latitude DECIMAL(10, 7),
  longitude DECIMAL(10, 7),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(corporation_id, name)
);

CREATE TABLE IF NOT EXISTS zone_wards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  zone_id UUID NOT NULL REFERENCES zones(id) ON DELETE CASCADE,
  ward_number TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  latitude DECIMAL(10, 7),
  longitude DECIMAL(10, 7),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(zone_id, ward_number)
);

CREATE TABLE IF NOT EXISTS ward_areas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ward_id UUID NOT NULL REFERENCES zone_wards(id) ON DELETE CASCADE,
  code TEXT,
  name TEXT NOT NULL,
  description TEXT,
  latitude DECIMAL(10, 7),
  longitude DECIMAL(10, 7),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(ward_id, name)
);

CREATE TABLE IF NOT EXISTS area_streets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  area_id UUID NOT NULL REFERENCES ward_areas(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  street_type TEXT,
  description TEXT,
  latitude DECIMAL(10, 7),
  longitude DECIMAL(10, 7),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(area_id, name)
);

-- ============================================================
-- OFFICIALS & SERVICE MASTERS
-- ============================================================

CREATE TABLE IF NOT EXISTS corporation_officials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  corporation_id UUID NOT NULL REFERENCES corporations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  designation TEXT,
  department TEXT,
  phone TEXT,
  email TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS service_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- STAKEHOLDER MASTERS
-- ============================================================

CREATE TABLE IF NOT EXISTS stakeholder_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS stakeholder_category_access_rights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stakeholder_category_id UUID NOT NULL REFERENCES stakeholder_categories(id) ON DELETE CASCADE,
  module_key TEXT NOT NULL,
  module_label TEXT NOT NULL,
  can_view BOOLEAN NOT NULL DEFAULT true,
  can_create BOOLEAN NOT NULL DEFAULT false,
  can_edit BOOLEAN NOT NULL DEFAULT false,
  can_delete BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(stakeholder_category_id, module_key)
);

CREATE TABLE IF NOT EXISTS stakeholders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stakeholder_category_id UUID NOT NULL REFERENCES stakeholder_categories(id),
  corporation_id UUID REFERENCES corporations(id) ON DELETE SET NULL,
  registration_no TEXT,
  gstin TEXT,
  pan TEXT,
  name TEXT NOT NULL,
  contact_person TEXT,
  phone TEXT,
  email TEXT,
  address TEXT,
  service_category_id UUID REFERENCES service_categories(id) ON DELETE SET NULL,
  document_attachments TEXT[],
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS stakeholder_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stakeholder_id UUID NOT NULL REFERENCES stakeholders(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  role TEXT,
  phone TEXT,
  email TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS stakeholder_equipment (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stakeholder_id UUID NOT NULL REFERENCES stakeholders(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  equipment_type TEXT,
  quantity INTEGER NOT NULL DEFAULT 1,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS central_committees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  corporation_id UUID NOT NULL REFERENCES corporations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  formation_date DATE,
  chairperson TEXT,
  secretary TEXT,
  notes TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- PROJECT & ACTIVITY MASTERS
-- ============================================================

CREATE TABLE IF NOT EXISTS projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  corporation_id UUID NOT NULL REFERENCES corporations(id) ON DELETE CASCADE,
  ward_id UUID REFERENCES zone_wards(id) ON DELETE SET NULL,
  area_id UUID REFERENCES ward_areas(id) ON DELETE SET NULL,
  street_id UUID REFERENCES area_streets(id) ON DELETE SET NULL,
  code TEXT,
  name TEXT NOT NULL,
  description TEXT,
  start_date DATE,
  end_date DATE,
  budget DECIMAL(15,2) DEFAULT 0,
  status project_status NOT NULL DEFAULT 'planned',
  latitude DECIMAL(10, 7),
  longitude DECIMAL(10, 7),
  document_attachments TEXT[],
  approval_status approval_status,
  submitted_at TIMESTAMPTZ,
  approved_by UUID REFERENCES user_master(id) ON DELETE SET NULL,
  approved_at TIMESTAMPTZ,
  rejection_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  unit TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS project_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  activity_id UUID NOT NULL REFERENCES activities(id),
  planned_start DATE,
  planned_end DATE,
  budget DECIMAL(15,2) DEFAULT 0,
  status project_status NOT NULL DEFAULT 'planned',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(project_id, activity_id)
);

CREATE TABLE IF NOT EXISTS activity_resource_requirements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_activity_id UUID NOT NULL REFERENCES project_activities(id) ON DELETE CASCADE,
  resource_name TEXT NOT NULL,
  quantity DECIMAL(15,3) NOT NULL DEFAULT 0,
  unit TEXT,
  estimated_cost DECIMAL(15,2) DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS activity_executing_stakeholders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_activity_id UUID NOT NULL REFERENCES project_activities(id) ON DELETE CASCADE,
  stakeholder_id UUID NOT NULL REFERENCES stakeholders(id),
  role TEXT,
  assigned_date DATE DEFAULT CURRENT_DATE,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(project_activity_id, stakeholder_id)
);

CREATE TABLE IF NOT EXISTS activity_funding_stakeholders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_activity_id UUID NOT NULL REFERENCES project_activities(id) ON DELETE CASCADE,
  stakeholder_id UUID NOT NULL REFERENCES stakeholders(id),
  committed_amount DECIMAL(15,2) NOT NULL DEFAULT 0,
  funding_type TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(project_activity_id, stakeholder_id)
);

-- ============================================================
-- DAILY UPDATES & BILLING
-- ============================================================

CREATE TABLE IF NOT EXISTS daily_activity_updates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_activity_id UUID NOT NULL REFERENCES project_activities(id) ON DELETE CASCADE,
  stakeholder_id UUID NOT NULL REFERENCES stakeholders(id),
  update_date DATE NOT NULL DEFAULT CURRENT_DATE,
  work_description TEXT NOT NULL,
  progress_pct INTEGER DEFAULT 0 CHECK (progress_pct >= 0 AND progress_pct <= 100),
  remarks TEXT,
  latitude DECIMAL(10, 7),
  longitude DECIMAL(10, 7),
  document_attachments TEXT[],
  approval_status approval_status,
  submitted_at TIMESTAMPTZ,
  approved_by UUID REFERENCES user_master(id) ON DELETE SET NULL,
  approved_at TIMESTAMPTZ,
  rejection_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS daily_activity_resources_used (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  daily_activity_update_id UUID NOT NULL REFERENCES daily_activity_updates(id) ON DELETE CASCADE,
  resource_name TEXT NOT NULL,
  quantity DECIMAL(15,3) NOT NULL DEFAULT 0,
  unit TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS stakeholder_bills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stakeholder_id UUID NOT NULL REFERENCES stakeholders(id),
  project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
  project_activity_id UUID REFERENCES project_activities(id) ON DELETE SET NULL,
  service_provider_name TEXT NOT NULL,
  bill_number TEXT,
  bill_date DATE NOT NULL DEFAULT CURRENT_DATE,
  amount DECIMAL(15,2) NOT NULL DEFAULT 0,
  description TEXT,
  status bill_status NOT NULL DEFAULT 'draft',
  document_attachments TEXT[],
  submitted_at TIMESTAMPTZ,
  approved_by UUID REFERENCES user_master(id) ON DELETE SET NULL,
  approved_at TIMESTAMPTZ,
  rejection_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS stakeholder_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bill_id UUID REFERENCES stakeholder_bills(id) ON DELETE SET NULL,
  stakeholder_id UUID NOT NULL REFERENCES stakeholders(id),
  payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
  amount DECIMAL(15,2) NOT NULL DEFAULT 0,
  payment_mode payment_mode NOT NULL DEFAULT 'bank_transfer',
  reference_number TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Extend user_master for MyCityMyDuty links
ALTER TABLE user_master ADD COLUMN IF NOT EXISTS corporation_id UUID;
ALTER TABLE user_master ADD COLUMN IF NOT EXISTS stakeholder_id UUID;

DO $$ BEGIN
  ALTER TABLE user_master
    ADD CONSTRAINT user_master_corporation_id_fkey
    FOREIGN KEY (corporation_id) REFERENCES corporations(id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE user_master
    ADD CONSTRAINT user_master_stakeholder_id_fkey
    FOREIGN KEY (stakeholder_id) REFERENCES stakeholders(id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================
-- TRIGGERS
-- ============================================================

DO $$
DECLARE
  t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'user_master', 'corporations', 'zones', 'zone_wards', 'ward_areas', 'area_streets',
    'corporation_officials', 'service_categories', 'stakeholder_categories',
    'stakeholder_category_access_rights', 'stakeholders', 'stakeholder_members',
    'stakeholder_equipment', 'central_committees', 'projects', 'activities',
    'project_activities', 'activity_resource_requirements', 'activity_executing_stakeholders',
    'activity_funding_stakeholders', 'daily_activity_updates', 'daily_activity_resources_used',
    'stakeholder_bills', 'stakeholder_payments'
  ]
  LOOP
    EXECUTE format('
      DROP TRIGGER IF EXISTS trg_%s_updated_at ON %I;
      CREATE TRIGGER trg_%s_updated_at
        BEFORE UPDATE ON %I
        FOR EACH ROW EXECUTE FUNCTION set_updated_at();
    ', t, t, t, t);
  END LOOP;
END $$;

-- ============================================================
-- ROW LEVEL SECURITY (authenticated users)
-- ============================================================

DO $$
DECLARE
  t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'user_master', 'corporations', 'zones', 'zone_wards', 'ward_areas', 'area_streets',
    'corporation_officials', 'service_categories', 'stakeholder_categories',
    'stakeholder_category_access_rights', 'stakeholders', 'stakeholder_members',
    'stakeholder_equipment', 'central_committees', 'projects', 'activities',
    'project_activities', 'activity_resource_requirements', 'activity_executing_stakeholders',
    'activity_funding_stakeholders', 'daily_activity_updates', 'daily_activity_resources_used',
    'stakeholder_bills', 'stakeholder_payments'
  ]
  LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY;', t);
    EXECUTE format('DROP POLICY IF EXISTS %I_auth_all ON %I;', t, t);
    EXECUTE format('
      CREATE POLICY %I_auth_all ON %I
        FOR ALL TO authenticated
        USING (true) WITH CHECK (true);
    ', t, t);
  END LOOP;
END $$;

-- Signup trigger: create user_master row (compatible with shared auth)
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_master (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    COALESCE((NEW.raw_user_meta_data->>'role')::user_role, 'viewer')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
