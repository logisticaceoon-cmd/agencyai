-- ============================================================
-- Migration 035: Priorities 2-10 — Comments, Profitability,
-- Real-time, i18n, Automated Reports, Interactive Portal
-- ============================================================

-- 1. Comments system (polymorphic — tasks, projects, reports, deliverables)
CREATE TABLE IF NOT EXISTS public.comments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  entity_type TEXT NOT NULL CHECK (entity_type IN ('task', 'project', 'report', 'deliverable', 'milestone')),
  entity_id UUID NOT NULL,
  parent_id UUID REFERENCES public.comments(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  author_id TEXT NOT NULL,
  author_name TEXT,
  author_avatar TEXT,
  mentions TEXT[] DEFAULT '{}',
  is_client_comment BOOLEAN DEFAULT false,
  portal_token TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_comments_entity ON comments(entity_type, entity_id);
CREATE INDEX idx_comments_workspace ON comments(workspace_id);
CREATE INDEX idx_comments_created ON comments(created_at DESC);

ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "comments_service" ON comments FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "comments_select" ON comments FOR SELECT TO authenticated
  USING (workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()::text AND status = 'active'));

-- 2. Activity feed
CREATE TABLE IF NOT EXISTS public.activity_feed (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  user_id TEXT,
  user_name TEXT,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID,
  entity_name TEXT,
  client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_activity_workspace ON activity_feed(workspace_id, created_at DESC);
CREATE INDEX idx_activity_client ON activity_feed(client_id, created_at DESC);
CREATE INDEX idx_activity_entity ON activity_feed(entity_type, entity_id);

ALTER TABLE activity_feed ENABLE ROW LEVEL SECURITY;
CREATE POLICY "activity_service" ON activity_feed FOR ALL TO service_role USING (true) WITH CHECK (true);

-- 3. Hourly rate on workspace_members + default_hourly_rate on workspaces
ALTER TABLE public.workspace_members ADD COLUMN IF NOT EXISTS hourly_rate DECIMAL(10,2) DEFAULT 0;
ALTER TABLE public.workspaces ADD COLUMN IF NOT EXISTS default_hourly_rate DECIMAL(10,2) DEFAULT 50;

-- 4. Locale preference
ALTER TABLE public.workspace_members ADD COLUMN IF NOT EXISTS locale TEXT DEFAULT 'es';
ALTER TABLE public.workspaces ADD COLUMN IF NOT EXISTS default_locale TEXT DEFAULT 'en';

-- 5. Report templates & scheduling
CREATE TABLE IF NOT EXISTS public.report_templates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  report_type TEXT DEFAULT 'monthly',
  sections JSONB DEFAULT '[]',
  is_scheduled BOOLEAN DEFAULT false,
  schedule_frequency TEXT CHECK (schedule_frequency IN ('weekly', 'biweekly', 'monthly', 'quarterly')),
  schedule_day INTEGER,
  auto_send BOOLEAN DEFAULT false,
  client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
  last_generated_at TIMESTAMPTZ,
  next_generation_at TIMESTAMPTZ,
  created_by TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_report_templates_workspace ON report_templates(workspace_id);
CREATE INDEX idx_report_templates_schedule ON report_templates(is_scheduled, next_generation_at);

ALTER TABLE report_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "report_templates_service" ON report_templates FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Add scheduling fields to existing reports
ALTER TABLE public.reports ADD COLUMN IF NOT EXISTS template_id UUID REFERENCES public.report_templates(id) ON DELETE SET NULL;
ALTER TABLE public.reports ADD COLUMN IF NOT EXISTS auto_generated BOOLEAN DEFAULT false;
ALTER TABLE public.reports ADD COLUMN IF NOT EXISTS generation_log JSONB DEFAULT '[]';

-- 6. Deliverables (for approval workflow)
CREATE TABLE IF NOT EXISTS public.deliverables (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
  project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  file_url TEXT,
  file_type TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'revision_requested', 'rejected')),
  submitted_by TEXT,
  reviewed_at TIMESTAMPTZ,
  review_notes TEXT,
  portal_visible BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_deliverables_workspace ON deliverables(workspace_id);
CREATE INDEX idx_deliverables_client ON deliverables(client_id);

ALTER TABLE deliverables ENABLE ROW LEVEL SECURITY;
CREATE POLICY "deliverables_service" ON deliverables FOR ALL TO service_role USING (true) WITH CHECK (true);

-- 7. Portal enhancements
ALTER TABLE public.workspaces ADD COLUMN IF NOT EXISTS primary_color TEXT DEFAULT '#2563eb';
ALTER TABLE public.workspaces ADD COLUMN IF NOT EXISTS portal_welcome_message TEXT;

-- Portal activity log
CREATE TABLE IF NOT EXISTS public.portal_activity (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
  portal_token TEXT,
  action TEXT NOT NULL,
  entity_type TEXT,
  entity_id UUID,
  ip_address TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_portal_activity_workspace ON portal_activity(workspace_id, created_at DESC);

ALTER TABLE portal_activity ENABLE ROW LEVEL SECURITY;
CREATE POLICY "portal_activity_service" ON portal_activity FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Client briefs (uploads from portal)
CREATE TABLE IF NOT EXISTS public.client_briefs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  file_url TEXT,
  file_type TEXT,
  file_size INTEGER DEFAULT 0,
  portal_token TEXT,
  status TEXT DEFAULT 'new' CHECK (status IN ('new', 'reviewed', 'in_progress', 'completed')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE client_briefs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "briefs_service" ON client_briefs FOR ALL TO service_role USING (true) WITH CHECK (true);

-- 8. Onboarding tracking
ALTER TABLE public.workspaces ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT false;
ALTER TABLE public.workspaces ADD COLUMN IF NOT EXISTS onboarding_step INTEGER DEFAULT 0;
ALTER TABLE public.workspaces ADD COLUMN IF NOT EXISTS has_sample_data BOOLEAN DEFAULT false;
ALTER TABLE public.workspaces ADD COLUMN IF NOT EXISTS tour_completed BOOLEAN DEFAULT false;

-- 9. Time entry billed flag (for time→invoice connection)
ALTER TABLE public.time_entries ADD COLUMN IF NOT EXISTS billed BOOLEAN DEFAULT false;
ALTER TABLE public.time_entries ADD COLUMN IF NOT EXISTS invoice_id UUID;

-- 10. Enable realtime on key tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.tasks;
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE public.comments;

-- 11. Presence tracking
CREATE TABLE IF NOT EXISTS public.user_presence (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  user_name TEXT,
  avatar_url TEXT,
  current_page TEXT,
  entity_type TEXT,
  entity_id UUID,
  last_seen TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (workspace_id, user_id)
);

ALTER TABLE user_presence ENABLE ROW LEVEL SECURITY;
CREATE POLICY "presence_service" ON user_presence FOR ALL TO service_role USING (true) WITH CHECK (true);
