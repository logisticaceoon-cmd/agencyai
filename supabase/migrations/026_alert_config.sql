-- ============================================================
-- 026: Add alert_config JSONB column to workspace_ai_config
-- ============================================================

ALTER TABLE workspace_ai_config ADD COLUMN IF NOT EXISTS alert_config JSONB DEFAULT '{}';
