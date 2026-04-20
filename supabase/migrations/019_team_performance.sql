-- Team Performance Monitoring — Bitácora and Reports

CREATE TABLE IF NOT EXISTS performance_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  task_id UUID REFERENCES tasks(id) ON DELETE SET NULL,
  client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
  action_type TEXT NOT NULL DEFAULT 'task_completed',
  title TEXT NOT NULL,
  description TEXT,
  hours_spent DECIMAL(8,2),
  delay_hours DECIMAL(8,2),
  was_on_time BOOLEAN DEFAULT true,
  month INT NOT NULL,
  year INT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS performance_reports (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  report_type TEXT NOT NULL DEFAULT 'weekly',
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  month INT,
  year INT,
  week_number INT,
  tasks_completed INT DEFAULT 0,
  tasks_delayed INT DEFAULT 0,
  tasks_pending INT DEFAULT 0,
  on_time_rate DECIMAL(5,2) DEFAULT 0,
  avg_hours_per_task DECIMAL(8,2),
  summary TEXT,
  strengths TEXT,
  improvement_areas TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for query performance
CREATE INDEX IF NOT EXISTS idx_perf_logs_workspace ON performance_logs(workspace_id);
CREATE INDEX IF NOT EXISTS idx_perf_logs_user ON performance_logs(workspace_id, user_id);
CREATE INDEX IF NOT EXISTS idx_perf_logs_month ON performance_logs(workspace_id, month, year);
CREATE INDEX IF NOT EXISTS idx_perf_reports_workspace ON performance_reports(workspace_id);
CREATE INDEX IF NOT EXISTS idx_perf_reports_user ON performance_reports(workspace_id, user_id);
CREATE INDEX IF NOT EXISTS idx_perf_reports_period ON performance_reports(workspace_id, period_start, period_end);

-- Row Level Security (RLS) policies for performance_logs
ALTER TABLE performance_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org_members_can_view_performance_logs" ON performance_logs
  FOR SELECT USING (
    workspace_id IN (
      SELECT org_id FROM organization_members WHERE user_id = auth.uid()
    ) OR auth.role() = 'service_role'
  );

CREATE POLICY "org_members_can_insert_performance_logs" ON performance_logs
  FOR INSERT WITH CHECK (
    workspace_id IN (
      SELECT org_id FROM organization_members WHERE user_id = auth.uid()
    ) OR auth.role() = 'service_role'
  );

CREATE POLICY "org_members_can_update_performance_logs" ON performance_logs
  FOR UPDATE USING (
    workspace_id IN (
      SELECT org_id FROM organization_members WHERE user_id = auth.uid()
    ) OR auth.role() = 'service_role'
  );

-- Row Level Security (RLS) policies for performance_reports
ALTER TABLE performance_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org_members_can_view_performance_reports" ON performance_reports
  FOR SELECT USING (
    workspace_id IN (
      SELECT org_id FROM organization_members WHERE user_id = auth.uid()
    ) OR auth.role() = 'service_role'
  );

CREATE POLICY "org_members_can_insert_performance_reports" ON performance_reports
  FOR INSERT WITH CHECK (
    workspace_id IN (
      SELECT org_id FROM organization_members WHERE user_id = auth.uid()
    ) OR auth.role() = 'service_role'
  );

CREATE POLICY "org_members_can_update_performance_reports" ON performance_reports
  FOR UPDATE USING (
    workspace_id IN (
      SELECT org_id FROM organization_members WHERE user_id = auth.uid()
    ) OR auth.role() = 'service_role'
  );
