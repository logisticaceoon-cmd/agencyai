CREATE TABLE IF NOT EXISTS public.task_templates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  subtasks JSONB DEFAULT '[]',
  default_assignee_role TEXT,
  estimated_hours DECIMAL(8,2),
  tags TEXT[] DEFAULT '{}',
  category TEXT DEFAULT 'general',
  recurrence TEXT CHECK (recurrence IN ('none', 'weekly', 'biweekly', 'monthly', 'quarterly')),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_templates_workspace ON task_templates(workspace_id);

ALTER TABLE task_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "templates_service" ON task_templates FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "templates_select" ON task_templates FOR SELECT TO authenticated
  USING (workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()::text AND status = 'active'));
