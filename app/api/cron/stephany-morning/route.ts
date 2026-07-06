import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import nodemailer from 'nodemailer'

const STEPHANY_EMAIL = 'stephany.acp@gmail.com'
const RAFAEL_EMAIL = 'logisticaceoon@gmail.com'
const STEPHANY_USER_ID = '079cb567-1bb8-4726-b6ae-deaaf83ecbda'

function createTransporter() {
  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.GMAIL_USER || 'logisticaceoon@gmail.com',
      pass: process.env.GMAIL_APP_PASSWORD,
    },
  })
}

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const supabase = createAdminClient()
    const now = new Date()
    const todayStart = new Date(now)
    todayStart.setHours(0, 0, 0, 0)
    const todayEnd = new Date(now)
    todayEnd.setHours(23, 59, 59, 999)

    // Get Stephany's pending/in_progress tasks
    const { data: activeTasks } = await supabase
      .from('tasks')
      .select('id, title, status, priority, deadline, description')
      .eq('createdById', STEPHANY_USER_ID)
      .in('status', ['pending', 'in_progress'])
      .is('deleted_at', null)
      .order('priority', { ascending: false })
      .order('deadline', { ascending: true })
      .limit(20)

    // Get overdue tasks
    const overdueTasks = (activeTasks || []).filter(
      t => t.deadline && new Date(t.deadline) < todayStart
    )

    // Get tasks due today
    const todayTasks = (activeTasks || []).filter(
      t =>
        t.deadline &&
        new Date(t.deadline) >= todayStart &&
        new Date(t.deadline) <= todayEnd
    )

    // Other active tasks (no deadline or future)
    const otherTasks = (activeTasks || []).filter(
      t =>
        !t.deadline ||
        new Date(t.deadline) > todayEnd
    )

    const dayName = now.toLocaleDateString('es-AR', { weekday: 'long', timeZone: 'America/Argentina/Buenos_Aires' })
    const dateStr = now.toLocaleDateString('es-AR', { day: '2-digit', month: 'long', year: 'numeric', timeZone: 'America/Argentina/Buenos_Aires' })

    const priorityBadge = (p: string) => {
      if (p === 'high' || p === 'urgent') return '🔴'
      if (p === 'medium') return '🟡'
      return '🟢'
    }

    const taskRow = (t: { title: string; status: string; priority: string; deadline?: string | null }) =>
      `<tr style="border-bottom:1px solid #f0f0f0;">
        <td style="padding:8px 12px;">${priorityBadge(t.priority)} ${t.title}</td>
        <td style="padding:8px 12px;color:#666;font-size:13px;">${t.status === 'in_progress' ? '⚡ En progreso' : '⏳ Pendiente'}</td>
        <td style="padding:8px 12px;color:#999;font-size:12px;">${t.deadline ? new Date(t.deadline).toLocaleDateString('es-AR') : '—'}</td>
      </tr>`

    const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#f8f9fa;margin:0;padding:20px;">
  <div style="max-width:600px;margin:0 auto;background:white;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
    
    <div style="background:linear-gradient(135deg,#1a1a2e 0%,#16213e 100%);padding:24px 28px;">
      <p style="color:#a0aec0;margin:0 0 4px;font-size:13px;text-transform:uppercase;letter-spacing:1px;">Briefing matutino</p>
      <h1 style="color:white;margin:0;font-size:22px;font-weight:600;">${dayName.charAt(0).toUpperCase() + dayName.slice(1)}, ${dateStr}</h1>
      <p style="color:#718096;margin:8px 0 0;font-size:14px;">Buenos días Tefy — acá están tus tareas para hoy</p>
    </div>

    <div style="padding:24px 28px;">

      ${overdueTasks.length > 0 ? `
      <div style="background:#fff5f5;border-left:4px solid #fc8181;border-radius:0 8px 8px 0;padding:12px 16px;margin-bottom:20px;">
        <p style="margin:0;font-weight:600;color:#c53030;">⚠️ ${overdueTasks.length} tarea${overdueTasks.length > 1 ? 's' : ''} vencida${overdueTasks.length > 1 ? 's' : ''}</p>
        <p style="margin:4px 0 0;font-size:13px;color:#742a2a;">Necesitan atención urgente.</p>
      </div>
      <table style="width:100%;border-collapse:collapse;margin-bottom:24px;">
        <thead><tr style="background:#fff5f5;"><th style="padding:8px 12px;text-align:left;font-size:12px;color:#c53030;text-transform:uppercase;">Tarea vencida</th><th style="padding:8px 12px;text-align:left;font-size:12px;color:#c53030;">Estado</th><th style="padding:8px 12px;text-align:left;font-size:12px;color:#c53030;">Venció</th></tr></thead>
        <tbody>${overdueTasks.map(taskRow).join('')}</tbody>
      </table>` : ''}

      ${todayTasks.length > 0 ? `
      <h2 style="font-size:15px;font-weight:600;color:#2d3748;margin:0 0 12px;">📅 Para hoy</h2>
      <table style="width:100%;border-collapse:collapse;margin-bottom:24px;">
        <thead><tr style="background:#f7fafc;"><th style="padding:8px 12px;text-align:left;font-size:12px;color:#718096;text-transform:uppercase;">Tarea</th><th style="padding:8px 12px;text-align:left;font-size:12px;color:#718096;">Estado</th><th style="padding:8px 12px;text-align:left;font-size:12px;color:#718096;">Fecha</th></tr></thead>
        <tbody>${todayTasks.map(taskRow).join('')}</tbody>
      </table>` : ''}

      ${otherTasks.length > 0 ? `
      <h2 style="font-size:15px;font-weight:600;color:#2d3748;margin:0 0 12px;">📋 Otras tareas activas</h2>
      <table style="width:100%;border-collapse:collapse;margin-bottom:24px;">
        <thead><tr style="background:#f7fafc;"><th style="padding:8px 12px;text-align:left;font-size:12px;color:#718096;text-transform:uppercase;">Tarea</th><th style="padding:8px 12px;text-align:left;font-size:12px;color:#718096;">Estado</th><th style="padding:8px 12px;text-align:left;font-size:12px;color:#718096;">Deadline</th></tr></thead>
        <tbody>${otherTasks.slice(0, 8).map(taskRow).join('')}</tbody>
      </table>` : ''}

      ${activeTasks?.length === 0 ? `
      <div style="text-align:center;padding:32px;color:#a0aec0;">
        <p style="font-size:32px;margin:0;">✅</p>
        <p style="margin:8px 0 0;font-size:15px;">Sin tareas pendientes. ¡Buen trabajo!</p>
      </div>` : ''}

      <div style="background:#f7fafc;border-radius:8px;padding:16px;margin-top:8px;">
        <p style="margin:0;font-size:13px;color:#718096;">
          📊 <strong>${activeTasks?.length || 0}</strong> tareas activas · 
          <strong style="color:#c53030;">${overdueTasks.length}</strong> vencidas · 
          <strong style="color:#d69e2e;">${todayTasks.length}</strong> vencen hoy
        </p>
      </div>
    </div>

    <div style="padding:16px 28px;background:#f7fafc;border-top:1px solid #e2e8f0;">
      <p style="margin:0;font-size:12px;color:#a0aec0;">
        Ceonyx · Agente IA — Logística CEOON<br>
        Enviado automáticamente a las 10:00 AM (hora Argentina)
      </p>
    </div>
  </div>
</body>
</html>`

    const transporter = createTransporter()
    await transporter.sendMail({
      from: `"Ceonyx · CEOON" <${process.env.GMAIL_USER || 'logisticaceoon@gmail.com'}>`,
      to: STEPHANY_EMAIL,
      cc: RAFAEL_EMAIL,
      subject: `📋 Briefing del día — ${dayName.charAt(0).toUpperCase() + dayName.slice(1)} ${dateStr}`,
      html,
    })

    return NextResponse.json({
      success: true,
      activeTasks: activeTasks?.length || 0,
      overdueTasks: overdueTasks.length,
      todayTasks: todayTasks.length,
      emailSentTo: STEPHANY_EMAIL,
    })
  } catch (error) {
    console.error('Stephany morning briefing error:', error)
    return NextResponse.json({ error: 'Failed to send morning briefing' }, { status: 500 })
  }
}
