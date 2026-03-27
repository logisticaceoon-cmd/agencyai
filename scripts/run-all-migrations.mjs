import pg from 'pg'
import { readFileSync } from 'fs'
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
    // Ignore "already exists" errors
    if (err.message.includes('already exists') || err.message.includes('duplicate')) {
      console.log(`⏭️  ${label} (ya existe, omitido)`)
    } else {
      console.error(`❌ ${label}: ${err.message}`)
    }
  }
}

async function run() {
  await client.connect()
  console.log('🔗 Conectado a Supabase PostgreSQL\n')

  // ═══════════════════════════════════════════════════
  // STEP 1: Create workspaces + workspace_members
  // ═══════════════════════════════════════════════════
  console.log('--- PASO 1: Tablas base (workspaces) ---')

  await exec('workspaces', `
    CREATE TABLE IF NOT EXISTS workspaces (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name TEXT NOT NULL,
      slug TEXT UNIQUE,
      logo_url TEXT,
      currency TEXT DEFAULT 'USD',
      timezone TEXT DEFAULT 'America/Argentina/Buenos_Aires',
      agency_type TEXT DEFAULT 'marketing',
      plan TEXT DEFAULT 'free',
      owner_id TEXT NOT NULL,
      created_at TIMESTAMPTZ DEFAULT now(),
      updated_at TIMESTAMPTZ DEFAULT now()
    )
  `)

  await exec('workspace_members', `
    CREATE TABLE IF NOT EXISTS workspace_members (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
      user_id TEXT NOT NULL,
      role TEXT DEFAULT 'member',
      email TEXT,
      name TEXT,
      avatar_url TEXT,
      status TEXT DEFAULT 'active',
      created_at TIMESTAMPTZ DEFAULT now()
    )
  `)

  await exec('RLS workspaces', `ALTER TABLE workspaces ENABLE ROW LEVEL SECURITY`)
  await exec('RLS workspace_members', `ALTER TABLE workspace_members ENABLE ROW LEVEL SECURITY`)

  // ═══════════════════════════════════════════════════
  // STEP 2: Add workspace_id to existing tables
  // ═══════════════════════════════════════════════════
  console.log('\n--- PASO 2: Agregar workspace_id a tablas existentes ---')

  const tablesNeedingWsId = ['clients', 'projects', 'tasks', 'reports', 'kpis', 'objectives']
  for (const t of tablesNeedingWsId) {
    await exec(`${t}.workspace_id`, `ALTER TABLE ${t} ADD COLUMN IF NOT EXISTS workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE`)
  }

  // Add other missing columns to existing tables
  await exec('clients.deleted_at', `ALTER TABLE clients ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ`)
  await exec('projects.deleted_at', `ALTER TABLE projects ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ`)
  await exec('projects.color', `ALTER TABLE projects ADD COLUMN IF NOT EXISTS color TEXT DEFAULT '#2563eb'`)
  await exec('projects.budget', `ALTER TABLE projects ADD COLUMN IF NOT EXISTS budget NUMERIC`)
  await exec('projects.budget_spent', `ALTER TABLE projects ADD COLUMN IF NOT EXISTS budget_spent NUMERIC DEFAULT 0`)
  await exec('projects.owner_id', `ALTER TABLE projects ADD COLUMN IF NOT EXISTS owner_id TEXT`)
  await exec('tasks.deleted_at', `ALTER TABLE tasks ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ`)
  await exec('tasks.tags', `ALTER TABLE tasks ADD COLUMN IF NOT EXISTS tags TEXT[]`)
  await exec('tasks.position', `ALTER TABLE tasks ADD COLUMN IF NOT EXISTS position INTEGER DEFAULT 0`)
  await exec('tasks.assignee_id', `ALTER TABLE tasks ADD COLUMN IF NOT EXISTS assignee_id TEXT`)
  await exec('tasks.parent_task_id', `ALTER TABLE tasks ADD COLUMN IF NOT EXISTS parent_task_id UUID`)
  await exec('reports.workspace_id', `ALTER TABLE reports ADD COLUMN IF NOT EXISTS workspace_id UUID`)
  await exec('reports.created_by', `ALTER TABLE reports ADD COLUMN IF NOT EXISTS created_by TEXT`)

  // ═══════════════════════════════════════════════════
  // STEP 3: Create missing tables from 001
  // ═══════════════════════════════════════════════════
  console.log('\n--- PASO 3: Tablas nuevas (transactions, minutes) ---')

  await exec('transactions', `
    CREATE TABLE IF NOT EXISTS transactions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
      client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
      project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
      type TEXT NOT NULL,
      amount NUMERIC NOT NULL,
      currency TEXT DEFAULT 'USD',
      category TEXT,
      description TEXT,
      date DATE DEFAULT CURRENT_DATE,
      created_at TIMESTAMPTZ DEFAULT now()
    )
  `)

  await exec('minutes', `
    CREATE TABLE IF NOT EXISTS minutes (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
      client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
      project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
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

  await exec('RLS transactions', `ALTER TABLE transactions ENABLE ROW LEVEL SECURITY`)
  await exec('RLS minutes', `ALTER TABLE minutes ENABLE ROW LEVEL SECURITY`)

  // ═══════════════════════════════════════════════════
  // STEP 4: Migration 002 - client fields
  // ═══════════════════════════════════════════════════
  console.log('\n--- PASO 4: Migracion 002 - campos cliente ---')
  await exec('clients.pays_percentage', `ALTER TABLE clients ADD COLUMN IF NOT EXISTS pays_percentage BOOLEAN DEFAULT false`)
  await exec('clients.percentage_value', `ALTER TABLE clients ADD COLUMN IF NOT EXISTS percentage_value NUMERIC DEFAULT 0`)

  // ═══════════════════════════════════════════════════
  // STEP 5: Migration 003 - milestones + notifications
  // ═══════════════════════════════════════════════════
  console.log('\n--- PASO 5: Migracion 003 - milestones ---')

  await exec('project_milestones', `
    CREATE TABLE IF NOT EXISTS project_milestones (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
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

  await exec('milestone_observations', `
    CREATE TABLE IF NOT EXISTS milestone_observations (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      milestone_id UUID REFERENCES project_milestones(id) ON DELETE CASCADE,
      content TEXT NOT NULL,
      created_by TEXT,
      created_at TIMESTAMPTZ DEFAULT now()
    )
  `)

  // notifications already exists from Prisma but may need additional columns
  await exec('notifications.link', `ALTER TABLE notifications ADD COLUMN IF NOT EXISTS link TEXT`)
  await exec('notifications.read', `ALTER TABLE notifications ADD COLUMN IF NOT EXISTS read BOOLEAN DEFAULT false`)

  await exec('RLS project_milestones', `ALTER TABLE project_milestones ENABLE ROW LEVEL SECURITY`)
  await exec('RLS milestone_observations', `ALTER TABLE milestone_observations ENABLE ROW LEVEL SECURITY`)

  // ═══════════════════════════════════════════════════
  // STEP 6: Migration 004 - finances (invoices, expense_categories)
  // ═══════════════════════════════════════════════════
  console.log('\n--- PASO 6: Migracion 004 - finanzas ---')

  await exec('invoices', `
    CREATE TABLE IF NOT EXISTS invoices (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
      client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
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

  await exec('expense_categories', `
    CREATE TABLE IF NOT EXISTS expense_categories (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      color TEXT DEFAULT '#6b7280',
      icon TEXT DEFAULT 'tag',
      created_at TIMESTAMPTZ DEFAULT now()
    )
  `)

  await exec('transactions.invoice_id', `ALTER TABLE transactions ADD COLUMN IF NOT EXISTS invoice_id UUID REFERENCES invoices(id) ON DELETE SET NULL`)
  await exec('RLS invoices', `ALTER TABLE invoices ENABLE ROW LEVEL SECURITY`)
  await exec('RLS expense_categories', `ALTER TABLE expense_categories ENABLE ROW LEVEL SECURITY`)

  // ═══════════════════════════════════════════════════
  // STEP 7: Migration 005 - KPIs tables
  // ═══════════════════════════════════════════════════
  console.log('\n--- PASO 7: Migracion 005 - KPIs ---')

  // kpis table already exists, add missing columns
  await exec('kpis.client_id', `ALTER TABLE kpis ADD COLUMN IF NOT EXISTS client_id UUID`)
  await exec('kpis.unit', `ALTER TABLE kpis ADD COLUMN IF NOT EXISTS unit TEXT DEFAULT 'número'`)
  await exec('kpis.target_value', `ALTER TABLE kpis ADD COLUMN IF NOT EXISTS target_value NUMERIC`)
  await exec('kpis.current_value', `ALTER TABLE kpis ADD COLUMN IF NOT EXISTS current_value NUMERIC DEFAULT 0`)
  await exec('kpis.frequency', `ALTER TABLE kpis ADD COLUMN IF NOT EXISTS frequency TEXT DEFAULT 'monthly'`)
  await exec('kpis.category', `ALTER TABLE kpis ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'performance'`)
  await exec('kpis.color', `ALTER TABLE kpis ADD COLUMN IF NOT EXISTS color TEXT DEFAULT '#2563eb'`)

  await exec('kpi_records', `
    CREATE TABLE IF NOT EXISTS kpi_records (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      kpi_id UUID REFERENCES kpis(id) ON DELETE CASCADE,
      value NUMERIC NOT NULL,
      period_start DATE,
      period_end DATE,
      notes TEXT,
      recorded_at TIMESTAMPTZ DEFAULT now()
    )
  `)

  await exec('RLS kpis', `ALTER TABLE kpis ENABLE ROW LEVEL SECURITY`)
  await exec('RLS kpi_records', `ALTER TABLE kpi_records ENABLE ROW LEVEL SECURITY`)

  // ═══════════════════════════════════════════════════
  // STEP 8: Migration 006 - objectives
  // ═══════════════════════════════════════════════════
  console.log('\n--- PASO 8: Migracion 006 - objectives ---')

  // objectives table already exists, add missing columns
  await exec('objectives.client_id', `ALTER TABLE objectives ADD COLUMN IF NOT EXISTS client_id UUID`)
  await exec('objectives.quarter', `ALTER TABLE objectives ADD COLUMN IF NOT EXISTS quarter TEXT`)
  await exec('objectives.year', `ALTER TABLE objectives ADD COLUMN IF NOT EXISTS year INTEGER DEFAULT EXTRACT(YEAR FROM now())`)
  await exec('objectives.type', `ALTER TABLE objectives ADD COLUMN IF NOT EXISTS type TEXT DEFAULT 'agency'`)
  await exec('objectives.owner_id', `ALTER TABLE objectives ADD COLUMN IF NOT EXISTS owner_id TEXT`)

  await exec('key_results', `
    CREATE TABLE IF NOT EXISTS key_results (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      objective_id UUID REFERENCES objectives(id) ON DELETE CASCADE,
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

  await exec('RLS objectives', `ALTER TABLE objectives ENABLE ROW LEVEL SECURITY`)
  await exec('RLS key_results', `ALTER TABLE key_results ENABLE ROW LEVEL SECURITY`)

  // ═══════════════════════════════════════════════════
  // STEP 9: Migration 007 - AI (already done)
  // ═══════════════════════════════════════════════════
  console.log('\n--- PASO 9: Migracion 007 - AI (ya existe) ---')
  console.log('⏭️  ai_conversations ya existe')

  // ═══════════════════════════════════════════════════
  // STEP 10: Migration 008 - billing
  // ═══════════════════════════════════════════════════
  console.log('\n--- PASO 10: Migracion 008 - billing ---')

  await exec('workspaces.stripe_customer_id', `ALTER TABLE workspaces ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT`)
  await exec('workspaces.plan_expires_at', `ALTER TABLE workspaces ADD COLUMN IF NOT EXISTS plan_expires_at TIMESTAMPTZ`)

  await exec('billing_history', `
    CREATE TABLE IF NOT EXISTS billing_history (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      workspace_id UUID REFERENCES workspaces(id),
      amount NUMERIC,
      currency TEXT DEFAULT 'usd',
      status TEXT,
      stripe_invoice_id TEXT,
      period_start TIMESTAMPTZ,
      period_end TIMESTAMPTZ,
      created_at TIMESTAMPTZ DEFAULT now()
    )
  `)

  await exec('RLS billing_history', `ALTER TABLE billing_history ENABLE ROW LEVEL SECURITY`)

  // ═══════════════════════════════════════════════════
  // STEP 11: Migration 009 - client portal
  // ═══════════════════════════════════════════════════
  console.log('\n--- PASO 11: Migracion 009 - portal cliente ---')

  await exec('client_portal_access', `
    CREATE TABLE IF NOT EXISTS client_portal_access (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
      client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
      email TEXT NOT NULL,
      access_token TEXT UNIQUE DEFAULT gen_random_uuid()::text,
      permissions JSONB DEFAULT '{"projects": true, "reports": true, "invoices": false}',
      last_access TIMESTAMPTZ,
      created_at TIMESTAMPTZ DEFAULT now()
    )
  `)

  await exec('RLS client_portal_access', `ALTER TABLE client_portal_access ENABLE ROW LEVEL SECURITY`)

  // ═══════════════════════════════════════════════════
  // STEP 12: Create indices
  // ═══════════════════════════════════════════════════
  console.log('\n--- PASO 12: Indices ---')

  const indices = [
    'CREATE INDEX IF NOT EXISTS idx_clients_workspace ON clients(workspace_id)',
    'CREATE INDEX IF NOT EXISTS idx_projects_workspace ON projects(workspace_id)',
    'CREATE INDEX IF NOT EXISTS idx_projects_client ON projects(client_id)',
    'CREATE INDEX IF NOT EXISTS idx_tasks_workspace ON tasks(workspace_id)',
    'CREATE INDEX IF NOT EXISTS idx_tasks_project ON tasks(project_id)',
    'CREATE INDEX IF NOT EXISTS idx_transactions_workspace ON transactions(workspace_id)',
    'CREATE INDEX IF NOT EXISTS idx_invoices_workspace ON invoices(workspace_id)',
    'CREATE INDEX IF NOT EXISTS idx_invoices_client ON invoices(client_id)',
    'CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status)',
    'CREATE INDEX IF NOT EXISTS idx_expense_categories_workspace ON expense_categories(workspace_id)',
    'CREATE INDEX IF NOT EXISTS idx_kpis_workspace ON kpis(workspace_id)',
    'CREATE INDEX IF NOT EXISTS idx_kpis_client ON kpis(client_id)',
    'CREATE INDEX IF NOT EXISTS idx_kpi_records_kpi ON kpi_records(kpi_id)',
    'CREATE INDEX IF NOT EXISTS idx_objectives_workspace ON objectives(workspace_id)',
    'CREATE INDEX IF NOT EXISTS idx_objectives_quarter ON objectives(quarter, year)',
    'CREATE INDEX IF NOT EXISTS idx_key_results_objective ON key_results(objective_id)',
    'CREATE INDEX IF NOT EXISTS idx_ai_conversations_workspace ON ai_conversations(workspace_id)',
    'CREATE INDEX IF NOT EXISTS idx_billing_history_workspace ON billing_history(workspace_id)',
    'CREATE INDEX IF NOT EXISTS idx_client_portal_access_token ON client_portal_access(access_token)',
    'CREATE INDEX IF NOT EXISTS idx_client_portal_access_client ON client_portal_access(client_id)',
    'CREATE INDEX IF NOT EXISTS idx_milestones_project ON project_milestones(project_id)',
    'CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id)',
  ]

  for (const idx of indices) {
    const name = idx.match(/idx_\w+/)?.[0] || idx.slice(0, 50)
    await exec(name, idx)
  }

  // ═══════════════════════════════════════════════════
  // STEP 13: Verify all tables
  // ═══════════════════════════════════════════════════
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

  console.log(allOk ? '\n🎉 TODAS LAS MIGRACIONES COMPLETADAS EXITOSAMENTE' : '\n⚠️  Algunas tablas tienen errores')

  await client.end()
}

run().catch(err => {
  console.error('Error fatal:', err.message)
  process.exit(1)
})
