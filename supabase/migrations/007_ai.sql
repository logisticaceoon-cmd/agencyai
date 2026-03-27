CREATE TABLE IF NOT EXISTS ai_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID,
  user_id TEXT,
  module TEXT,
  message TEXT,
  response TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ai_conversations_workspace ON ai_conversations(workspace_id);
ALTER TABLE ai_conversations ENABLE ROW LEVEL SECURITY;
