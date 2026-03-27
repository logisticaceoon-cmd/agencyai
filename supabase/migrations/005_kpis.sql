CREATE TABLE IF NOT EXISTS kpis (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  unit TEXT DEFAULT 'número',
  target_value NUMERIC,
  current_value NUMERIC DEFAULT 0,
  frequency TEXT DEFAULT 'monthly',
  category TEXT DEFAULT 'performance',
  color TEXT DEFAULT '#2563eb',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS kpi_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kpi_id UUID REFERENCES kpis(id) ON DELETE CASCADE,
  value NUMERIC NOT NULL,
  period_start DATE,
  period_end DATE,
  notes TEXT,
  recorded_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_kpis_workspace ON kpis(workspace_id);
CREATE INDEX IF NOT EXISTS idx_kpis_client ON kpis(client_id);
CREATE INDEX IF NOT EXISTS idx_kpi_records_kpi ON kpi_records(kpi_id);

ALTER TABLE kpis ENABLE ROW LEVEL SECURITY;
ALTER TABLE kpi_records ENABLE ROW LEVEL SECURITY;
