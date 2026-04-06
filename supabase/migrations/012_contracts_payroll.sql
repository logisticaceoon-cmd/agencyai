-- Contracts (traffickers/media buyers)
CREATE TABLE IF NOT EXISTS contracts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  trafficker_name TEXT NOT NULL,
  client_name TEXT,
  client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
  service TEXT,
  monthly_fee NUMERIC DEFAULT 0,
  currency TEXT DEFAULT 'USD',
  start_date DATE,
  end_date DATE,
  status TEXT DEFAULT 'active',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Payroll
CREATE TABLE IF NOT EXISTS payroll (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
  employee_name TEXT NOT NULL,
  role TEXT,
  base_salary NUMERIC DEFAULT 0,
  bonus NUMERIC DEFAULT 0,
  deductions NUMERIC DEFAULT 0,
  net_salary NUMERIC DEFAULT 0,
  currency TEXT DEFAULT 'USD',
  period TEXT,
  pay_date DATE,
  status TEXT DEFAULT 'pending',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Indices
CREATE INDEX IF NOT EXISTS idx_contracts_workspace ON contracts(workspace_id);
CREATE INDEX IF NOT EXISTS idx_contracts_status ON contracts(status);
CREATE INDEX IF NOT EXISTS idx_payroll_workspace ON payroll(workspace_id);
CREATE INDEX IF NOT EXISTS idx_payroll_period ON payroll(period);

-- RLS
ALTER TABLE contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE payroll ENABLE ROW LEVEL SECURITY;
