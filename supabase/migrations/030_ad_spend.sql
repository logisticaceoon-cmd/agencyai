CREATE TABLE IF NOT EXISTS public.ad_spend_records (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  client_id TEXT NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  platform TEXT NOT NULL CHECK (platform IN ('meta', 'google', 'tiktok', 'linkedin', 'twitter', 'other')),
  campaign_name TEXT,
  amount DECIMAL(12,2) NOT NULL DEFAULT 0,
  currency TEXT DEFAULT 'USD',
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  roas DECIMAL(8,2),
  impressions INTEGER,
  clicks INTEGER,
  conversions INTEGER,
  cpa DECIMAL(10,2),
  ctr DECIMAL(6,4),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by TEXT
);

CREATE INDEX idx_adspend_workspace ON ad_spend_records(workspace_id);
CREATE INDEX idx_adspend_client ON ad_spend_records(workspace_id, client_id);
CREATE INDEX idx_adspend_period ON ad_spend_records(period_start);
CREATE INDEX idx_adspend_platform ON ad_spend_records(platform);

ALTER TABLE ad_spend_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY "adspend_service" ON ad_spend_records FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "adspend_select" ON ad_spend_records FOR SELECT TO authenticated
  USING (workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()::text AND status = 'active'));
