import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import nodemailer from 'nodemailer'

const RAFAEL_EMAIL = process.env.RAFAEL_EMAIL || ''
const FROM_ADDRESS =
  process.env.EMAIL_FROM || 'AgencyAI <noreply@agencyai.app>'

const DAYS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']
const MONTHS = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
]

function getTransporter() {
  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.GMAIL_USER || '',
      pass: process.env.GMAIL_APP_PASSWORD,
    },
  })
}

function trunc(s: string, n = 72) {
  return s.length > n ? s.substring(0, n) + '…' : s
}

function formatDeadline(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleDateString('es-AR', { day: 'numeric', month: 'short' })
}

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const supabase = createAdminClient()
    const nowUTC = new Date()

    // Argentina = UTC-3
    const argOffset = -3 * 60 * 60 * 1000
    const argNow = new Date(nowUTC.getTime() + argOffset)

    const todayStart = new Date(Date.UTC(
      argNow.getUTCFullYear(), argNow.getUTCMonth(), argNow.getUTCDate(), 3, 0, 0, 0
    ))
    const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000 - 1)

    // Get all tasks
    const { data: allTasks } = await supabase
      .from('tasks')
      .select('id, title, priority, deadline, status')
      .in('status', ['pending', 'in_progress'])
      .order('deadline', { ascending: true, nullsFirst: false })
      .limit(60)

    const tasks = allTasks || []

    const overdue = tasks.filter(t => t.deadline && new Date(t.deadline) < todayStart)
    const dueToday = tasks.filter(t => {
      if (!t.deadline) return false
      const d = new Date(t.deadline)
      return d >= todayStart && d <= todayEnd
    })
    const inProgress = tasks.filter(t => t.status === 'in_progress')
    const upcoming = tasks
      .filter(t => t.deadline && new Date(t.deadline) > todayEnd)
      .slice(0, 3)

    const dayName = DAYS[argNow.getUTCDay()]
    const dateStr = `${argNow.getUTCDate()} de ${MONTHS[argNow.getUTCMonth()]}`
    const monthShort = MONTHS[argNow.getUTCMonth()].substring(0, 3)

    // Solo enviar email si hay urgencias — si no, el cron corre igual pero no molesta
    const hasUrgencies = overdue.length > 0

    const urgentBlock = overdue.length > 0
      ? `<div style="background:#fee2e2;border-left:4px solid #dc2626;padding:16px 20px;margin-bottom:16px;border-radius:8px;">
          <p style="margin:0 0 10px;font-weight:700;color:#b91c1c;font-size:14px;">🔴 VENCIDAS — requieren acción hoy</p>
          <ul style="margin:0;padding-left:20px;color:#1f2937;font-size:13px;line-height:2;">
            ${overdue.slice(0, 5).map(t =>
              `<li><strong>${trunc(t.title)}</strong>${t.deadline ? ` <span style="color:#9ca3af;font-size:11px;">(venció ${formatDeadline(t.deadline)})</span>` : ''}${t.priority === 'high' ? ' <span style="background:#dc2626;color:white;font-size:10px;padding:1px 6px;border-radius:3px;font-weight:700;">ALTA</span>' : ''}</li>`
            ).join('')}
            ${overdue.length > 5 ? `<li style="color:#9ca3af;font-style:italic;">+${overdue.length - 5} más vencidas</li>` : ''}
          </ul>
        </div>` : ''

    const todayBlock = dueToday.length > 0
      ? `<div style="background:#fef9c3;border-left:4px solid #ca8a04;padding:16px 20px;margin-bottom:16px;border-radius:8px;">
          <p style="margin:0 0 10px;font-weight:700;color:#854d0e;font-size:14px;">🟡 Vence HOY</p>
          <ul style="margin:0;padding-left:20px;color:#1f2937;font-size:13px;line-height:2;">
            ${dueToday.slice(0, 4).map(t => `<li>${trunc(t.title)}</li>`).join('')}
            ${dueToday.length > 4 ? `<li style="color:#9ca3af;font-style:italic;">+${dueToday.length - 4} más para hoy</li>` : ''}
          </ul>
        </div>` : ''

    const inProgressBlock = inProgress.length > 0
      ? `<div style="background:#eff6ff;border-left:4px solid #3b82f6;padding:16px 20px;margin-bottom:16px;border-radius:8px;">
          <p style="margin:0 0 10px;font-weight:700;color:#1d4ed8;font-size:14px;">🔄 En progreso (${inProgress.length})</p>
          <ul style="margin:0;padding-left:20px;color:#1f2937;font-size:13px;line-height:2;">
            ${inProgress.slice(0, 3).map(t => `<li>${trunc(t.title)}</li>`).join('')}
            ${inProgress.length > 3 ? `<li style="color:#9ca3af;font-style:italic;">+${inProgress.length - 3} más en progreso</li>` : ''}
          </ul>
        </div>` : ''

    const upcomingBlock = upcoming.length > 0
      ? `<div style="background:#f9fafb;border-radius:8px;padding:14px 18px;margin-bottom:16px;">
          <p style="margin:0 0 8px;font-size:13px;font-weight:700;color:#374151;">📋 Próximas</p>
          <ul style="margin:0;padding-left:18px;font-size:12px;color:#6b7280;line-height:1.9;">
            ${upcoming.map(t => `<li>${trunc(t.title, 60)}${t.deadline ? ` — ${formatDeadline(t.deadline)}` : ''}</li>`).join('')}
          </ul>
        </div>` : ''

    const allCleanBlock = (overdue.length === 0 && dueToday.length === 0 && inProgress.length === 0)
      ? `<div style="background:#f0fdf4;border-left:4px solid #16a34a;padding:16px 20px;margin-bottom:16px;border-radius:8px;">
          <p style="margin:0;color:#15803d;font-size:14px;">✅ Sin urgencias. Día limpio — aprovechalo para avanzar en proyectos.</p>
        </div>` : ''

    // Subject dinámico según urgencia
    const subjectSuffix = overdue.length > 0
      ? ` — ⚠️ ${overdue.length} tarea${overdue.length > 1 ? 's' : ''} vencida${overdue.length > 1 ? 's' : ''}`
      : dueToday.length > 0
        ? ` — ${dueToday.length} para hoy`
        : ''

    const subject = `☀️ Briefing ${dayName} ${argNow.getUTCDate()} ${monthShort}${subjectSuffix}`

    const html = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <div style="max-width:580px;margin:24px auto;padding:0 12px;">
    <div style="background:white;border-radius:12px;overflow:hidden;box-shadow:0 1px 6px rgba(0,0,0,0.08);">

      <div style="background:linear-gradient(135deg,#0f172a 0%,#1e3a5f 100%);padding:24px 28px;">
        <h1 style="margin:0;font-size:18px;color:white;font-weight:700;">Briefing del día, Rafael</h1>
        <p style="margin:6px 0 0;color:#94a3b8;font-size:13px;">${dayName} ${dateStr} · Logística CEOON</p>
      </div>

      <div style="padding:24px 28px;">

        ${urgentBlock}
        ${todayBlock}
        ${inProgressBlock}
        ${allCleanBlock}
        ${upcomingBlock}

        <div style="text-align:center;margin-top:24px;">
          <a href="https://agencyai-iota.vercel.app/tasks"
             style="display:inline-block;background:#0f172a;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;font-size:14px;font-weight:600;letter-spacing:0.3px;">
            Ver todas las tareas →
          </a>
        </div>

        <p style="font-size:12px;color:#9ca3af;margin:20px 0 0;text-align:center;">
          Enviado automáticamente a las 10:00 AM Argentina
        </p>

      </div>

    </div>

    <p style="text-align:center;font-size:11px;color:#d1d5db;margin:12px 0 0;">
      Ceonyx · Agente IA — Logística CEOON
    </p>
  </div>
</body>
</html>`

    // Solo enviar si hay urgencias o tareas para hoy — evitar spam en días limpios
    const shouldSend = hasUrgencies || dueToday.length > 0 || inProgress.length > 0

    if (process.env.GMAIL_APP_PASSWORD && shouldSend) {
      const transporter = getTransporter()
      await transporter.sendMail({
        from: FROM_ADDRESS,
        to: RAFAEL_EMAIL,
        subject,
        html,
      })
    }

    return NextResponse.json({
      success: true,
      emailSent: !!(process.env.GMAIL_APP_PASSWORD && shouldSend),
      reason: !shouldSend ? 'no urgencies today' : 'sent',
      summary: {
        overdue: overdue.length,
        dueToday: dueToday.length,
        inProgress: inProgress.length,
      },
    })
  } catch (error) {
    console.error('Morning briefing cron error:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
