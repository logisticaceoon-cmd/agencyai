-- Time tracking for agency team members
CREATE TABLE IF NOT EXISTS public.time_entries (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  project_id TEXT REFERENCES public.projects(id) ON DELETE SET NULL,
  task_id UUID,
  client_id TEXT REFERENCES public.clients(id) ON DELETE SET NULL,
  description TEXT,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ,
  duration_minutes INTEGER,
  billable BOOLEAN DEFAULT true,
  hourly_rate DECIMAL(10,2),
  status TEXT DEFAULT 'stopped' CHECK (status IN ('running', 'stopped')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_time_workspace ON time_entries(workspace_id);
CREATE INDEX idx_time_user ON time_entries(workspace_id, user_id);
CREATE INDEX idx_time_client ON time_entries(workspace_id, client_id);
CREATE INDEX idx_time_date ON time_entries(start_time);

ALTER TABLE time_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "time_service" ON time_entries FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "time_select" ON time_entries FOR SELECT TO authenticated
  USING (workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()::text AND status = 'active'));
