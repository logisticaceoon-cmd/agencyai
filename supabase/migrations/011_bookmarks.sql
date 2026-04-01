CREATE TABLE IF NOT EXISTS bookmarks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  url TEXT NOT NULL,
  description TEXT,
  icon TEXT DEFAULT '📄',
  color TEXT DEFAULT '#2563eb',
  category TEXT DEFAULT 'general',
  client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
  project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
  pinned BOOLEAN DEFAULT false,
  created_by TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_bookmarks_workspace ON bookmarks(workspace_id);
CREATE INDEX IF NOT EXISTS idx_bookmarks_category ON bookmarks(category);

ALTER TABLE bookmarks ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "enable_all_for_authenticated" ON bookmarks
  FOR ALL USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
