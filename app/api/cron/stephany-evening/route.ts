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

    // Get tasks completed today
    const { data: completedToday } = await supabase
      .from('tasks')
      .select('id, title, priority')
      .eq('createdById', STEPHANY_USER_ID)
      .eq('status', 'completed')
      .gte('updatedAt', todayStart.toISOString())
      .is('deleted_at', null)

    // Get still-pending/in_progress tasks
    const { data: stillPending } = await supabase
      .from('tasks')
      .select('id, title, status, priority, deadline')
      .eq('createdById', STEPHANY_USER_ID)
      .in('status', ['pending', 'in_progress'])
      .is('deleted_at', null)
      .order('priority', { ascending: false })
      .limit(15)

    const overdue = (stillPending || []).filter(
      t => t.deadline && new Date(t.deadline) < now
    )

    const dayName = now.toLocaleDateString('es-AR', { weekday: 'long', timeZone: 'America/Argentina/Buenos_Aires' })
    const dateStr = now.toLocaleDateString('es-AR', { day: '2-digit', month: 'long', timeZone: 'America/Argentina/Buenos_Aires' })

    const priorityBadge = (p: string) => {
      if (p === 'high' || p === 'urgent') return '🔴'
      if (p === 'medium') return '🟡'
      return '🟢'
    }

    const taskRow = (t: { title: string; status: string; priority: string; deadline?: string | null }) =>
      `<tr style="border-bottom:1px solid #f0f0f0;">
        <td style="padding:8px 12px;">${priorityBadge(t.priority)} ${t.title}</td>
        <td style="padding:8px 12px;font-size:13px;color:#666;">${t.status === 'in_progress' ? '⚡ En progreso' : '⏳ Pendiente'}</td>
        <td style="padding:8px 12px;font-size:12px;color:#999;">${t.deadline ? new Date(t.deadline).toLocaleDateString('es-AR') : '—'}</td>
      </tr>`

    const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#f8f9fa;margin:0;padding:20px;">
  <div style="max-width:600px;margin:0 auto;background:white;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
    
    <div style="background:linear-gradient(135deg,#1a1a2e 0%,#2d3561 100%);padding:24px 28px;">
      <p style="color:#a0aec0;margin:0 0 4px;font-size:13px;text-transform:uppercase;letter-spacing:1px;">Cierre del día</p>
      <h1 style="color:white;margin:0;font-size:22px;font-weight:600;">${dayName.charAt(0).toUpperCase() + dayName.slice(1)}, ${dateStr}</h1>
      <p style="color:#718096;margin:8px 0 0;font-size:14px;">Es hora de cerrar el día, Tefy 🌙</p>
    </div>

    <div style="padding:24px 28px;">

      ${(completedToday?.length || 0) > 0 ? `
      <div style="background:#f0fff4;border-left:4px solid #68d391;border-radius:0 8px 8px 0;padding:12px 16px;margin-bottom:20px;">
        <p style="margin:0;font-weight:600;color:#276749;">✅ Completaste ${completedToday!.length} tarea${completedToday!.length > 1 ? 's' : ''} hoy</p>
        <p style="margin:4px 0 0;font-size:13px;color:#276749;">${completedToday!.map(t => t.title).join(' · ')}</p>
      </div>` : `
      <div style="background:#fffaf0;border-left:4px solid #f6ad55;border-radius:0 8px 8px 0;padding:12px 16px;margin-bottom:20px;">
        <p style="margin:0;font-weight:600;color:#c05621;">Sin tareas completadas hoy</p>
        <p style="margin:4px 0 0;font-size:13px;color:#c05621;">Acordate de actualizar el estado de tus tareas en AgencyAi.</p>
      </div>`}

      <div style="background:#ebf8ff;border-radius:8px;padding:16px;margin-bottom:20px;">
        <p style="margin:0;font-weight:600;color:#2b6cb0;font-size:14px;">📝 Antes de cerrar el día:</p>
        <ul style="margin:8px 0 0;padding-left:20px;color:#2c5282;font-size:13px;line-height:1.8;">
          <li>Marcá como <strong>completado</strong> todo lo que terminaste</li>
          <li>Dejá en <strong>in_progress</strong> lo que sigue mañana</li>
          <li>Si surgió algo nuevo, agregalo a tus tareas</li>
        </ul>
      </div>

      ${(stillPending?.length || 0) > 0 ? `
      <h2 style="font-size:15px;font-weight:600;color:#2d3748;margin:0 0 12px;">⏳ Pendiente para mañana</h2>
      <table style="width:100%;border-collapse:collapse;margin-bottom:24px;">
        <thead><tr style="background:#f7fafc;"><th style="padding:8px 12px;text-align:left;font-size:12px;color:#718096;text-transform:uppercase;">Tarea</th><th style="padding:8px 12px;text-align:left;font-size:12px;color:#718096;">Estado</th><th style="padding:8px 12px;text-align:left;font-size:12px;color:#718096;">Deadline</th></tr></thead>
        <tbody>${stillPending!.slice(0, 8).map(taskRow).join('')}</tbody>
      </table>` : `
      <div style="text-align:center;padding:20px;color:#a0aec0;">
        <p style="font-size:24px;margin:0;">🎉</p>
        <p style="margin:8px 0 0;font-size:14px;">Sin tareas pendientes. Excelente día.</p>
      </div>`}

      ${overdue.length > 0 ? `
      <div style="background:#fff5f5;border-radius:8px;padding:14px 16px;margin-top:8px;">
        <p style="margin:0;font-size:13px;font-weight:600;color:#c53030;">⚠️ ${overdue.length} tarea${overdue.length > 1 ? 's' : ''} vencida${overdue.length > 1 ? 's' : ''} — priorizalas mañana a primera hora</p>
      </div>` : ''}

    </div>

    <div style="padding:16px 28px;background:#f7fafc;border-top:1px solid #e2e8f0;">
      <p style="margin:0;font-size:12px;color:#a0aec0;">
        Ceonyx · Agente IA — Logística CEOON<br>
        Recordatorio automático de cierre — 6:00 PM (hora Argentina)
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
      subject: `🌙 Cierre del día — ${dayName.charAt(0).toUpperCase() + dayName.slice(1)} ${dateStr}`,
      html,
    })

    return NextResponse.json({
      success: true,
      completedToday: completedToday?.length || 0,
      stillPending: stillPending?.length || 0,
      overdue: overdue.length,
      emailSentTo: STEPHANY_EMAIL,
    })
  } catch (error) {
    console.error('Stephany evening reminder error:', error)
    return NextResponse.json({ error: 'Failed to send evening reminder' }, { status: 500 })
  }
}
