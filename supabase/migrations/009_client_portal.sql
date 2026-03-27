CREATE TABLE IF NOT EXISTS client_portal_access (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  access_token TEXT UNIQUE DEFAULT gen_random_uuid()::text,
  permissions JSONB DEFAULT '{"projects": true, "reports": true, "invoices": false}',
  last_access TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_client_portal_access_token ON client_portal_access(access_token);
CREATE INDEX IF NOT EXISTS idx_client_portal_access_client ON client_portal_access(client_id);

ALTER TABLE client_portal_access ENABLE ROW LEVEL SECURITY;
