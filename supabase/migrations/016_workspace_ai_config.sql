-- ============================================================
-- 016: Create workspace_ai_config table
-- ============================================================

CREATE TABLE IF NOT EXISTS workspace_ai_config (
  workspace_id UUID PRIMARY KEY REFERENCES workspaces(id) ON DELETE CASCADE,
  agent_name TEXT DEFAULT 'Asistente AgencyAI',
  agent_avatar TEXT DEFAULT '🤖',
  agent_personality TEXT DEFAULT 'profesional',
  ai_provider TEXT DEFAULT 'anthropic',
  anthropic_api_key TEXT,
  openai_api_key TEXT,
  language TEXT DEFAULT 'es',
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Grants
GRANT SELECT, INSERT, UPDATE ON workspace_ai_config TO authenticated;
GRANT ALL ON workspace_ai_config TO service_role;

-- RLS
ALTER TABLE workspace_ai_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ai_config_select" ON workspace_ai_config
  FOR SELECT USING (
    workspace_id IN (
      SELECT id FROM workspaces WHERE owner_id = auth.uid()::text
      UNION
      SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()::text
    )
  );

CREATE POLICY "ai_config_insert" ON workspace_ai_config
  FOR INSERT WITH CHECK (
    workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid()::text)
  );

CREATE POLICY "ai_config_update" ON workspace_ai_config
  FOR UPDATE USING (
    workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid()::text)
  );

CREATE POLICY "ai_config_all_service" ON workspace_ai_config
  FOR ALL TO service_role USING (true) WITH CHECK (true);
