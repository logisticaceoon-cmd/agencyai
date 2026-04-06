-- Trafficker contracts with commission tracking
CREATE TABLE IF NOT EXISTS trafficker_contracts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID,
  code TEXT NOT NULL,
  trafficker_name TEXT NOT NULL,
  client_name TEXT NOT NULL DEFAULT '',
  service TEXT,
  monthly_fee NUMERIC NOT NULL DEFAULT 0,
  currency TEXT DEFAULT 'USD',
  commission_percent NUMERIC DEFAULT 0,
  status TEXT DEFAULT 'active',
  start_date DATE,
  notes TEXT,
  contract_pdf_url TEXT,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS contract_monthly_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id UUID REFERENCES trafficker_contracts(id) ON DELETE CASCADE,
  workspace_id UUID,
  month INTEGER NOT NULL,
  year INTEGER NOT NULL,
  monthly_fee NUMERIC NOT NULL,
  commission_amount NUMERIC DEFAULT 0,
  currency TEXT DEFAULT 'USD',
  status TEXT DEFAULT 'pending',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(contract_id, month, year)
);

CREATE INDEX IF NOT EXISTS idx_tc_workspace ON trafficker_contracts(workspace_id);
CREATE INDEX IF NOT EXISTS idx_tc_status ON trafficker_contracts(status);
CREATE INDEX IF NOT EXISTS idx_cmr_contract ON contract_monthly_records(contract_id);
CREATE INDEX IF NOT EXISTS idx_cmr_workspace ON contract_monthly_records(workspace_id);
CREATE INDEX IF NOT EXISTS idx_cmr_period ON contract_monthly_records(month, year);

ALTER TABLE trafficker_contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE contract_monthly_records ENABLE ROW LEVEL SECURITY;
