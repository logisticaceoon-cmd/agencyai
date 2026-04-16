-- Crear tabla api_keys para integracion Cowork
-- organization_id referencia workspaces(id) que es UUID
CREATE TABLE IF NOT EXISTS api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  key VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  status VARCHAR(50) DEFAULT 'active',
  last_used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_api_keys_organization_id ON api_keys(organization_id);
CREATE INDEX IF NOT EXISTS idx_api_keys_key ON api_keys(key);
CREATE INDEX IF NOT EXISTS idx_api_keys_status ON api_keys(status);

-- RLS
ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can see their org api keys"
  ON api_keys FOR SELECT
  USING (
    organization_id IN (
      SELECT workspace_id FROM workspace_members
      WHERE user_id = auth.uid()::text
    )
  );

CREATE POLICY "Users can insert api keys for their org"
  ON api_keys FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT workspace_id FROM workspace_members
      WHERE user_id = auth.uid()::text
    )
  );

CREATE POLICY "Users can update their org api keys"
  ON api_keys FOR UPDATE
  USING (
    organization_id IN (
      SELECT workspace_id FROM workspace_members
      WHERE user_id = auth.uid()::text
    )
  );

-- Seed demo key (usa el primer workspace)
INSERT INTO api_keys (organization_id, key, name, status)
SELECT id, 'sk_agencyai_demo_local_testing_key_12345', 'Demo Key - Cowork Testing', 'active'
FROM workspaces LIMIT 1
ON CONFLICT (key) DO NOTHING;
