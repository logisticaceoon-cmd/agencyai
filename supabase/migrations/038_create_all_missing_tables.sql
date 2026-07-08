-- ═══════════════════════════════════════════════════════════════════════════════
-- Migration 038: Create all missing tables referenced by app code
-- The app has ~40 API routes referencing tables that never existed in the DB.
-- This migration creates them all so the app stops silently failing.
-- ═══════════════════════════════════════════════════════════════════════════════

-- ── Core business tables ─────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid REFERENCES workspaces(id),
  client_id uuid REFERENCES clients(id),
  title text NOT NULL,
  description text,
  "reportType" text DEFAULT 'monthly',
  status text DEFAULT 'draft',
  priority text DEFAULT 'medium',
  content jsonb,
  "submittedBy" uuid,
  share_token text,
  validated_at timestamptz,
  validated_by uuid,
  deleted_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid REFERENCES workspaces(id),
  client_id uuid REFERENCES clients(id),
  number text,
  status text DEFAULT 'draft',
  total numeric DEFAULT 0,
  currency text DEFAULT 'USD',
  issue_date date DEFAULT CURRENT_DATE,
  due_date date,
  paid_at timestamptz,
  items jsonb DEFAULT '[]',
  notes text,
  tax_rate numeric DEFAULT 0,
  subtotal numeric DEFAULT 0,
  deleted_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS time_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid REFERENCES workspaces(id),
  user_id uuid,
  task_id uuid REFERENCES tasks(id),
  project_id uuid REFERENCES projects(id),
  client_id uuid REFERENCES clients(id),
  description text,
  hours numeric DEFAULT 0,
  rate numeric DEFAULT 0,
  billable boolean DEFAULT true,
  date date DEFAULT CURRENT_DATE,
  start_time timestamptz,
  end_time timestamptz,
  invoiced boolean DEFAULT false,
  invoice_id uuid,
  deleted_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS objectives (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid REFERENCES workspaces(id),
  title text NOT NULL,
  description text,
  category text,
  quarter text,
  year integer,
  status text DEFAULT 'active',
  progress numeric DEFAULT 0,
  deleted_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS key_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  objective_id uuid REFERENCES objectives(id) ON DELETE CASCADE,
  title text NOT NULL,
  target_value numeric DEFAULT 100,
  current_value numeric DEFAULT 0,
  unit text DEFAULT '%',
  status text DEFAULT 'active',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- ── KPIs, meetings, minutes, recordings, docs ────────────────────────────────

CREATE TABLE IF NOT EXISTS kpis (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid REFERENCES workspaces(id),
  client_id uuid REFERENCES clients(id),
  name text NOT NULL,
  description text,
  category text,
  target_value numeric,
  current_value numeric DEFAULT 0,
  unit text DEFAULT '%',
  frequency text DEFAULT 'monthly',
  trend text DEFAULT 'neutral',
  formula text,
  suggested_target text,
  deleted_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS kpi_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kpi_id uuid REFERENCES kpis(id) ON DELETE CASCADE,
  value numeric NOT NULL,
  notes text,
  recorded_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS meetings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid REFERENCES workspaces(id),
  client_id uuid REFERENCES clients(id),
  title text NOT NULL,
  description text,
  date timestamptz,
  duration integer DEFAULT 60,
  location text,
  attendees jsonb DEFAULT '[]',
  notes text,
  status text DEFAULT 'scheduled',
  deleted_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS minutes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid REFERENCES workspaces(id),
  client_id uuid REFERENCES clients(id),
  project_id uuid REFERENCES projects(id),
  title text NOT NULL,
  content text,
  attendees jsonb DEFAULT '[]',
  action_items jsonb DEFAULT '[]',
  date timestamptz DEFAULT now(),
  status text DEFAULT 'draft',
  deleted_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS recordings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid REFERENCES workspaces(id),
  meeting_id uuid REFERENCES meetings(id),
  title text NOT NULL,
  url text,
  duration integer,
  transcript text,
  deleted_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS docs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid REFERENCES workspaces(id),
  title text NOT NULL,
  content text,
  category text DEFAULT 'general',
  tags jsonb DEFAULT '[]',
  author_id uuid,
  deleted_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- ── Portal, approvals, assets, bookmarks, comments ───────────────────────────

CREATE TABLE IF NOT EXISTS client_portal_access (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid REFERENCES workspaces(id),
  client_id uuid REFERENCES clients(id),
  access_token text UNIQUE NOT NULL,
  permissions jsonb DEFAULT '{"projects":true,"reports":true,"invoices":true}',
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS portal_activity (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid REFERENCES workspaces(id),
  client_id uuid REFERENCES clients(id),
  portal_token text,
  action text NOT NULL,
  entity_type text,
  entity_id text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS deliverables (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid REFERENCES workspaces(id),
  client_id uuid REFERENCES clients(id),
  project_id uuid REFERENCES projects(id),
  title text NOT NULL,
  description text,
  file_url text,
  file_type text,
  status text DEFAULT 'pending',
  portal_visible boolean DEFAULT true,
  review_notes text,
  reviewed_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS client_briefs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid REFERENCES workspaces(id),
  client_id uuid REFERENCES clients(id),
  project_id uuid REFERENCES projects(id),
  title text NOT NULL,
  content text,
  file_url text,
  file_name text,
  status text DEFAULT 'received',
  portal_token text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS approval_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid REFERENCES workspaces(id),
  type text NOT NULL,
  title text NOT NULL,
  description text,
  status text DEFAULT 'pending',
  requested_by uuid,
  approved_by uuid,
  entity_type text,
  entity_id uuid,
  approval_token text,
  responded_at timestamptz,
  expires_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid REFERENCES workspaces(id),
  client_id uuid REFERENCES clients(id),
  project_id uuid REFERENCES projects(id),
  name text NOT NULL,
  file_url text,
  file_type text,
  file_size integer,
  uploaded_by uuid,
  tags jsonb DEFAULT '[]',
  deleted_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS bookmarks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid REFERENCES workspaces(id),
  user_id uuid,
  entity_type text NOT NULL,
  entity_id uuid NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid REFERENCES workspaces(id),
  user_id uuid,
  entity_type text NOT NULL,
  entity_id uuid NOT NULL,
  content text NOT NULL,
  parent_id uuid,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- ── Finance, templates, milestones, misc ─────────────────────────────────────

CREATE TABLE IF NOT EXISTS transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid REFERENCES workspaces(id),
  client_id uuid REFERENCES clients(id),
  type text NOT NULL DEFAULT 'income',
  category text,
  description text,
  amount numeric DEFAULT 0,
  currency text DEFAULT 'USD',
  date date DEFAULT CURRENT_DATE,
  status text DEFAULT 'completed',
  deleted_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS payroll (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid REFERENCES workspaces(id),
  user_id uuid,
  member_name text,
  amount numeric DEFAULT 0,
  currency text DEFAULT 'USD',
  period text,
  status text DEFAULT 'pending',
  paid_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS report_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid REFERENCES workspaces(id),
  name text NOT NULL,
  description text,
  sections jsonb DEFAULT '[]',
  is_default boolean DEFAULT false,
  schedule text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS project_milestones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid REFERENCES projects(id) ON DELETE CASCADE,
  workspace_id uuid REFERENCES workspaces(id),
  title text NOT NULL,
  description text,
  due_date date,
  status text DEFAULT 'pending',
  completed_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS milestone_observations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  milestone_id uuid REFERENCES project_milestones(id) ON DELETE CASCADE,
  content text NOT NULL,
  author_id uuid,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS ad_spend_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid REFERENCES workspaces(id),
  client_id uuid REFERENCES clients(id),
  platform text DEFAULT 'meta',
  amount numeric DEFAULT 0,
  currency text DEFAULT 'USD',
  date date DEFAULT CURRENT_DATE,
  campaign_name text,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS user_presence (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid REFERENCES workspaces(id),
  user_id uuid NOT NULL,
  status text DEFAULT 'online',
  last_seen timestamptz DEFAULT now(),
  current_page text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS activity_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "organizationId" uuid,
  "userId" uuid,
  "taskId" uuid,
  "actionType" text,
  "entityType" text,
  "entityId" uuid,
  description text,
  changes jsonb,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS task_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid REFERENCES workspaces(id),
  name text NOT NULL,
  description text,
  tasks jsonb DEFAULT '[]',
  category text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS client_interactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid REFERENCES workspaces(id),
  client_id uuid REFERENCES clients(id),
  type text NOT NULL DEFAULT 'note',
  title text,
  content text,
  channel text,
  contact_person text,
  follow_up_date date,
  user_id uuid,
  deleted_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS workspace_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid REFERENCES workspaces(id),
  email text NOT NULL,
  role text DEFAULT 'member',
  token text UNIQUE,
  status text DEFAULT 'pending',
  invited_by uuid,
  accepted_at timestamptz,
  expires_at timestamptz,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS workspace_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid REFERENCES workspaces(id),
  name text NOT NULL,
  permissions jsonb DEFAULT '{}',
  is_default boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS audits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid REFERENCES workspaces(id),
  client_id uuid REFERENCES clients(id),
  title text NOT NULL,
  description text,
  type text DEFAULT 'general',
  status text DEFAULT 'draft',
  findings jsonb DEFAULT '[]',
  recommendations jsonb DEFAULT '[]',
  author_id uuid,
  deleted_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS google_calendar_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid REFERENCES workspaces(id),
  user_id uuid,
  access_token text,
  refresh_token text,
  expires_at timestamptz,
  calendar_id text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS role_ai_context (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid REFERENCES workspaces(id),
  role text NOT NULL,
  context text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS workspace_ai_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid REFERENCES workspaces(id) UNIQUE,
  provider text DEFAULT 'anthropic',
  model text,
  api_key_encrypted text,
  system_prompt text,
  enabled boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS service_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid REFERENCES workspaces(id),
  name text NOT NULL,
  color text,
  icon text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS trafficker_contracts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid REFERENCES workspaces(id),
  name text NOT NULL,
  client_name text,
  contract_cost numeric DEFAULT 0,
  billed_amount numeric DEFAULT 0,
  currency text DEFAULT 'USD',
  start_date date,
  end_date date,
  status text DEFAULT 'active',
  contract_pdf_url text,
  deleted_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS contract_monthly_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id uuid REFERENCES trafficker_contracts(id) ON DELETE CASCADE,
  month integer,
  year integer,
  amount numeric DEFAULT 0,
  status text DEFAULT 'pending',
  paid_at timestamptz,
  notes text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS finance_client_monthly (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  finance_client_id uuid REFERENCES finance_clients(id) ON DELETE CASCADE,
  month integer,
  year integer,
  amount numeric DEFAULT 0,
  status text DEFAULT 'pending',
  paid_at timestamptz,
  notes text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS member_client_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid REFERENCES workspaces(id),
  member_id uuid,
  client_id uuid REFERENCES clients(id),
  created_at timestamptz DEFAULT now()
);

-- ── Missing columns on existing tables ───────────────────────────────────────

ALTER TABLE workspaces ADD COLUMN IF NOT EXISTS tour_completed boolean DEFAULT false;
ALTER TABLE workspaces ADD COLUMN IF NOT EXISTS has_sample_data boolean DEFAULT false;
ALTER TABLE workspaces ADD COLUMN IF NOT EXISTS primary_color text DEFAULT '#2563eb';
ALTER TABLE workspaces ADD COLUMN IF NOT EXISTS portal_welcome_message text;

ALTER TABLE clients ADD COLUMN IF NOT EXISTS "contactPerson" text;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS "monthlyFee" numeric;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS brand text;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS whatsapp text;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS address text;

ALTER TABLE projects ADD COLUMN IF NOT EXISTS "clientId" uuid;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS "startDate" date;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS "endDate" date;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS progress numeric DEFAULT 0;

-- ── Enable Supabase Realtime on key tables ───────────────────────────────────
ALTER PUBLICATION supabase_realtime ADD TABLE tasks;
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
