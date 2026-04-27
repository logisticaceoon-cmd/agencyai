import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import nodemailer from 'nodemailer'

const STEPHANY_EMAIL = 'stephany.acp@gmail.com'
const RAFAEL_EMAIL = 'logisticaceoon@gmail.com'
const FROM_ADDRESS =
  process.env.EMAIL_FROM || 'Rafael · Logística CEOON <logisticaceoon@gmail.com>'

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

// Clients managed by Stephany
const STEPHANY_CLIENT_NAMES = ['RMONIA SPA', 'YASMIN.TENDENCIA', 'AMURASPA.CL', 'BENDITASHOP.CL', 'DANGER PINK']

function trunc(s: string, n = 68) {
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
    const dayOfWeek = argNow.getUTCDay()

    // Skip weekends
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      return NextResponse.json({ success: true, skipped: 'weekend' })
    }

    const todayStart = new Date(Date.UTC(
      argNow.getUTCFullYear(), argNow.getUTCMonth(), argNow.getUTCDate(), 3, 0, 0, 0
    ))
    const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000 - 1)

    // Get all clients to find Stephany's
    const { data: clients } = await supabase
      .from('clients')
      .select('id, name')

    const stephanyClientIds = (clients || [])
      .filter(c => STEPHANY_CLIENT_NAMES.some(name =>
        c.name?.toUpperCase().includes(name.replace(' SPA', '').replace('.CL', '').split('.')[0])
      ))
      .map(c => c.id)

    // Get pending/in_progress tasks (general + Stephany's clients)
    const { data: allTasks } = await supabase
      .from('tasks')
      .select('id, title, priority, deadline, status, clientId')
      .in('status', ['pending', 'in_progress'])
      .order('deadline', { ascending: true })
      .limit(50)

    const tasks = allTasks || []

    const overdue = tasks.filter(t => t.deadline && new Date(t.deadline) < todayStart)
    const dueToday = tasks.filter(t => {
      if (!t.deadline) return false
      const d = new Date(t.deadline)
      return d >= todayStart && d <= todayEnd
    })
    const inProgress = tasks.filter(t => t.status === 'in_progress')
    const upcoming = tasks.filter(t => t.deadline && new Date(t.deadline) > todayEnd).slice(0, 3)

    const dayName = DAYS[argNow.getUTCDay()]
    const dateStr = `${argNow.getUTCDate()} de ${MONTHS[argNow.getUTCMonth()]}`
    const monthShort = MONTHS[argNow.getUTCMonth()].substring(0, 3)

    // ── Tono humano — como Rafael le habla a Tefy ───────────────────
    const greetings = [
      `¿Cómo arrancás? Acá te mando el resumen del día.`,
      `Empezamos otro día, arriba los ánimos.`,
      `Lunes ya, vamos con todo Tefy.`,
      `Acá el resumen. Revisalo y avisame si hay algo trabado.`,
      `Revisaste las campañas? Acá te dejo lo que hay que atacar hoy.`,
    ]
    const dayGreeting = greetings[argNow.getUTCDay() % greetings.length]

    const urgentBlock = overdue.length > 0
      ? `<div style="background:#fee2e2;border-left:4px solid #dc2626;padding:14px 18px;margin-bottom:16px;border-radius:6px;">
          <p style="margin:0 0 8px;font-weight:700;color:#b91c1c;font-size:14px;">🔴 Esto está vencido — resolverlo hoy</p>
          <ul style="margin:0;padding-left:20px;color:#1f2937;font-size:13px;line-height:1.8;">
            ${overdue.slice(0, 4).map(t =>
              `<li>${trunc(t.title)}${t.priority === 'high' ? ' <span style="background:#dc2626;color:white;font-size:10px;padding:1px 5px;border-radius:3px;">URGENTE</span>' : ''}</li>`
            ).join('')}
            ${overdue.length > 4 ? `<li><em style="color:#9ca3af;">+${overdue.length - 4} más...</em></li>` : ''}
          </ul>
        </div>` : ''

    const todayBlock = dueToday.length > 0
      ? `<div style="background:#fef9c3;border-left:4px solid #ca8a04;padding:14px 18px;margin-bottom:16px;border-radius:6px;">
          <p style="margin:0 0 8px;font-weight:700;color:#854d0e;font-size:14px;">🟡 Para cerrar hoy</p>
          <ul style="margin:0;padding-left:20px;color:#1f2937;font-size:13px;line-height:1.8;">
            ${dueToday.slice(0, 4).map(t => `<li>${trunc(t.title)}</li>`).join('')}
            ${dueToday.length > 4 ? `<li><em style="color:#9ca3af;">+${dueToday.length - 4} más para hoy</em></li>` : ''}
          </ul>
        </div>` : ''

    const inProgressBlock = inProgress.length > 0
      ? `<div style="background:#eff6ff;border-left:4px solid #3b82f6;padding:14px 18px;margin-bottom:16px;border-radius:6px;">
          <p style="margin:0 0 8px;font-weight:700;color:#1d4ed8;font-size:14px;">🔄 En progreso</p>
          <ul style="margin:0;padding-left:20px;color:#1f2937;font-size:13px;line-height:1.8;">
            ${inProgress.slice(0, 3).map(t => `<li>${trunc(t.title)}</li>`).join('')}
            ${inProgress.length > 3 ? `<li><em style="color:#9ca3af;">+${inProgress.length - 3} más...</em></li>` : ''}
          </ul>
        </div>` : ''

    const noTasksBlock = (overdue.length === 0 && dueToday.length === 0 && inProgress.length === 0)
      ? `<div style="background:#f0fdf4;border-left:4px solid #16a34a;padding:14px 18px;margin-bottom:16px;border-radius:6px;">
          <p style="margin:0;color:#15803d;font-size:14px;">✅ Todo limpio por ahora. Aprovechá para revisar métricas de los clientes y optimizar campañas.</p>
        </div>` : ''

    const closingLine = overdue.length > 0
      ? `<p style="font-size:13px;color:#6b7280;margin:16px 0 0;">Si encontrás algo urgente de un cliente, avisame por WhatsApp directo. Gracias Tefy 🙌</p>`
      : `<p style="font-size:13px;color:#6b7280;margin:16px 0 0;">Cualquier duda o problema con algún cliente, avisame. Vamos con todo hoy 💪</p>`

    const html = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <div style="max-width:560px;margin:20px auto;padding:0 12px;">
    <div style="background:white;border-radius:10px;overflow:hidden;box-shadow:0 1px 4px rgba(0,0,0,0.08);">

      <div style="background:#111827;padding:20px 24px;">
        <h1 style="margin:0;font-size:17px;color:white;font-weight:700;">Buenos días Tefy 👋</h1>
        <p style="margin:4px 0 0;color:#9ca3af;font-size:13px;">${dayName} ${dateStr} — Logística CEOON</p>
      </div>

      <div style="padding:20px 24px;">
        <p style="margin:0 0 18px;color:#374151;font-size:14px;line-height:1.6;">${dayGreeting}</p>

        ${urgentBlock}
        ${todayBlock}
        ${inProgressBlock}
        ${noTasksBlock}

        <div style="background:#f9fafb;border-radius:6px;padding:12px 16px;margin-top:16px;">
          <p style="margin:0;font-size:13px;color:#374151;font-weight:600;">Recordatorio diario:</p>
          <ul style="margin:6px 0 0;padding-left:18px;font-size:13px;color:#6b7280;line-height:1.8;">
            <li>Revisar métricas de todas las campañas activas</li>
            <li>Optimizar cualquier conjunto que esté underperforming</li>
            <li>Al cierre del día mandá reporte de resultados</li>
          </ul>
        </div>

        <div style="text-align:center;margin-top:20px;">
          <a href="https://agencyai-iota.vercel.app/tasks"
             style="display:inline-block;background:#111827;color:white;padding:10px 20px;border-radius:6px;text-decoration:none;font-size:13px;font-weight:600;">
            Ver tareas en AgencyAi →
          </a>
        </div>

        ${closingLine}
      </div>

      <div style="background:#f9fafb;padding:12px 24px;border-top:1px solid #f3f4f6;text-align:center;">
        <p style="margin:0;font-size:11px;color:#9ca3af;">
          Rafael · Logística CEOON — Enviado automáticamente a las 10:00 AM
        </p>
      </div>

    </div>
  </div>
</body>
</html>`

    const subjectAlert = overdue.length > 0
      ? ` — 🔴 ${overdue.length} vencida${overdue.length > 1 ? 's' : ''}`
      : dueToday.length > 0 ? ` — ${dueToday.length} para hoy` : ''
    const subject = `Buenos días Tefy — ${dayName} ${argNow.getUTCDate()} ${monthShort}${subjectAlert}`

    if (process.env.GMAIL_APP_PASSWORD) {
      const transporter = getTransporter()
      await transporter.sendMail({
        from: FROM_ADDRESS,
        to: STEPHANY_EMAIL,
        cc: RAFAEL_EMAIL,
        subject,
        html,
      })
    }

    return NextResponse.json({
      success: true,
      emailSent: !!process.env.GMAIL_APP_PASSWORD,
      summary: { overdue: overdue.length, dueToday: dueToday.length, inProgress: inProgress.length },
    })
  } catch (error: any) {
    console.error('Stephany morning cron error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
