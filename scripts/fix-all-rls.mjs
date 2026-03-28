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
    if (err.message.includes('already exists')) {
      console.log(`⏭️  ${label} (ya existe)`)
    } else {
      console.error(`❌ ${label}: ${err.message}`)
    }
  }
}

async function run() {
  await client.connect()
  console.log('🔗 Conectado\n')

  // ═══════════════════════════════════════════
  // STEP 1: GRANTS - this is critical
  // ═══════════════════════════════════════════
  console.log('=== PASO 1: GRANTS ===')
  const grants = [
    'GRANT USAGE ON SCHEMA public TO anon',
    'GRANT USAGE ON SCHEMA public TO authenticated',
    'GRANT USAGE ON SCHEMA public TO service_role',
    'GRANT ALL ON ALL TABLES IN SCHEMA public TO anon',
    'GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated',
    'GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role',
    'GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon',
    'GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated',
    'GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role',
    'GRANT ALL ON ALL ROUTINES IN SCHEMA public TO anon',
    'GRANT ALL ON ALL ROUTINES IN SCHEMA public TO authenticated',
    'GRANT ALL ON ALL ROUTINES IN SCHEMA public TO service_role',
    'ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO anon',
    'ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO authenticated',
    'ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO service_role',
    'ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO anon',
    'ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO authenticated',
    'ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO service_role',
  ]
  for (const sql of grants) {
    await exec(sql.slice(0, 60), sql)
  }

  // ═══════════════════════════════════════════
  // STEP 2: DROP ALL existing RLS policies
  // ═══════════════════════════════════════════
  console.log('\n=== PASO 2: LIMPIAR POLICIES EXISTENTES ===')
  const { rows: allPolicies } = await client.query(`
    SELECT schemaname, tablename, policyname
    FROM pg_policies WHERE schemaname = 'public'
  `)
  console.log(`  Encontradas ${allPolicies.length} policies`)
  for (const p of allPolicies) {
    await exec(`drop ${p.tablename}.${p.policyname}`, `DROP POLICY IF EXISTS "${p.policyname}" ON "${p.tablename}"`)
  }

  // ═══════════════════════════════════════════
  // STEP 3: RECREATE all RLS policies - CLEAN
  // ═══════════════════════════════════════════
  console.log('\n=== PASO 3: CREAR POLICIES NUEVAS ===')

  // WORKSPACES
  await exec('ws_select', `CREATE POLICY "ws_select" ON workspaces FOR SELECT USING (
    owner_id = auth.uid()::text
    OR id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()::text)
  )`)
  await exec('ws_insert', `CREATE POLICY "ws_insert" ON workspaces FOR INSERT WITH CHECK (
    owner_id = auth.uid()::text
  )`)
  await exec('ws_update', `CREATE POLICY "ws_update" ON workspaces FOR UPDATE USING (
    owner_id = auth.uid()::text
  )`)

  // WORKSPACE_MEMBERS
  await exec('wm_select', `CREATE POLICY "wm_select" ON workspace_members FOR SELECT USING (
    user_id = auth.uid()::text
    OR workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid()::text)
  )`)
  await exec('wm_insert', `CREATE POLICY "wm_insert" ON workspace_members FOR INSERT WITH CHECK (
    user_id = auth.uid()::text
    OR workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid()::text)
  )`)
  await exec('wm_update', `CREATE POLICY "wm_update" ON workspace_members FOR UPDATE USING (
    workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid()::text)
  )`)
  await exec('wm_delete', `CREATE POLICY "wm_delete" ON workspace_members FOR DELETE USING (
    workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid()::text)
  )`)

  // ALL WORKSPACE-SCOPED TABLES: simple pattern
  // user's workspace = from workspace_members OR from owned workspaces
  const wsTables = [
    'clients', 'projects', 'tasks', 'reports', 'minutes',
    'transactions', 'invoices', 'expense_categories',
    'kpis', 'objectives', 'project_milestones',
    'ai_conversations', 'billing_history', 'client_portal_access',
  ]

  for (const t of wsTables) {
    // Check if table has workspace_id column
    const { rows } = await client.query(`
      SELECT 1 FROM information_schema.columns
      WHERE table_name = $1 AND column_name = 'workspace_id' AND table_schema = 'public'
    `, [t])

    if (rows.length === 0) {
      console.log(`  ⏭️  ${t} - no tiene workspace_id, skip`)
      continue
    }

    const wsCheck = `workspace_id IN (
      SELECT id FROM workspaces WHERE owner_id = auth.uid()::text
      UNION
      SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()::text
    )`

    await exec(`${t}_select`, `CREATE POLICY "${t}_sel" ON ${t} FOR SELECT USING (${wsCheck})`)
    await exec(`${t}_insert`, `CREATE POLICY "${t}_ins" ON ${t} FOR INSERT WITH CHECK (${wsCheck})`)
    await exec(`${t}_update`, `CREATE POLICY "${t}_upd" ON ${t} FOR UPDATE USING (${wsCheck})`)
    await exec(`${t}_delete`, `CREATE POLICY "${t}_del" ON ${t} FOR DELETE USING (${wsCheck})`)
  }

  // KPI_RECORDS - via kpis.workspace_id
  const kpiWsCheck = `kpi_id::text IN (SELECT id FROM kpis WHERE workspace_id IN (
    SELECT id FROM workspaces WHERE owner_id = auth.uid()::text
    UNION SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()::text
  ))`
  await exec('kpi_records_sel', `CREATE POLICY "kpi_records_sel" ON kpi_records FOR SELECT USING (${kpiWsCheck})`)
  await exec('kpi_records_ins', `CREATE POLICY "kpi_records_ins" ON kpi_records FOR INSERT WITH CHECK (${kpiWsCheck})`)
  await exec('kpi_records_upd', `CREATE POLICY "kpi_records_upd" ON kpi_records FOR UPDATE USING (${kpiWsCheck})`)

  // KEY_RESULTS - via objectives.workspace_id
  const krWsCheck = `objective_id::text IN (SELECT id FROM objectives WHERE workspace_id IN (
    SELECT id FROM workspaces WHERE owner_id = auth.uid()::text
    UNION SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()::text
  ))`
  await exec('kr_sel', `CREATE POLICY "kr_sel" ON key_results FOR SELECT USING (${krWsCheck})`)
  await exec('kr_ins', `CREATE POLICY "kr_ins" ON key_results FOR INSERT WITH CHECK (${krWsCheck})`)
  await exec('kr_upd', `CREATE POLICY "kr_upd" ON key_results FOR UPDATE USING (${krWsCheck})`)

  // MILESTONE_OBSERVATIONS - via project_milestones.workspace_id
  await exec('mo_sel', `CREATE POLICY "mo_sel" ON milestone_observations FOR SELECT USING (
    milestone_id IN (SELECT id FROM project_milestones WHERE workspace_id IN (
      SELECT id FROM workspaces WHERE owner_id = auth.uid()::text
      UNION SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()::text
    ))
  )`)
  await exec('mo_ins', `CREATE POLICY "mo_ins" ON milestone_observations FOR INSERT WITH CHECK (
    milestone_id IN (SELECT id FROM project_milestones WHERE workspace_id IN (
      SELECT id FROM workspaces WHERE owner_id = auth.uid()::text
      UNION SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()::text
    ))
  )`)

  // NOTIFICATIONS - user sees own notifications
  await exec('notif_sel', `CREATE POLICY "notif_sel" ON notifications FOR SELECT USING (
    "userId" = auth.uid()::text OR user_id = auth.uid()::text
  )`)
  await exec('notif_ins', `CREATE POLICY "notif_ins" ON notifications FOR INSERT WITH CHECK (true)`)
  await exec('notif_upd', `CREATE POLICY "notif_upd" ON notifications FOR UPDATE USING (
    "userId" = auth.uid()::text OR user_id = auth.uid()::text
  )`)

  // ═══════════════════════════════════════════
  // STEP 4: VERIFY
  // ═══════════════════════════════════════════
  console.log('\n=== VERIFICACION ===')
  const { rows: finalPolicies } = await client.query(`
    SELECT tablename, COUNT(*) as cnt
    FROM pg_policies WHERE schemaname = 'public'
    GROUP BY tablename ORDER BY tablename
  `)
  let total = 0
  for (const r of finalPolicies) {
    console.log(`  ${r.tablename}: ${r.cnt} policies`)
    total += parseInt(r.cnt)
  }
  console.log(`\n🎉 Total: ${total} RLS policies activas`)

  await client.end()
}

run().catch(err => { console.error('Fatal:', err.message); process.exit(1) })
