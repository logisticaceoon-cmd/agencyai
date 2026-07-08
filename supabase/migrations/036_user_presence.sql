-- Tabla para rastrear presencia de usuarios en tiempo real
CREATE TABLE IF NOT EXISTS user_presence (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  workspace_id uuid NOT NULL,
  user_name text NOT NULL DEFAULT '',
  current_page text NOT NULL DEFAULT '/',
  entity_type text,
  entity_id text,
  last_seen timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, workspace_id)
);

-- Indices para consultas frecuentes
CREATE INDEX IF NOT EXISTS idx_user_presence_workspace ON user_presence(workspace_id);
CREATE INDEX IF NOT EXISTS idx_user_presence_last_seen ON user_presence(last_seen);

-- Habilitar Realtime en las tablas necesarias
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE tasks;
ALTER PUBLICATION supabase_realtime ADD TABLE user_presence;
