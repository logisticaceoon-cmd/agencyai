CREATE TABLE IF NOT EXISTS public.approval_requests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  client_id TEXT REFERENCES public.clients(id) ON DELETE SET NULL,
  task_id UUID,
  doc_id UUID,
  title TEXT NOT NULL,
  description TEXT,
  attachments JSONB DEFAULT '[]',
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'revision_requested')),
  client_comment TEXT,
  internal_notes TEXT,
  expires_at TIMESTAMPTZ,
  responded_at TIMESTAMPTZ,
  token TEXT UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex'),
  created_by TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_approvals_workspace ON approval_requests(workspace_id);
CREATE INDEX idx_approvals_client ON approval_requests(client_id);
CREATE INDEX idx_approvals_token ON approval_requests(token);
CREATE INDEX idx_approvals_status ON approval_requests(status);

ALTER TABLE approval_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "approvals_service" ON approval_requests FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "approvals_select" ON approval_requests FOR SELECT TO authenticated
  USING (workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()::text AND status = 'active'));
