CREATE TABLE IF NOT EXISTS public.assets (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_path TEXT,
  file_type TEXT NOT NULL,
  file_size INTEGER DEFAULT 0,
  category TEXT DEFAULT 'other' CHECK (category IN ('image', 'video', 'document', 'design', 'other')),
  client_id TEXT REFERENCES public.clients(id) ON DELETE SET NULL,
  project_id TEXT REFERENCES public.projects(id) ON DELETE SET NULL,
  tags TEXT[] DEFAULT '{}',
  uploaded_by TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_assets_workspace ON assets(workspace_id);
CREATE INDEX idx_assets_client ON assets(client_id);
CREATE INDEX idx_assets_category ON assets(category);
CREATE INDEX idx_assets_created ON assets(created_at DESC);

ALTER TABLE assets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "assets_service" ON assets FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "assets_select" ON assets FOR SELECT TO authenticated
  USING (workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()::text AND status = 'active'));
