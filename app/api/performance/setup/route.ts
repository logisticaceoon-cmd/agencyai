import { NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// Ruta de setup — crea las tablas de rendimiento si no existen
// Se llama automáticamente en el primer acceso al módulo de rendimiento
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const secret = searchParams.get('secret')

  if (secret !== 'agencyai2026') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const results: { step: string; status: string; note?: string }[] = []

  try {
    // Crear tabla performance_logs
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS performance_logs (
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
      )
    `)
    results.push({ step: 'CREATE performance_logs', status: 'ok' })
  } catch (e: unknown) {
    results.push({ step: 'CREATE performance_logs', status: 'error', note: String(e) })
  }

  try {
    // Crear tabla performance_reports
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS performance_reports (
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
      )
    `)
    results.push({ step: 'CREATE performance_reports', status: 'ok' })
  } catch (e: unknown) {
    results.push({ step: 'CREATE performance_reports', status: 'error', note: String(e) })
  }

  // Crear índices
  const indexes = [
    'CREATE INDEX IF NOT EXISTS idx_perf_logs_workspace ON performance_logs(workspace_id)',
    'CREATE INDEX IF NOT EXISTS idx_perf_logs_user ON performance_logs(workspace_id, user_id)',
    'CREATE INDEX IF NOT EXISTS idx_perf_logs_month ON performance_logs(workspace_id, month, year)',
    'CREATE INDEX IF NOT EXISTS idx_perf_reports_workspace ON performance_reports(workspace_id)',
    'CREATE INDEX IF NOT EXISTS idx_perf_reports_user ON performance_reports(workspace_id, user_id)',
  ]

  for (const idx of indexes) {
    try {
      await prisma.$executeRawUnsafe(idx)
      results.push({ step: idx.slice(0, 60), status: 'ok' })
    } catch (e: unknown) {
      results.push({ step: idx.slice(0, 60), status: 'skipped', note: String(e).slice(0, 100) })
    }
  }

  await prisma.$disconnect()

  // Verificar que las tablas existen
  let logsOk = false
  let reportsOk = false
  try {
    await prisma.$executeRawUnsafe('SELECT 1 FROM performance_logs LIMIT 1')
    logsOk = true
  } catch {}
  try {
    await prisma.$executeRawUnsafe('SELECT 1 FROM performance_reports LIMIT 1')
    reportsOk = true
  } catch {}

  return NextResponse.json({
    message: 'Setup completado',
    performance_logs: logsOk ? '✅ Tabla existe' : '❌ No encontrada',
    performance_reports: reportsOk ? '✅ Tabla existe' : '❌ No encontrada',
    steps: results,
  })
}
