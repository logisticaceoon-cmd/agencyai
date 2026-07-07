-- ============================================================
-- Migration 024: Create tables that were missing from migrations
-- These tables are referenced by API routes but never had DDL
-- ============================================================

-- 1. recordings
CREATE TABLE IF NOT EXISTS public.recordings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  url TEXT,
  duration INTEGER,
  client_id TEXT REFERENCES public.clients(id) ON DELETE SET NULL,
  meeting_id UUID,
  transcript TEXT,
  tags TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by TEXT
);

CREATE INDEX IF NOT EXISTS idx_recordings_workspace ON public.recordings(workspace_id);
ALTER TABLE public.recordings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "recordings_service" ON public.recordings FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "recordings_select" ON public.recordings FOR SELECT TO authenticated
  USING (workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()::text AND status = 'active'));

-- 2. meetings
CREATE TABLE IF NOT EXISTS public.meetings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  date TIMESTAMPTZ,
  duration INTEGER,
  attendees TEXT[] DEFAULT '{}',
  client_id TEXT REFERENCES public.clients(id) ON DELETE SET NULL,
  project_id TEXT REFERENCES public.projects(id) ON DELETE SET NULL,
  recording_url TEXT,
  notes TEXT,
  status TEXT DEFAULT 'scheduled',
  location TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by TEXT
);

CREATE INDEX IF NOT EXISTS idx_meetings_workspace ON public.meetings(workspace_id);
CREATE INDEX IF NOT EXISTS idx_meetings_date ON public.meetings(date);
ALTER TABLE public.meetings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "meetings_service" ON public.meetings FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "meetings_select" ON public.meetings FOR SELECT TO authenticated
  USING (workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()::text AND status = 'active'));

-- 3. audits
CREATE TABLE IF NOT EXISTS public.audits (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  type TEXT DEFAULT 'general',
  client_id TEXT REFERENCES public.clients(id) ON DELETE SET NULL,
  status TEXT DEFAULT 'draft',
  score INTEGER,
  findings JSONB DEFAULT '[]',
  recommendations JSONB DEFAULT '[]',
  summary TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by TEXT
);

CREATE INDEX IF NOT EXISTS idx_audits_workspace ON public.audits(workspace_id);
ALTER TABLE public.audits ENABLE ROW LEVEL SECURITY;
CREATE POLICY "audits_service" ON public.audits FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "audits_select" ON public.audits FOR SELECT TO authenticated
  USING (workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()::text AND status = 'active'));

-- 4. docs
CREATE TABLE IF NOT EXISTS public.docs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT,
  category TEXT DEFAULT 'general',
  status TEXT DEFAULT 'draft',
  author_id TEXT,
  version INTEGER DEFAULT 1,
  version_notes TEXT,
  tags TEXT[] DEFAULT '{}',
  external_url TEXT,
  client_id TEXT REFERENCES public.clients(id) ON DELETE SET NULL,
  project_id TEXT REFERENCES public.projects(id) ON DELETE SET NULL,
  is_template BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_docs_workspace ON public.docs(workspace_id);
ALTER TABLE public.docs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "docs_service" ON public.docs FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "docs_select" ON public.docs FOR SELECT TO authenticated
  USING (workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()::text AND status = 'active'));

-- 5. activity_log
CREATE TABLE IF NOT EXISTS public.activity_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  "organizationId" UUID,
  workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE,
  "userId" TEXT,
  user_id TEXT,
  "taskId" UUID,
  "actionType" TEXT NOT NULL DEFAULT 'general',
  "entityType" TEXT,
  "entityId" TEXT,
  description TEXT,
  changes JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_activity_log_workspace ON public.activity_log(workspace_id);
CREATE INDEX IF NOT EXISTS idx_activity_log_org ON public.activity_log("organizationId");
CREATE INDEX IF NOT EXISTS idx_activity_log_user ON public.activity_log("userId");
ALTER TABLE public.activity_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "activity_log_service" ON public.activity_log FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "activity_log_select" ON public.activity_log FOR SELECT TO authenticated
  USING (
    workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()::text AND status = 'active')
    OR "organizationId" IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()::text AND status = 'active')
  );

-- 6. Add FK reference for meetings in recordings
ALTER TABLE public.recordings
  ADD CONSTRAINT fk_recordings_meeting
  FOREIGN KEY (meeting_id) REFERENCES public.meetings(id) ON DELETE SET NULL;
