-- Helper function
CREATE OR REPLACE FUNCTION get_user_workspace_id(uid text)
RETURNS uuid AS $$
  SELECT id FROM workspaces WHERE owner_id = uid
  UNION
  SELECT workspace_id FROM workspace_members WHERE user_id = uid
  LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER;

-- WORKSPACES
CREATE POLICY "ws_select" ON workspaces FOR SELECT USING (owner_id = auth.uid()::text OR id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()::text));
CREATE POLICY "ws_insert" ON workspaces FOR INSERT WITH CHECK (owner_id = auth.uid()::text);
CREATE POLICY "ws_update" ON workspaces FOR UPDATE USING (owner_id = auth.uid()::text);

-- WORKSPACE_MEMBERS
CREATE POLICY "wm_select" ON workspace_members FOR SELECT USING (workspace_id IN (SELECT get_user_workspace_id(auth.uid()::text)));
CREATE POLICY "wm_insert" ON workspace_members FOR INSERT WITH CHECK (workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid()::text));
CREATE POLICY "wm_update" ON workspace_members FOR UPDATE USING (workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid()::text));
CREATE POLICY "wm_delete" ON workspace_members FOR DELETE USING (workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid()::text));

-- CLIENTS
CREATE POLICY "clients_select" ON clients FOR SELECT USING (workspace_id = get_user_workspace_id(auth.uid()::text));
CREATE POLICY "clients_insert" ON clients FOR INSERT WITH CHECK (workspace_id = get_user_workspace_id(auth.uid()::text));
CREATE POLICY "clients_update" ON clients FOR UPDATE USING (workspace_id = get_user_workspace_id(auth.uid()::text));
CREATE POLICY "clients_delete" ON clients FOR DELETE USING (workspace_id = get_user_workspace_id(auth.uid()::text));

-- PROJECTS
CREATE POLICY "projects_select" ON projects FOR SELECT USING (workspace_id = get_user_workspace_id(auth.uid()::text));
CREATE POLICY "projects_insert" ON projects FOR INSERT WITH CHECK (workspace_id = get_user_workspace_id(auth.uid()::text));
CREATE POLICY "projects_update" ON projects FOR UPDATE USING (workspace_id = get_user_workspace_id(auth.uid()::text));
CREATE POLICY "projects_delete" ON projects FOR DELETE USING (workspace_id = get_user_workspace_id(auth.uid()::text));

-- TASKS
CREATE POLICY "tasks_select" ON tasks FOR SELECT USING (workspace_id = get_user_workspace_id(auth.uid()::text));
CREATE POLICY "tasks_insert" ON tasks FOR INSERT WITH CHECK (workspace_id = get_user_workspace_id(auth.uid()::text));
CREATE POLICY "tasks_update" ON tasks FOR UPDATE USING (workspace_id = get_user_workspace_id(auth.uid()::text));
CREATE POLICY "tasks_delete" ON tasks FOR DELETE USING (workspace_id = get_user_workspace_id(auth.uid()::text));

-- REPORTS
CREATE POLICY "reports_select" ON reports FOR SELECT USING (workspace_id = get_user_workspace_id(auth.uid()::text));
CREATE POLICY "reports_insert" ON reports FOR INSERT WITH CHECK (workspace_id = get_user_workspace_id(auth.uid()::text));
CREATE POLICY "reports_update" ON reports FOR UPDATE USING (workspace_id = get_user_workspace_id(auth.uid()::text));
CREATE POLICY "reports_delete" ON reports FOR DELETE USING (workspace_id = get_user_workspace_id(auth.uid()::text));

-- MINUTES
CREATE POLICY "minutes_select" ON minutes FOR SELECT USING (workspace_id = get_user_workspace_id(auth.uid()::text));
CREATE POLICY "minutes_insert" ON minutes FOR INSERT WITH CHECK (workspace_id = get_user_workspace_id(auth.uid()::text));
CREATE POLICY "minutes_update" ON minutes FOR UPDATE USING (workspace_id = get_user_workspace_id(auth.uid()::text));
CREATE POLICY "minutes_delete" ON minutes FOR DELETE USING (workspace_id = get_user_workspace_id(auth.uid()::text));

-- TRANSACTIONS
CREATE POLICY "transactions_select" ON transactions FOR SELECT USING (workspace_id = get_user_workspace_id(auth.uid()::text));
CREATE POLICY "transactions_insert" ON transactions FOR INSERT WITH CHECK (workspace_id = get_user_workspace_id(auth.uid()::text));
CREATE POLICY "transactions_update" ON transactions FOR UPDATE USING (workspace_id = get_user_workspace_id(auth.uid()::text));
CREATE POLICY "transactions_delete" ON transactions FOR DELETE USING (workspace_id = get_user_workspace_id(auth.uid()::text));

-- INVOICES
CREATE POLICY "invoices_select" ON invoices FOR SELECT USING (workspace_id = get_user_workspace_id(auth.uid()::text));
CREATE POLICY "invoices_insert" ON invoices FOR INSERT WITH CHECK (workspace_id = get_user_workspace_id(auth.uid()::text));
CREATE POLICY "invoices_update" ON invoices FOR UPDATE USING (workspace_id = get_user_workspace_id(auth.uid()::text));
CREATE POLICY "invoices_delete" ON invoices FOR DELETE USING (workspace_id = get_user_workspace_id(auth.uid()::text));

-- EXPENSE_CATEGORIES
CREATE POLICY "expense_categories_select" ON expense_categories FOR SELECT USING (workspace_id = get_user_workspace_id(auth.uid()::text));
CREATE POLICY "expense_categories_insert" ON expense_categories FOR INSERT WITH CHECK (workspace_id = get_user_workspace_id(auth.uid()::text));
CREATE POLICY "expense_categories_update" ON expense_categories FOR UPDATE USING (workspace_id = get_user_workspace_id(auth.uid()::text));
CREATE POLICY "expense_categories_delete" ON expense_categories FOR DELETE USING (workspace_id = get_user_workspace_id(auth.uid()::text));

-- KPIS
CREATE POLICY "kpis_select" ON kpis FOR SELECT USING (workspace_id = get_user_workspace_id(auth.uid()::text));
CREATE POLICY "kpis_insert" ON kpis FOR INSERT WITH CHECK (workspace_id = get_user_workspace_id(auth.uid()::text));
CREATE POLICY "kpis_update" ON kpis FOR UPDATE USING (workspace_id = get_user_workspace_id(auth.uid()::text));
CREATE POLICY "kpis_delete" ON kpis FOR DELETE USING (workspace_id = get_user_workspace_id(auth.uid()::text));

-- KPI_RECORDS
CREATE POLICY "kpi_records_select" ON kpi_records FOR SELECT USING (kpi_id IN (SELECT id FROM kpis WHERE workspace_id = get_user_workspace_id(auth.uid()::text)));
CREATE POLICY "kpi_records_insert" ON kpi_records FOR INSERT WITH CHECK (kpi_id IN (SELECT id FROM kpis WHERE workspace_id = get_user_workspace_id(auth.uid()::text)));
CREATE POLICY "kpi_records_update" ON kpi_records FOR UPDATE USING (kpi_id IN (SELECT id FROM kpis WHERE workspace_id = get_user_workspace_id(auth.uid()::text)));

-- OBJECTIVES
CREATE POLICY "objectives_select" ON objectives FOR SELECT USING (workspace_id = get_user_workspace_id(auth.uid()::text));
CREATE POLICY "objectives_insert" ON objectives FOR INSERT WITH CHECK (workspace_id = get_user_workspace_id(auth.uid()::text));
CREATE POLICY "objectives_update" ON objectives FOR UPDATE USING (workspace_id = get_user_workspace_id(auth.uid()::text));
CREATE POLICY "objectives_delete" ON objectives FOR DELETE USING (workspace_id = get_user_workspace_id(auth.uid()::text));

-- KEY_RESULTS
CREATE POLICY "kr_select" ON key_results FOR SELECT USING (objective_id IN (SELECT id FROM objectives WHERE workspace_id = get_user_workspace_id(auth.uid()::text)));
CREATE POLICY "kr_insert" ON key_results FOR INSERT WITH CHECK (objective_id IN (SELECT id FROM objectives WHERE workspace_id = get_user_workspace_id(auth.uid()::text)));
CREATE POLICY "kr_update" ON key_results FOR UPDATE USING (objective_id IN (SELECT id FROM objectives WHERE workspace_id = get_user_workspace_id(auth.uid()::text)));

-- PROJECT_MILESTONES
CREATE POLICY "project_milestones_select" ON project_milestones FOR SELECT USING (workspace_id = get_user_workspace_id(auth.uid()::text));
CREATE POLICY "project_milestones_insert" ON project_milestones FOR INSERT WITH CHECK (workspace_id = get_user_workspace_id(auth.uid()::text));
CREATE POLICY "project_milestones_update" ON project_milestones FOR UPDATE USING (workspace_id = get_user_workspace_id(auth.uid()::text));
CREATE POLICY "project_milestones_delete" ON project_milestones FOR DELETE USING (workspace_id = get_user_workspace_id(auth.uid()::text));

-- MILESTONE_OBSERVATIONS
CREATE POLICY "mo_select" ON milestone_observations FOR SELECT USING (milestone_id IN (SELECT id FROM project_milestones WHERE workspace_id = get_user_workspace_id(auth.uid()::text)));
CREATE POLICY "mo_insert" ON milestone_observations FOR INSERT WITH CHECK (milestone_id IN (SELECT id FROM project_milestones WHERE workspace_id = get_user_workspace_id(auth.uid()::text)));

-- NOTIFICATIONS
CREATE POLICY "notif_select" ON notifications FOR SELECT USING ("userId" = auth.uid()::text OR user_id = auth.uid()::text);
CREATE POLICY "notif_insert" ON notifications FOR INSERT WITH CHECK (true);
CREATE POLICY "notif_update" ON notifications FOR UPDATE USING ("userId" = auth.uid()::text OR user_id = auth.uid()::text);

-- AI_CONVERSATIONS
CREATE POLICY "ai_select" ON ai_conversations FOR SELECT USING (workspace_id = get_user_workspace_id(auth.uid()::text));
CREATE POLICY "ai_insert" ON ai_conversations FOR INSERT WITH CHECK (workspace_id = get_user_workspace_id(auth.uid()::text));

-- BILLING_HISTORY
CREATE POLICY "bh_select" ON billing_history FOR SELECT USING (workspace_id = get_user_workspace_id(auth.uid()::text));
CREATE POLICY "bh_insert" ON billing_history FOR INSERT WITH CHECK (workspace_id = get_user_workspace_id(auth.uid()::text));

-- CLIENT_PORTAL_ACCESS
CREATE POLICY "cpa_select" ON client_portal_access FOR SELECT USING (workspace_id = get_user_workspace_id(auth.uid()::text));
CREATE POLICY "cpa_insert" ON client_portal_access FOR INSERT WITH CHECK (workspace_id = get_user_workspace_id(auth.uid()::text));
CREATE POLICY "cpa_update" ON client_portal_access FOR UPDATE USING (workspace_id = get_user_workspace_id(auth.uid()::text));
CREATE POLICY "cpa_delete" ON client_portal_access FOR DELETE USING (workspace_id = get_user_workspace_id(auth.uid()::text));
