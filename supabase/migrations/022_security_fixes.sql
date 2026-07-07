-- ============================================================
-- Migration 022: Security fixes
-- Fixes: overly permissive grants, missing/broken RLS policies, missing indexes
-- ============================================================

-- 1. Revoke ALL from anon on all tables (was granted in migration 011)
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon;
REVOKE ALL ON ALL ROUTINES IN SCHEMA public FROM anon;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES FROM anon;

-- Grant anon only SELECT on tables needed for public access (portal, etc.)
GRANT USAGE ON SCHEMA public TO anon;
GRANT SELECT ON public.clients TO anon;

-- Authenticated users get SELECT, INSERT, UPDATE (DELETE only where needed)
GRANT SELECT, INSERT, UPDATE ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT DELETE ON public.bookmarks TO authenticated;
GRANT DELETE ON public.notifications TO authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE ON TABLES TO authenticated;

-- Service role keeps full access
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT ALL ON ALL ROUTINES IN SCHEMA public TO service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON ROUTINES TO service_role;

-- 2. Fix google_calendar_tokens RLS — restrict to service_role only
DROP POLICY IF EXISTS "Service role full access on google_calendar_tokens" ON google_calendar_tokens;
CREATE POLICY "service_role_only_google_cal_tokens"
  ON google_calendar_tokens FOR ALL
  TO service_role
  USING (true) WITH CHECK (true);

-- 3. Fix notifications insert RLS — users can only insert for themselves
DROP POLICY IF EXISTS "notif_insert" ON notifications;
CREATE POLICY "notif_insert" ON notifications FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid()::text
    OR "userId" = auth.uid()::text
  );

CREATE POLICY "notif_insert_service" ON notifications FOR INSERT
  TO service_role
  WITH CHECK (true);

-- 4. Fix bookmarks RLS — add workspace scoping
DROP POLICY IF EXISTS "enable_all_for_authenticated" ON bookmarks;
CREATE POLICY "bookmarks_select" ON bookmarks FOR SELECT
  TO authenticated
  USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members
      WHERE user_id = auth.uid()::text AND status = 'active'
    )
  );
CREATE POLICY "bookmarks_insert" ON bookmarks FOR INSERT
  TO authenticated
  WITH CHECK (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members
      WHERE user_id = auth.uid()::text AND status = 'active'
    )
  );
CREATE POLICY "bookmarks_delete" ON bookmarks FOR DELETE
  TO authenticated
  USING (user_id = auth.uid()::text);

-- 5. Add RLS policies for tables that have RLS enabled but no policies
CREATE POLICY "contracts_service" ON contracts FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "contracts_select" ON contracts FOR SELECT TO authenticated
  USING (workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()::text AND status = 'active'));

CREATE POLICY "payroll_service" ON payroll FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "payroll_select" ON payroll FOR SELECT TO authenticated
  USING (workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()::text AND status = 'active'));

CREATE POLICY "trafficker_contracts_service" ON trafficker_contracts FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "trafficker_contracts_select" ON trafficker_contracts FOR SELECT TO authenticated
  USING (workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()::text AND status = 'active'));

CREATE POLICY "contract_monthly_service" ON contract_monthly_records FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "contract_monthly_select" ON contract_monthly_records FOR SELECT TO authenticated
  USING (contract_id IN (SELECT id FROM trafficker_contracts WHERE workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()::text AND status = 'active')));

CREATE POLICY "service_categories_service" ON service_categories FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_categories_select" ON service_categories FOR SELECT TO authenticated
  USING (workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()::text AND status = 'active'));

CREATE POLICY "finance_clients_service" ON finance_clients FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "finance_clients_select" ON finance_clients FOR SELECT TO authenticated
  USING (workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()::text AND status = 'active'));

CREATE POLICY "finance_client_monthly_service" ON finance_client_monthly FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "finance_client_monthly_select" ON finance_client_monthly FOR SELECT TO authenticated
  USING (client_id IN (SELECT id FROM finance_clients WHERE workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()::text AND status = 'active')));

-- 6. Add missing DELETE policies
CREATE POLICY "kpi_records_delete" ON kpi_records FOR DELETE TO authenticated
  USING (kpi_id IN (SELECT id FROM kpis WHERE workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()::text AND status = 'active')));

CREATE POLICY "key_results_delete" ON key_results FOR DELETE TO authenticated
  USING (objective_id IN (SELECT id FROM objectives WHERE workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()::text AND status = 'active')));

CREATE POLICY "milestone_observations_delete" ON milestone_observations FOR DELETE TO authenticated
  USING (milestone_id IN (SELECT id FROM milestones WHERE project_id IN (SELECT id FROM projects WHERE workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()::text AND status = 'active'))));

-- 7. Add missing indexes for performance
CREATE INDEX IF NOT EXISTS idx_workspace_members_user_id ON workspace_members(user_id);
CREATE INDEX IF NOT EXISTS idx_workspace_members_composite ON workspace_members(workspace_id, user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(date);
CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(type);
CREATE INDEX IF NOT EXISTS idx_transactions_workspace_date ON transactions(workspace_id, date);
CREATE INDEX IF NOT EXISTS idx_clients_status ON clients(status);
CREATE INDEX IF NOT EXISTS idx_clients_deleted ON clients(deleted_at);
CREATE INDEX IF NOT EXISTS idx_clients_workspace_status ON clients(workspace_id, status);
CREATE INDEX IF NOT EXISTS idx_tasks_deleted ON tasks(deleted_at);
CREATE INDEX IF NOT EXISTS idx_tasks_workspace_status ON tasks(workspace_id, status);
CREATE INDEX IF NOT EXISTS idx_notifications_user_created ON notifications(user_id, "createdAt" DESC);

-- 8. Fix workspace_invitations — add INSERT/UPDATE/DELETE policies
CREATE POLICY "wi_insert" ON workspace_invitations FOR INSERT TO authenticated
  WITH CHECK (workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()::text AND status = 'active' AND role IN ('owner', 'admin')));
CREATE POLICY "wi_update" ON workspace_invitations FOR UPDATE TO authenticated
  USING (workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()::text AND status = 'active' AND role IN ('owner', 'admin')));
CREATE POLICY "wi_delete" ON workspace_invitations FOR DELETE TO authenticated
  USING (workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()::text AND status = 'active' AND role IN ('owner', 'admin')));

-- 9. Fix member_client_assignments — add INSERT/UPDATE/DELETE policies
CREATE POLICY "mca_insert" ON member_client_assignments FOR INSERT TO authenticated
  WITH CHECK (workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()::text AND status = 'active' AND role IN ('owner', 'admin')));
CREATE POLICY "mca_update" ON member_client_assignments FOR UPDATE TO authenticated
  USING (workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()::text AND status = 'active' AND role IN ('owner', 'admin')));
CREATE POLICY "mca_delete" ON member_client_assignments FOR DELETE TO authenticated
  USING (workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()::text AND status = 'active' AND role IN ('owner', 'admin')));
