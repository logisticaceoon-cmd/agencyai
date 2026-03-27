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

  // The existing Prisma tables use TEXT ids and camelCase columns.
  // New tables need to reference TEXT ids, not UUID.
  // Tables that are brand new can use UUID ids internally but TEXT for FKs to Prisma tables.

  // ═══════════════════════════════════════════
  // transactions (references clients.id TEXT, projects.id TEXT)
  // ═══════════════════════════════════════════
  console.log('--- Transactions ---')
  await exec('transactions', `
    CREATE TABLE IF NOT EXISTS transactions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      workspace_id UUID,
      client_id TEXT,
      project_id TEXT,
      type TEXT NOT NULL,
      amount NUMERIC NOT NULL,
      currency TEXT DEFAULT 'USD',
      category TEXT,
      description TEXT,
      date DATE DEFAULT CURRENT_DATE,
      invoice_id UUID,
      created_at TIMESTAMPTZ DEFAULT now()
    )
  `)
  await exec('RLS transactions', 'ALTER TABLE transactions ENABLE ROW LEVEL SECURITY')
  await exec('idx_transactions_workspace', 'CREATE INDEX IF NOT EXISTS idx_transactions_workspace ON transactions(workspace_id)')

  // ═══════════════════════════════════════════
  // minutes
  // ═══════════════════════════════════════════
  console.log('\n--- Minutes ---')
  await exec('minutes', `
    CREATE TABLE IF NOT EXISTS minutes (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      workspace_id UUID,
      client_id TEXT,
      project_id TEXT,
      title TEXT NOT NULL,
      meeting_date TIMESTAMPTZ,
      participants TEXT[],
      meeting_type TEXT DEFAULT 'followup',
      agenda JSONB DEFAULT '[]',
      discussion_points TEXT,
      decisions JSONB DEFAULT '[]',
      action_items JSONB DEFAULT '[]',
      status TEXT DEFAULT 'draft',
      created_by TEXT,
      created_at TIMESTAMPTZ DEFAULT now(),
      updated_at TIMESTAMPTZ DEFAULT now()
    )
  `)
  await exec('RLS minutes', 'ALTER TABLE minutes ENABLE ROW LEVEL SECURITY')

  // ═══════════════════════════════════════════
  // invoices (client_id TEXT to match Prisma clients)
  // ═══════════════════════════════════════════
  console.log('\n--- Invoices ---')
  await exec('invoices', `
    CREATE TABLE IF NOT EXISTS invoices (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      workspace_id UUID,
      client_id TEXT,
      number TEXT NOT NULL,
      status TEXT DEFAULT 'draft',
      subtotal NUMERIC DEFAULT 0,
      tax_rate NUMERIC DEFAULT 0,
      tax_amount NUMERIC DEFAULT 0,
      total NUMERIC DEFAULT 0,
      currency TEXT DEFAULT 'USD',
      issue_date DATE DEFAULT CURRENT_DATE,
      due_date DATE,
      items JSONB DEFAULT '[]',
      notes TEXT,
      paid_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ DEFAULT now()
    )
  `)
  await exec('RLS invoices', 'ALTER TABLE invoices ENABLE ROW LEVEL SECURITY')
  await exec('idx_invoices_workspace', 'CREATE INDEX IF NOT EXISTS idx_invoices_workspace ON invoices(workspace_id)')
  await exec('idx_invoices_client', 'CREATE INDEX IF NOT EXISTS idx_invoices_client ON invoices(client_id)')
  await exec('idx_invoices_status', 'CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status)')

  // ═══════════════════════════════════════════
  // project_milestones (project_id TEXT)
  // ═══════════════════════════════════════════
  console.log('\n--- Project Milestones ---')
  await exec('project_milestones', `
    CREATE TABLE IF NOT EXISTS project_milestones (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      project_id TEXT,
      workspace_id UUID,
      title TEXT NOT NULL,
      description TEXT,
      due_date DATE,
      completed BOOLEAN DEFAULT false,
      completed_at TIMESTAMPTZ,
      position INTEGER DEFAULT 0,
      created_at TIMESTAMPTZ DEFAULT now()
    )
  `)
  await exec('RLS project_milestones', 'ALTER TABLE project_milestones ENABLE ROW LEVEL SECURITY')
  await exec('idx_milestones_project', 'CREATE INDEX IF NOT EXISTS idx_milestones_project ON project_milestones(project_id)')
  await exec('idx_milestones_workspace', 'CREATE INDEX IF NOT EXISTS idx_milestones_workspace ON project_milestones(workspace_id)')

  // ═══════════════════════════════════════════
  // milestone_observations
  // ═══════════════════════════════════════════
  console.log('\n--- Milestone Observations ---')
  await exec('milestone_observations', `
    CREATE TABLE IF NOT EXISTS milestone_observations (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      milestone_id UUID REFERENCES project_milestones(id) ON DELETE CASCADE,
      content TEXT NOT NULL,
      created_by TEXT,
      created_at TIMESTAMPTZ DEFAULT now()
    )
  `)
  await exec('RLS milestone_observations', 'ALTER TABLE milestone_observations ENABLE ROW LEVEL SECURITY')

  // ═══════════════════════════════════════════
  // kpi_records (kpi_id TEXT to match kpis.id TEXT)
  // ═══════════════════════════════════════════
  console.log('\n--- KPI Records ---')
  await exec('kpi_records', `
    CREATE TABLE IF NOT EXISTS kpi_records (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      kpi_id TEXT,
      value NUMERIC NOT NULL,
      period_start DATE,
      period_end DATE,
      notes TEXT,
      recorded_at TIMESTAMPTZ DEFAULT now()
    )
  `)
  await exec('RLS kpi_records', 'ALTER TABLE kpi_records ENABLE ROW LEVEL SECURITY')
  await exec('idx_kpi_records_kpi', 'CREATE INDEX IF NOT EXISTS idx_kpi_records_kpi ON kpi_records(kpi_id)')

  // ═══════════════════════════════════════════
  // key_results (objective_id TEXT to match objectives.id TEXT)
  // ═══════════════════════════════════════════
  console.log('\n--- Key Results ---')
  await exec('key_results', `
    CREATE TABLE IF NOT EXISTS key_results (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      objective_id TEXT,
      title TEXT NOT NULL,
      description TEXT,
      metric_type TEXT DEFAULT 'percentage',
      start_value NUMERIC DEFAULT 0,
      target_value NUMERIC NOT NULL,
      current_value NUMERIC DEFAULT 0,
      unit TEXT,
      due_date DATE,
      status TEXT DEFAULT 'active',
      created_at TIMESTAMPTZ DEFAULT now()
    )
  `)
  await exec('RLS key_results', 'ALTER TABLE key_results ENABLE ROW LEVEL SECURITY')
  await exec('idx_key_results_objective', 'CREATE INDEX IF NOT EXISTS idx_key_results_objective ON key_results(objective_id)')

  // ═══════════════════════════════════════════
  // client_portal_access (client_id TEXT)
  // ═══════════════════════════════════════════
  console.log('\n--- Client Portal Access ---')
  await exec('client_portal_access', `
    CREATE TABLE IF NOT EXISTS client_portal_access (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      workspace_id UUID,
      client_id TEXT,
      email TEXT NOT NULL,
      access_token TEXT UNIQUE DEFAULT gen_random_uuid()::text,
      permissions JSONB DEFAULT '{"projects": true, "reports": true, "invoices": false}',
      last_access TIMESTAMPTZ,
      created_at TIMESTAMPTZ DEFAULT now()
    )
  `)
  await exec('RLS client_portal_access', 'ALTER TABLE client_portal_access ENABLE ROW LEVEL SECURITY')
  await exec('idx_portal_token', 'CREATE INDEX IF NOT EXISTS idx_client_portal_access_token ON client_portal_access(access_token)')
  await exec('idx_portal_client', 'CREATE INDEX IF NOT EXISTS idx_client_portal_access_client ON client_portal_access(client_id)')

  // ═══════════════════════════════════════════
  // Add workspace_id to notifications if missing
  // ═══════════════════════════════════════════
  console.log('\n--- Notifications fix ---')
  await exec('notifications.workspace_id', 'ALTER TABLE notifications ADD COLUMN IF NOT EXISTS workspace_id UUID')
  await exec('notifications.user_id', 'ALTER TABLE notifications ADD COLUMN IF NOT EXISTS user_id TEXT')

  // ═══════════════════════════════════════════
  // VERIFY ALL
  // ═══════════════════════════════════════════
  console.log('\n═══════════════════════════════════════════')
  console.log('VERIFICACION FINAL')
  console.log('═══════════════════════════════════════════')

  const tables = [
    'workspaces', 'workspace_members', 'transactions', 'minutes',
    'invoices', 'expense_categories', 'kpis', 'kpi_records',
    'objectives', 'key_results', 'ai_conversations',
    'billing_history', 'client_portal_access',
    'project_milestones', 'milestone_observations',
  ]

  let allOk = true
  for (const table of tables) {
    try {
      const res = await client.query(`SELECT COUNT(*) FROM ${table}`)
      console.log(`✅ ${table} — OK (${res.rows[0].count} filas)`)
    } catch (err) {
      console.error(`❌ ${table} — ERROR: ${err.message}`)
      allOk = false
    }
  }

  console.log(allOk ? '\n🎉 TODAS LAS TABLAS CREADAS EXITOSAMENTE' : '\n⚠️  Algunas tablas tienen errores')
  await client.end()
}

run().catch(err => { console.error('Fatal:', err.message); process.exit(1) })
