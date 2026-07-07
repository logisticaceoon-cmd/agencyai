-- Tabla para almacenar tokens de Google Calendar por usuario/workspace
CREATE TABLE IF NOT EXISTS google_calendar_tokens (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  access_token TEXT NOT NULL,
  refresh_token TEXT,
  expiry_date BIGINT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(workspace_id, user_id)
);

-- Indice para busquedas rapidas
CREATE INDEX IF NOT EXISTS idx_gcal_tokens_workspace_user
  ON google_calendar_tokens(workspace_id, user_id);

-- RLS
ALTER TABLE google_calendar_tokens ENABLE ROW LEVEL SECURITY;

-- Politica: solo el service role puede acceder (las rutas usan admin client)
CREATE POLICY "Service role full access on google_calendar_tokens"
  ON google_calendar_tokens
  FOR ALL
  USING (true)
  WITH CHECK (true);
