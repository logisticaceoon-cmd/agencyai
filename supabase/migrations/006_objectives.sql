CREATE TABLE IF NOT EXISTS objectives (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  type TEXT DEFAULT 'agency',
  client_id UUID REFERENCES clients(id),
  quarter TEXT,
  year INTEGER DEFAULT EXTRACT(YEAR FROM now()),
  status TEXT DEFAULT 'active',
  owner_id TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS key_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  objective_id UUID REFERENCES objectives(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  metric_type TEXT DEFAULT 'percentage',
  start_value NUMERIC DEFAULT 0,
  target_value NUMERIC NOT NULL,
  current_value NUMERIC DEFAULT 0,
  unit TEXT,
  due_date DATE,
  status TEXT DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_objectives_workspace ON objectives(workspace_id);
CREATE INDEX IF NOT EXISTS idx_objectives_quarter ON objectives(quarter, year);
CREATE INDEX IF NOT EXISTS idx_key_results_objective ON key_results(objective_id);

ALTER TABLE objectives ENABLE ROW LEVEL SECURITY;
ALTER TABLE key_results ENABLE ROW LEVEL SECURITY;
