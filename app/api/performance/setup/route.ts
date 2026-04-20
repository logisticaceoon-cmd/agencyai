import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Ruta de setup — crea las tablas de rendimiento si no existen
// Llamar UNA VEZ después del deploy: GET /api/performance/setup?secret=agencyai2026
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const secret = searchParams.get('secret')

  if (secret !== 'agencyai2026') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const migrations = [
    `CREATE TABLE IF NOT EXISTS performance_logs (
      id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
      workspace_id UUID NOT NULL,
      user_id TEXT NOT NULL,
      task_id UUID,
      client_id UUID,
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
    )`,
    `CREATE TABLE IF NOT EXISTS performance_reports (
      id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
      workspace_id UUID NOT NULL,
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
    )`,
    `CREATE INDEX IF NOT EXISTS idx_perf_logs_workspace ON performance_logs(workspace_id)`,
    `CREATE INDEX IF NOT EXISTS idx_perf_logs_user ON performance_logs(workspace_id, user_id)`,
    `CREATE INDEX IF NOT EXISTS idx_perf_logs_month ON performance_logs(workspace_id, month, year)`,
    `CREATE INDEX IF NOT EXISTS idx_perf_reports_workspace ON performance_reports(workspace_id)`,
    `CREATE INDEX IF NOT EXISTS idx_perf_reports_user ON performance_reports(workspace_id, user_id)`,
  ]

  const results = []

  for (const sql of migrations) {
    try {
      const { error } = await supabaseAdmin.rpc('exec_sql', { sql })
      if (error) {
        results.push({ sql: sql.slice(0, 50) + '...', status: 'skipped', note: error.message })
      } else {
        results.push({ sql: sql.slice(0, 50) + '...', status: 'ok' })
      }
    } catch {
      results.push({ sql: sql.slice(0, 50) + '...', status: 'skipped', note: 'rpc not available' })
    }
  }

  // Verify tables exist by querying them
  const { error: logsError } = await supabaseAdmin
    .from('performance_logs')
    .select('id')
    .limit(1)

  const { error: reportsError } = await supabaseAdmin
    .from('performance_reports')
    .select('id')
    .limit(1)

  return NextResponse.json({
    message: 'Setup completado',
    performance_logs: logsError ? `Error: ${logsError.message}` : 'OK - tabla existe',
    performance_reports: reportsError ? `Error: ${reportsError.message}` : 'OK - tabla existe',
    migration_results: results,
  })
}
