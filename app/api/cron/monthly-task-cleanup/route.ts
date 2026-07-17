import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(request: Request) {
  // Seguridad básica: verificar header de Vercel Cron
  const authHeader = request.headers.get('authorization')
  const isVercelCron = request.headers.get('x-vercel-cron') === '1'
  const isManual = authHeader === `Bearer ${process.env.CRON_SECRET || 'ceoon-cron-2026'}`

  if (!isVercelCron && !isManual) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const now = new Date()
    // Mes que cerró = mes anterior
    const prevMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999)
    const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const monthLabel = prevMonthStart.toLocaleString('es', { month: 'long', year: 'numeric' })

    const from = prevMonthStart.toISOString()
    const to = prevMonthEnd.toISOString()

    // 1. Obtener todas las tareas completadas del mes anterior (en cualquier workspace)
    const { data: completedTasks, error } = await supabase
      .from('tasks')
      .select('id, title, workspace_id, assignedTo, assignee_id, createdById, deadline, updatedAt, createdAt, priority')
      .eq('status', 'completed')
      .gte('updatedAt', from)
      .lte('updatedAt', to)
      .is('deleted_at', null)

    if (error) {
      console.error('Error fetching completed tasks:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const tasks = completedTasks || []

    if (tasks.length === 0) {
      return NextResponse.json({
        success: true,
        month: monthLabel,
        message: 'No hay tareas completadas para archivar.',
        archived: 0,
      })
    }

    // 2. Soft-delete todas las tareas completadas del mes anterior
    //    El módulo Rendimiento YA NO filtra por deleted_at para completadas
    //    por lo que los datos históricos se preservan en los reportes
    const ids = tasks.map(t => t.id)
    const archivedAt = new Date().toISOString()

    // Procesar en lotes de 50 para evitar timeouts
    let archived = 0
    const batchSize = 50
    for (let i = 0; i < ids.length; i += batchSize) {
      const batch = ids.slice(i, i + batchSize)
      const { error: deleteError } = await supabase
        .from('tasks')
        .update({ deleted_at: archivedAt })
        .in('id', batch)

      if (!deleteError) archived += batch.length
    }

    // 3. Log del cleanup en activity_log para auditoría
    await supabase.from('activity_log').insert({
      actionType: 'monthly_task_cleanup',
      targetType: 'workspace',
      changes: {
        month: monthLabel,
        tasksArchived: archived,
        taskIds: ids,
        archivedAt,
      },
      createdAt: archivedAt,
    }).select()

    console.log(`[monthly-task-cleanup] ${monthLabel}: ${archived} tareas archivadas`)

    return NextResponse.json({
      success: true,
      month: monthLabel,
      message: `${archived} tareas de ${monthLabel} archivadas. Rendimiento preservado.`,
      archived,
      total: tasks.length,
    })
  } catch (err) {
    console.error('Error in monthly-task-cleanup:', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
