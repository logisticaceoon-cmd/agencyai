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
    console.error(`❌ ${label}: ${err.message}`)
  }
}

async function run() {
  await client.connect()
  console.log('🔗 Conectado\n')

  // Fix workspace_members RLS - users should see their own membership
  console.log('--- Fixing workspace_members RLS ---')
  await exec('drop old wm_select', `DROP POLICY IF EXISTS "wm_select" ON workspace_members`)
  await exec('new wm_select', `CREATE POLICY "wm_select" ON workspace_members FOR SELECT USING (
    user_id = auth.uid()::text
    OR workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid()::text)
  )`)

  // Fix workspaces RLS - simplify
  console.log('\n--- Fixing workspaces RLS ---')
  await exec('drop old ws_select', `DROP POLICY IF EXISTS "ws_select" ON workspaces`)
  await exec('new ws_select', `CREATE POLICY "ws_select" ON workspaces FOR SELECT USING (
    owner_id = auth.uid()::text
    OR id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()::text)
  )`)

  // Fix notifications RLS - the table uses "userId" (Prisma camelCase) not "user_id"
  console.log('\n--- Fixing notifications RLS ---')
  await exec('drop old notif_select', `DROP POLICY IF EXISTS "notif_select" ON notifications`)
  await exec('drop old notif_update', `DROP POLICY IF EXISTS "notif_update" ON notifications`)
  await exec('new notif_select', `CREATE POLICY "notif_select" ON notifications FOR SELECT USING (
    "userId" = auth.uid()::text OR user_id = auth.uid()::text OR workspace_id IN (SELECT get_user_workspace_id(auth.uid()::text))
  )`)
  await exec('new notif_update', `CREATE POLICY "notif_update" ON notifications FOR UPDATE USING (
    "userId" = auth.uid()::text OR user_id = auth.uid()::text
  )`)

  // Verify
  console.log('\n--- Policies finales ---')
  const res = await client.query(`
    SELECT tablename, policyname FROM pg_policies
    WHERE schemaname = 'public' AND tablename IN ('workspaces', 'workspace_members', 'notifications')
    ORDER BY tablename, policyname
  `)
  for (const r of res.rows) {
    console.log(`  ${r.tablename}: ${r.policyname}`)
  }

  await client.end()
  console.log('\n🎉 RLS cycle fix completado')
}

run().catch(err => { console.error('Fatal:', err.message); process.exit(1) })
