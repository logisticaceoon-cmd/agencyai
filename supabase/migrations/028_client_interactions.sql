CREATE TABLE IF NOT EXISTS public.client_interactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  client_id TEXT NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('email', 'call', 'meeting', 'whatsapp', 'note', 'other')),
  date TIMESTAMPTZ DEFAULT NOW(),
  duration_minutes INTEGER,
  summary TEXT NOT NULL,
  outcome TEXT,
  next_action TEXT,
  created_by TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_interactions_workspace ON client_interactions(workspace_id);
CREATE INDEX idx_interactions_client ON client_interactions(client_id);
CREATE INDEX idx_interactions_date ON client_interactions(date DESC);

ALTER TABLE client_interactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "interactions_service" ON client_interactions FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "interactions_select" ON client_interactions FOR SELECT TO authenticated
  USING (workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()::text AND status = 'active'));
