-- Migration 021: Content Calendar table
-- Run in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS content_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL,
  client_id uuid REFERENCES clients(id) ON DELETE SET NULL,
  title text NOT NULL,
  platform text NOT NULL DEFAULT 'instagram',
  post_type text NOT NULL DEFAULT 'imagen',
  scheduled_date date,
  status text NOT NULL DEFAULT 'borrador',
  description text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  deleted_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_content_items_workspace ON content_items(workspace_id);
CREATE INDEX IF NOT EXISTS idx_content_items_scheduled ON content_items(scheduled_date);
CREATE INDEX IF NOT EXISTS idx_content_items_client ON content_items(client_id);

ALTER TABLE content_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "content_items_workspace_policy" ON content_items;

CREATE POLICY "content_items_workspace_policy"
  ON content_items FOR ALL
  USING (workspace_id IN (
    SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
  ));
