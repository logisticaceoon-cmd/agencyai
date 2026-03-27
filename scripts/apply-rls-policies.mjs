import pg from 'pg'
import { config } from 'dotenv'
config({ path: '.env.local' })

const { Client } = pg
const client = new Client({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
})

async function exec(label, sql) {
  try {
    await client.query(sql)
    console.log(`✅ ${label}`)
  } catch (err) {
    if (err.message.includes('already exists') || err.message.includes('duplicate')) {
      console.log(`⏭️  ${label} (ya existe)`)
    } else {
      console.error(`❌ ${label}: ${err.message}`)
    }
  }
}

async function run() {
  await client.connect()
  console.log('🔗 Conectado\n')

  // Helper function
  console.log('--- Helper function ---')
  await exec('get_user_workspace_id', `
    CREATE OR REPLACE FUNCTION get_user_workspace_id(uid text)
    RETURNS uuid AS $$
      SELECT id FROM workspaces WHERE owner_id = uid
      UNION
      SELECT workspace_id FROM workspace_members WHERE user_id = uid
      LIMIT 1;
    $$ LANGUAGE sql SECURITY DEFINER
  `)

  // First drop existing policies to avoid conflicts
  const tables_with_policies = [
    'workspaces', 'workspace_members', 'clients', 'projects', 'tasks',
    'reports', 'minutes', 'transactions', 'invoices', 'expense_categories',
    'kpis', 'kpi_records', 'objectives', 'key_results',
    'project_milestones', 'milestone_observations', 'notifications',
    'ai_conversations', 'billing_history', 'client_portal_access',
  ]

  console.log('\n--- Limpiando policies existentes ---')
  for (const t of tables_with_policies) {
    try {
      const res = await client.query(`
        SELECT policyname FROM pg_policies WHERE tablename = $1
      `, [t])
      for (const row of res.rows) {
        await client.query(`DROP POLICY IF EXISTS "${row.policyname}" ON ${t}`)
      }
      if (res.rows.length > 0) console.log(`  Eliminadas ${res.rows.length} policies de ${t}`)
    } catch {}
  }

  // ═══════════════════════════════════════════
  // WORKSPACES
  // ═══════════════════════════════════════════
  console.log('\n--- Workspaces ---')
  await exec('ws_select', `CREATE POLICY "ws_select" ON workspaces FOR SELECT USING (owner_id = auth.uid()::text OR id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()::text))`)
  await exec('ws_insert', `CREATE POLICY "ws_insert" ON workspaces FOR INSERT WITH CHECK (owner_id = auth.uid()::text)`)
  await exec('ws_update', `CREATE POLICY "ws_update" ON workspaces FOR UPDATE USING (owner_id = auth.uid()::text)`)

  // ═══════════════════════════════════════════
  // WORKSPACE_MEMBERS
  // ═══════════════════════════════════════════
  console.log('\n--- Workspace Members ---')
  await exec('wm_select', `CREATE POLICY "wm_select" ON workspace_members FOR SELECT USING (workspace_id IN (SELECT get_user_workspace_id(auth.uid()::text)))`)
  await exec('wm_insert', `CREATE POLICY "wm_insert" ON workspace_members FOR INSERT WITH CHECK (workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid()::text))`)
  await exec('wm_update', `CREATE POLICY "wm_update" ON workspace_members FOR UPDATE USING (workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid()::text))`)
  await exec('wm_delete', `CREATE POLICY "wm_delete" ON workspace_members FOR DELETE USING (workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid()::text))`)

  // Helper for workspace-scoped tables
  const wsTablesAll = ['clients', 'projects', 'tasks', 'reports', 'minutes', 'transactions', 'invoices', 'expense_categories', 'kpis', 'objectives', 'project_milestones']

  for (const t of wsTablesAll) {
    console.log(`\n--- ${t} ---`)
    await exec(`${t}_select`, `CREATE POLICY "${t}_select" ON ${t} FOR SELECT USING (workspace_id = get_user_workspace_id(auth.uid()::text))`)
    await exec(`${t}_insert`, `CREATE POLICY "${t}_insert" ON ${t} FOR INSERT WITH CHECK (workspace_id = get_user_workspace_id(auth.uid()::text))`)
    await exec(`${t}_update`, `CREATE POLICY "${t}_update" ON ${t} FOR UPDATE USING (workspace_id = get_user_workspace_id(auth.uid()::text))`)
    await exec(`${t}_delete`, `CREATE POLICY "${t}_delete" ON ${t} FOR DELETE USING (workspace_id = get_user_workspace_id(auth.uid()::text))`)
  }

  // ═══════════════════════════════════════════
  // KPI_RECORDS (via kpis)
  // ═══════════════════════════════════════════
  console.log('\n--- KPI Records ---')
  await exec('kpi_records_select', `CREATE POLICY "kpi_records_select" ON kpi_records FOR SELECT USING (kpi_id IN (SELECT id FROM kpis WHERE workspace_id = get_user_workspace_id(auth.uid()::text)))`)
  await exec('kpi_records_insert', `CREATE POLICY "kpi_records_insert" ON kpi_records FOR INSERT WITH CHECK (kpi_id IN (SELECT id FROM kpis WHERE workspace_id = get_user_workspace_id(auth.uid()::text)))`)
  await exec('kpi_records_update', `CREATE POLICY "kpi_records_update" ON kpi_records FOR UPDATE USING (kpi_id IN (SELECT id FROM kpis WHERE workspace_id = get_user_workspace_id(auth.uid()::text)))`)

  // ═══════════════════════════════════════════
  // KEY_RESULTS (via objectives)
  // ═══════════════════════════════════════════
  console.log('\n--- Key Results ---')
  await exec('kr_select', `CREATE POLICY "kr_select" ON key_results FOR SELECT USING (objective_id IN (SELECT id FROM objectives WHERE workspace_id = get_user_workspace_id(auth.uid()::text)))`)
  await exec('kr_insert', `CREATE POLICY "kr_insert" ON key_results FOR INSERT WITH CHECK (objective_id IN (SELECT id FROM objectives WHERE workspace_id = get_user_workspace_id(auth.uid()::text)))`)
  await exec('kr_update', `CREATE POLICY "kr_update" ON key_results FOR UPDATE USING (objective_id IN (SELECT id FROM objectives WHERE workspace_id = get_user_workspace_id(auth.uid()::text)))`)

  // ═══════════════════════════════════════════
  // MILESTONE_OBSERVATIONS (via milestones)
  // ═══════════════════════════════════════════
  console.log('\n--- Milestone Observations ---')
  await exec('mo_select', `CREATE POLICY "mo_select" ON milestone_observations FOR SELECT USING (milestone_id IN (SELECT id FROM project_milestones WHERE workspace_id = get_user_workspace_id(auth.uid()::text)))`)
  await exec('mo_insert', `CREATE POLICY "mo_insert" ON milestone_observations FOR INSERT WITH CHECK (milestone_id IN (SELECT id FROM project_milestones WHERE workspace_id = get_user_workspace_id(auth.uid()::text)))`)

  // ═══════════════════════════════════════════
  // NOTIFICATIONS
  // ═══════════════════════════════════════════
  console.log('\n--- Notifications ---')
  await exec('notif_select', `CREATE POLICY "notif_select" ON notifications FOR SELECT USING ("userId" = auth.uid()::text OR user_id = auth.uid()::text)`)
  await exec('notif_insert', `CREATE POLICY "notif_insert" ON notifications FOR INSERT WITH CHECK (true)`)
  await exec('notif_update', `CREATE POLICY "notif_update" ON notifications FOR UPDATE USING ("userId" = auth.uid()::text OR user_id = auth.uid()::text)`)

  // ═══════════════════════════════════════════
  // AI_CONVERSATIONS
  // ═══════════════════════════════════════════
  console.log('\n--- AI Conversations ---')
  await exec('ai_select', `CREATE POLICY "ai_select" ON ai_conversations FOR SELECT USING (workspace_id = get_user_workspace_id(auth.uid()::text))`)
  await exec('ai_insert', `CREATE POLICY "ai_insert" ON ai_conversations FOR INSERT WITH CHECK (workspace_id = get_user_workspace_id(auth.uid()::text))`)

  // ═══════════════════════════════════════════
  // BILLING_HISTORY
  // ═══════════════════════════════════════════
  console.log('\n--- Billing History ---')
  await exec('bh_select', `CREATE POLICY "bh_select" ON billing_history FOR SELECT USING (workspace_id = get_user_workspace_id(auth.uid()::text))`)
  await exec('bh_insert', `CREATE POLICY "bh_insert" ON billing_history FOR INSERT WITH CHECK (workspace_id = get_user_workspace_id(auth.uid()::text))`)

  // ═══════════════════════════════════════════
  // CLIENT_PORTAL_ACCESS
  // ═══════════════════════════════════════════
  console.log('\n--- Client Portal Access ---')
  await exec('cpa_select', `CREATE POLICY "cpa_select" ON client_portal_access FOR SELECT USING (workspace_id = get_user_workspace_id(auth.uid()::text))`)
  await exec('cpa_insert', `CREATE POLICY "cpa_insert" ON client_portal_access FOR INSERT WITH CHECK (workspace_id = get_user_workspace_id(auth.uid()::text))`)
  await exec('cpa_update', `CREATE POLICY "cpa_update" ON client_portal_access FOR UPDATE USING (workspace_id = get_user_workspace_id(auth.uid()::text))`)
  await exec('cpa_delete', `CREATE POLICY "cpa_delete" ON client_portal_access FOR DELETE USING (workspace_id = get_user_workspace_id(auth.uid()::text))`)

  // ═══════════════════════════════════════════
  // VERIFY
  // ═══════════════════════════════════════════
  console.log('\n═══════════════════════════════════════════')
  console.log('VERIFICACION')
  console.log('═══════════════════════════════════════════')

  const policyCount = await client.query(`
    SELECT tablename, COUNT(*) as cnt
    FROM pg_policies
    WHERE schemaname = 'public'
    GROUP BY tablename
    ORDER BY tablename
  `)
  let total = 0
  for (const row of policyCount.rows) {
    console.log(`  ${row.tablename}: ${row.cnt} policies`)
    total += parseInt(row.cnt)
  }
  console.log(`\n🎉 Total: ${total} RLS policies creadas`)

  await client.end()
}

run().catch(err => { console.error('Fatal:', err.message); process.exit(1) })
