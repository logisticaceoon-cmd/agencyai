-- ============================================================
-- INVESTIGACIÓN DE MERCADO AUTOMÁTICA
-- Tablas: competitors, reports, tokens de acceso
-- ============================================================

-- ─── COMPETIDORES POR CLIENTE ──────────────────────────────
CREATE TABLE IF NOT EXISTS market_research_competitors (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  client_id    TEXT NOT NULL REFERENCES clients(id)    ON DELETE CASCADE,
  name         TEXT NOT NULL,
  website      TEXT,
  instagram    TEXT,
  facebook     TEXT,
  priority     INTEGER DEFAULT 1,  -- 1 = principal, 2 = secundario
  notes        TEXT
);
CREATE INDEX idx_mrc_client    ON market_research_competitors(client_id);
CREATE INDEX idx_mrc_workspace ON market_research_competitors(workspace_id);

-- ─── REPORTES MENSUALES ────────────────────────────────────
CREATE TABLE IF NOT EXISTS market_reports (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW(),
  workspace_id    UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  client_id       TEXT NOT NULL REFERENCES clients(id)    ON DELETE CASCADE,
  report_month    DATE NOT NULL,           -- siempre día 1: 2026-05-01
  status          TEXT DEFAULT 'pending'   CHECK (status IN ('pending','generating','completed','failed')),
  error_message   TEXT,
  generation_secs INTEGER,
  report_data     JSONB,
  model_used      TEXT DEFAULT 'claude-sonnet-4-6',
  tokens_used     INTEGER,
  UNIQUE(client_id, report_month)
);
CREATE INDEX idx_mr_client    ON market_reports(client_id);
CREATE INDEX idx_mr_workspace ON market_reports(workspace_id);
CREATE INDEX idx_mr_month     ON market_reports(report_month DESC);
CREATE INDEX idx_mr_status    ON market_reports(status);
CREATE INDEX idx_mr_data      ON market_reports USING GIN(report_data);

-- ─── TOKENS DE ACCESO AL PANEL (link compartible) ──────────
CREATE TABLE IF NOT EXISTS research_tokens (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  client_id    TEXT NOT NULL REFERENCES clients(id)    ON DELETE CASCADE UNIQUE,
  token        UUID NOT NULL DEFAULT gen_random_uuid() UNIQUE,
  last_viewed  TIMESTAMPTZ
);
CREATE INDEX idx_rt_token     ON research_tokens(token);
CREATE INDEX idx_rt_client    ON research_tokens(client_id);

-- ─── TRIGGER updated_at ────────────────────────────────────
CREATE OR REPLACE FUNCTION update_market_reports_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER market_reports_updated_at
  BEFORE UPDATE ON market_reports
  FOR EACH ROW EXECUTE FUNCTION update_market_reports_updated_at();

-- ─── RLS ──────────────────────────────────────────────────
ALTER TABLE market_research_competitors ENABLE ROW LEVEL SECURITY;
ALTER TABLE market_reports              ENABLE ROW LEVEL SECURITY;
ALTER TABLE research_tokens             ENABLE ROW LEVEL SECURITY;

CREATE POLICY "mrc_workspace" ON market_research_competitors
  USING (workspace_id = get_user_workspace_id(auth.uid()::text));
CREATE POLICY "mrc_insert" ON market_research_competitors FOR INSERT
  WITH CHECK (workspace_id = get_user_workspace_id(auth.uid()::text));
CREATE POLICY "mrc_update" ON market_research_competitors FOR UPDATE
  USING (workspace_id = get_user_workspace_id(auth.uid()::text));
CREATE POLICY "mrc_delete" ON market_research_competitors FOR DELETE
  USING (workspace_id = get_user_workspace_id(auth.uid()::text));

CREATE POLICY "mr_workspace" ON market_reports
  USING (workspace_id = get_user_workspace_id(auth.uid()::text));
CREATE POLICY "mr_insert" ON market_reports FOR INSERT
  WITH CHECK (workspace_id = get_user_workspace_id(auth.uid()::text));
CREATE POLICY "mr_update" ON market_reports FOR UPDATE
  USING (workspace_id = get_user_workspace_id(auth.uid()::text));

CREATE POLICY "rt_workspace" ON research_tokens
  USING (workspace_id = get_user_workspace_id(auth.uid()::text));
CREATE POLICY "rt_insert" ON research_tokens FOR INSERT
  WITH CHECK (workspace_id = get_user_workspace_id(auth.uid()::text));
