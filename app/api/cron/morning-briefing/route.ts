import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import nodemailer from 'nodemailer'

const RAFAEL_EMAIL = 'logisticaceoon@gmail.com'
const FROM_ADDRESS =
  process.env.EMAIL_FROM || 'Ceonyx · Logística CEOON <logisticaceoon@gmail.com>'

function getTransporter() {
  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.GMAIL_USER || 'logisticaceoon@gmail.com',
      pass: process.env.GMAIL_APP_PASSWORD,
    },
  })
}

const DAYS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']
const MONTHS = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
]

function trunc(s: string, n = 65) {
  return s.length > n ? s.substring(0, n) + '…' : s
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
    )) // 00:00 Argentina = 03:00 UTC
    const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000 - 1)

    // Fetch in_progress and pending tasks
    const [{ data: inProgress }, { data: pending }] = await Promise.all([
      supabase
        .from('tasks')
        .select('id, title, description, priority, deadline, clientId, projectId')
        .eq('status', 'in_progress')
        .order('priority', { ascending: false })
        .limit(40),
      supabase
        .from('tasks')
        .select('id, title, description, priority, deadline, clientId, projectId')
        .eq('status', 'pending')
        .order('deadline', { ascending: true })
        .limit(40),
    ])

    const allTasks = [...(inProgress || []), ...(pending || [])]

    // Categorize tasks
    const overdue = allTasks.filter(
      (t) => t.deadline && new Date(t.deadline) < todayStart
    )
    const dueToday = allTasks.filter((t) => {
      if (!t.deadline) return false
      const d = new Date(t.deadline)
      return d >= todayStart && d <= todayEnd
    })
    const activeInProgress = (inProgress || []).filter(
      (t) => !t.deadline || new Date(t.deadline) > todayEnd
    )
    const upcoming = (pending || [])
      .filter((t) => t.deadline && new Date(t.deadline) > todayEnd)
      .slice(0, 2)

    // Focus: top 3 by urgency + priority
    const focusTasks = [
      ...overdue.filter((t) => t.priority === 'high'),
      ...dueToday.filter((t) => t.priority === 'high'),
      ...activeInProgress.filter((t) => t.priority === 'high'),
      ...overdue.filter((t) => t.priority !== 'high'),
      ...dueToday.filter((t) => t.priority !== 'high'),
    ]
      .filter((t, i, arr) => arr.findIndex((x) => x.id === t.id) === i) // dedupe
      .slice(0, 3)

    // Date strings
    const dayName = DAYS[argNow.getUTCDay()]
    const dateStr = `${argNow.getUTCDate()} de ${MONTHS[argNow.getUTCMonth()]} ${argNow.getUTCFullYear()}`
    const timeStr = `${String(argNow.getUTCHours()).padStart(2, '0')}:${String(argNow.getUTCMinutes()).padStart(2, '0')}`
    const monthShort = MONTHS[argNow.getUTCMonth()].substring(0, 3)

    const totalActive = (inProgress?.length || 0) + (pending?.length || 0)

    // ── HTML sections ────────────────────────────────────────────────
    const badgeHigh = `<span style="background:#dc2626;color:white;font-size:10px;padding:1px 5px;border-radius:3px;margin-left:6px;">ALTA</span>`

    const overdueHtml =
      overdue.length > 0
        ? `<div style="background:#fee2e2;border-left:4px solid #dc2626;padding:12px 16px;margin-bottom:14px;border-radius:4px;">
            <p style="margin:0 0 8px;font-weight:700;color:#b91c1c;font-size:14px;">🔴 VENCIDO — Acción inmediata</p>
            <ul style="margin:0;padding-left:18px;color:#1f2937;font-size:13px;line-height:1.7;">
              ${overdue
                .slice(0, 5)
                .map(
                  (t) =>
                    `<li>${trunc(t.title)}${t.priority === 'high' ? badgeHigh : ''}</li>`
                )
                .join('')}
              ${overdue.length > 5 ? `<li><em style="color:#6b7280;">+${overdue.length - 5} más vencidas</em></li>` : ''}
            </ul>
          </div>`
        : ''

    const dueTodayHtml =
      dueToday.length > 0
        ? `<div style="background:#fef9c3;border-left:4px solid #ca8a04;padding:12px 16px;margin-bottom:14px;border-radius:4px;">
            <p style="margin:0 0 8px;font-weight:700;color:#854d0e;font-size:14px;">🟡 VENCE HOY</p>
            <ul style="margin:0;padding-left:18px;color:#1f2937;font-size:13px;line-height:1.7;">
              ${dueToday
                .slice(0, 5)
                .map(
                  (t) =>
                    `<li>${trunc(t.title)}${t.priority === 'high' ? badgeHigh : ''}</li>`
                )
                .join('')}
              ${dueToday.length > 5 ? `<li><em style="color:#6b7280;">+${dueToday.length - 5} más para hoy</em></li>` : ''}
            </ul>
          </div>`
        : ''

    const inProgressHtml =
      activeInProgress.length > 0
        ? `<div style="background:#eff6ff;border-left:4px solid #3b82f6;padding:12px 16px;margin-bottom:14px;border-radius:4px;">
            <p style="margin:0 0 8px;font-weight:700;color:#1d4ed8;font-size:14px;">🔄 EN PROGRESO</p>
            <ul style="margin:0;padding-left:18px;color:#1f2937;font-size:13px;line-height:1.7;">
              ${activeInProgress
                .slice(0, 3)
                .map((t) => `<li>${trunc(t.title)}</li>`)
                .join('')}
              ${activeInProgress.length > 3 ? `<li><em style="color:#6b7280;">+${activeInProgress.length - 3} más en progreso</em></li>` : ''}
            </ul>
          </div>`
        : ''

    const focusHtml =
      focusTasks.length > 0
        ? `<div style="background:#f0fdf4;border-left:4px solid #16a34a;padding:12px 16px;margin-bottom:14px;border-radius:4px;">
            <p style="margin:0 0 8px;font-weight:700;color:#15803d;font-size:14px;">🎯 TU FOCO DE HOY</p>
            <ol style="margin:0;padding-left:18px;color:#1f2937;font-size:13px;line-height:1.8;">
              ${focusTasks.map((t) => `<li><strong>${trunc(t.title)}</strong></li>`).join('')}
            </ol>
          </div>`
        : ''

    const upcomingHtml =
      upcoming.length > 0
        ? `<div style="background:#f9fafb;border-left:4px solid #9ca3af;padding:12px 16px;margin-bottom:14px;border-radius:4px;">
            <p style="margin:0 0 8px;font-weight:700;color:#374151;font-size:14px;">📋 PRÓXIMAMENTE</p>
            <ul style="margin:0;padding-left:18px;color:#6b7280;font-size:13px;line-height:1.7;">
              ${upcoming
                .map(
                  (t) =>
                    `<li>${trunc(t.title)} <em style="color:#9ca3af;">(${new Date(t.deadline!).toLocaleDateString('es-AR', { day: 'numeric', month: 'short' })})</em></li>`
                )
                .join('')}
            </ul>
          </div>`
        : ''

    const alertSummary =
      overdue.length > 0
        ? `<strong style="color:#b91c1c;">${overdue.length} vencida${overdue.length > 1 ? 's' : ''}.</strong> `
        : ''
    const todaySummary =
      dueToday.length > 0
        ? `<strong style="color:#854d0e;">${dueToday.length} vence${dueToday.length > 1 ? 'n' : ''} hoy.</strong>`
        : ''

    const html = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <div style="max-width:580px;margin:20px auto;padding:0 12px;">
    <div style="background:white;border-radius:10px;overflow:hidden;box-shadow:0 1px 4px rgba(0,0,0,0.08);">

      <!-- Header -->
      <div style="background:#111827;padding:20px 24px;">
        <h1 style="margin:0;font-size:18px;color:white;font-weight:700;">☀️ Buenos días, Rafael</h1>
        <p style="margin:4px 0 0;color:#9ca3af;font-size:13px;">${dayName}, ${dateStr} — ${timeStr} hs Argentina</p>
      </div>

      <!-- Body -->
      <div style="padding:20px 24px;">

        <p style="margin:0 0 16px;color:#374151;font-size:14px;">
          Tenés <strong>${totalActive} tareas activas</strong>. ${alertSummary}${todaySummary}
        </p>

        ${overdueHtml}
        ${dueTodayHtml}
        ${inProgressHtml}
        ${focusHtml}
        ${upcomingHtml}

        <div style="text-align:center;margin-top:20px;">
          <a href="https://agencyai-iota.vercel.app/tasks"
             style="display:inline-block;background:#111827;color:white;padding:10px 22px;border-radius:6px;text-decoration:none;font-size:13px;font-weight:600;letter-spacing:0.3px;">
            Ver todas las tareas →
          </a>
        </div>

      </div>

      <!-- Footer -->
      <div style="background:#f9fafb;padding:12px 24px;border-top:1px solid #f3f4f6;text-align:center;">
        <p style="margin:0;font-size:11px;color:#9ca3af;">
          Ceonyx · Agente IA — Logística CEOON
        </p>
      </div>

    </div>
  </div>
</body>
</html>`

    // Build subject line
    const subjectAlert =
      overdue.length > 0
        ? ` — 🔴 ${overdue.length} vencida${overdue.length > 1 ? 's' : ''}`
        : dueToday.length > 0
        ? ` — ${dueToday.length} para hoy`
        : ''
    const subject = `☀️ Briefing ${dayName} ${argNow.getUTCDate()} ${monthShort}${subjectAlert}`

    // Send email (requires GMAIL_APP_PASSWORD env var)
    if (process.env.GMAIL_APP_PASSWORD) {
      const transporter = getTransporter()
      await transporter.sendMail({
        from: FROM_ADDRESS,
        to: RAFAEL_EMAIL,
        subject,
        html,
      })
    } else {
      console.warn('GMAIL_APP_PASSWORD not set — email skipped. Configure it in Vercel env vars.')
    }

    return NextResponse.json({
      success: true,
      emailSent: !!process.env.GMAIL_APP_PASSWORD,
      summary: {
        overdue: overdue.length,
        dueToday: dueToday.length,
        inProgress: inProgress?.length || 0,
        pending: pending?.length || 0,
        totalActive,
      },
    })
  } catch (error: any) {
    console.error('Morning briefing cron error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
