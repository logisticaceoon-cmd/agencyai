-- Service categories
CREATE TABLE IF NOT EXISTS service_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID,
  name TEXT NOT NULL,
  description TEXT,
  color TEXT DEFAULT '#2563eb',
  icon TEXT DEFAULT '📋',
  position INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Finance clients (one client per category)
CREATE TABLE IF NOT EXISTS finance_clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID,
  category_id UUID REFERENCES service_categories(id) ON DELETE SET NULL,
  client_name TEXT NOT NULL,
  company_name TEXT,
  assigned_to TEXT,
  contract_cost NUMERIC DEFAULT 0,
  commission_percent NUMERIC DEFAULT 0,
  commission_amount NUMERIC DEFAULT 0,
  currency TEXT DEFAULT 'USD',
  total_amount NUMERIC DEFAULT 0,
  cancelled_amount NUMERIC DEFAULT 0,
  accounts_count INTEGER DEFAULT 1,
  start_date DATE,
  status TEXT DEFAULT 'active',
  observations TEXT,
  contract_pdf_url TEXT,
  contract_pdf_name TEXT,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Monthly records for closing
CREATE TABLE IF NOT EXISTS finance_client_monthly (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES finance_clients(id) ON DELETE CASCADE,
  workspace_id UUID,
  month INTEGER NOT NULL,
  year INTEGER NOT NULL,
  billed_amount NUMERIC DEFAULT 0,
  commission_amount NUMERIC DEFAULT 0,
  currency TEXT DEFAULT 'USD',
  status TEXT DEFAULT 'pending',
  notes TEXT,
  closed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(client_id, month, year)
);

CREATE INDEX IF NOT EXISTS idx_sc_workspace ON service_categories(workspace_id);
CREATE INDEX IF NOT EXISTS idx_fc_workspace ON finance_clients(workspace_id);
CREATE INDEX IF NOT EXISTS idx_fc_category ON finance_clients(category_id);
CREATE INDEX IF NOT EXISTS idx_fcm_client ON finance_client_monthly(client_id);
CREATE INDEX IF NOT EXISTS idx_fcm_period ON finance_client_monthly(month, year);

ALTER TABLE service_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE finance_clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE finance_client_monthly ENABLE ROW LEVEL SECURITY;
