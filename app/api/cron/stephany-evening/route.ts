import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import nodemailer from 'nodemailer'

const STEPHANY_EMAIL = process.env.STEPHANY_EMAIL || ''
const RAFAEL_EMAIL = process.env.RAFAEL_EMAIL || ''
const FROM_ADDRESS =
  process.env.EMAIL_FROM || 'AgencyAI <noreply@agencyai.app>'

function getTransporter() {
  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.GMAIL_USER || '',
      pass: process.env.GMAIL_APP_PASSWORD,
    },
  })
}

const DAYS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']
const MONTHS = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
]

function trunc(s: string, n = 68) {
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
    const dayOfWeek = argNow.getUTCDay()

    // Skip weekends
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      return NextResponse.json({ success: true, skipped: 'weekend' })
    }

    const todayStart = new Date(Date.UTC(
      argNow.getUTCFullYear(), argNow.getUTCMonth(), argNow.getUTCDate(), 3, 0, 0, 0
    ))
    const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000 - 1)
    const tomorrowStart = new Date(todayEnd.getTime() + 1)
    const tomorrowEnd = new Date(tomorrowStart.getTime() + 24 * 60 * 60 * 1000 - 1)

    const WORKSPACE_ID = process.env.DEFAULT_WORKSPACE_ID
    const STEPHANY_USER_ID = process.env.STEPHANY_USER_ID
    if (!WORKSPACE_ID || !STEPHANY_USER_ID) {
      return NextResponse.json({ error: 'Missing DEFAULT_WORKSPACE_ID or STEPHANY_USER_ID' }, { status: 500 })
    }

    // Get ONLY tasks assigned to Stephany in this workspace
    const { data: allTasks } = await supabase
      .from('tasks')
      .select('id, title, priority, deadline, status')
      .eq('workspace_id', WORKSPACE_ID)
      .contains('assignedTo', [STEPHANY_USER_ID])
      .in('status', ['pending', 'in_progress'])
      .is('deleted_at', null)
      .order('deadline', { ascending: true })
      .limit(40)

    const tasks = allTasks || []

    const overdue = tasks.filter(t => t.deadline && new Date(t.deadline) < todayStart)
    const stillOpen = tasks.filter(t => {
      if (!t.deadline) return false
      const d = new Date(t.deadline)
      return d >= todayStart && d <= todayEnd
    })
    const dueTomorrow = tasks.filter(t => {
      if (!t.deadline) return false
      const d = new Date(t.deadline)
      return d >= tomorrowStart && d <= tomorrowEnd
    })
    const inProgress = tasks.filter(t => t.status === 'in_progress')

    const dayName = DAYS[argNow.getUTCDay()]
    const dateStr = `${argNow.getUTCDate()} de ${MONTHS[argNow.getUTCMonth()]}`
    const monthShort = MONTHS[argNow.getUTCMonth()].substring(0, 3)
    const isFriday = dayOfWeek === 5

    // ── Tono humano cierre del día ───────────────────────────────────
    const closingGreet = isFriday
      ? `Buen viernes Tefy! Antes de cortar, pasá por este checklist rápido.`
      : `Casi terminamos el día. Antes de cerrar, revisá esto:`

    const overdueAlert = overdue.length > 0
      ? `<div style="background:#fee2e2;border-left:4px solid #dc2626;padding:14px 18px;margin-bottom:16px;border-radius:6px;">
          <p style="margin:0 0 6px;font-weight:700;color:#b91c1c;font-size:14px;">🔴 Quedaron vencidas — me avisás qué pasó</p>
          <ul style="margin:0;padding-left:20px;color:#1f2937;font-size:13px;line-height:1.8;">
            ${overdue.slice(0, 4).map(t => `<li>${trunc(t.title)}</li>`).join('')}
          </ul>
        </div>` : ''

    const stillOpenAlert = stillOpen.length > 0
      ? `<div style="background:#fef9c3;border-left:4px solid #ca8a04;padding:14px 18px;margin-bottom:16px;border-radius:6px;">
          <p style="margin:0 0 6px;font-weight:700;color:#854d0e;font-size:14px;">🟡 Estaban para hoy — ¿las cerraste?</p>
          <ul style="margin:0;padding-left:20px;color:#1f2937;font-size:13px;line-height:1.8;">
            ${stillOpen.slice(0, 4).map(t => `<li>${trunc(t.title)}</li>`).join('')}
          </ul>
        </div>` : ''

    const tomorrowBlock = dueTomorrow.length > 0
      ? `<div style="background:#eff6ff;border-left:4px solid #3b82f6;padding:14px 18px;margin-bottom:16px;border-radius:6px;">
          <p style="margin:0 0 6px;font-weight:700;color:#1d4ed8;font-size:14px;">📋 Mañana arrancás con esto</p>
          <ul style="margin:0;padding-left:20px;color:#1f2937;font-size:13px;line-height:1.8;">
            ${dueTomorrow.slice(0, 3).map(t => `<li>${trunc(t.title)}</li>`).join('')}
          </ul>
        </div>` : ''

    const allGood = (overdue.length === 0 && stillOpen.length === 0)
      ? `<div style="background:#f0fdf4;border-left:4px solid #16a34a;padding:14px 18px;margin-bottom:16px;border-radius:6px;">
          <p style="margin:0;color:#15803d;font-size:14px;">✅ Buen trabajo hoy, todo limpio. Descansá.</p>
        </div>` : ''

    const checklist = `
      <div style="background:#f9fafb;border-radius:8px;padding:14px 18px;margin-bottom:16px;">
        <p style="margin:0 0 10px;font-size:14px;font-weight:700;color:#111827;">Checklist de cierre:</p>
        <table style="width:100%;font-size:13px;color:#374151;">
          <tr><td style="padding:4px 0;">☐</td><td style="padding:4px 8px;">Revisé las métricas de todos los clientes activos</td></tr>
          <tr><td style="padding:4px 0;">☐</td><td style="padding:4px 8px;">Mandé reporte de resultados del día</td></tr>
          <tr><td style="padding:4px 0;">☐</td><td style="padding:4px 8px;">Pausé o ajusté lo que estaba perdiendo plata</td></tr>
          <tr><td style="padding:4px 0;">☐</td><td style="padding:4px 8px;">Actualicé las tareas en AgencyAi</td></tr>
          ${isFriday ? '<tr><td style="padding:4px 0;">☐</td><td style="padding:4px 8px;">Dejé todo ordenado para el lunes</td></tr>' : ''}
        </table>
      </div>`

    const closingNote = isFriday
      ? `<p style="font-size:13px;color:#6b7280;margin:16px 0 0;">Buen finde Tefy, nos vemos el lunes 🙌</p>`
      : `<p style="font-size:13px;color:#6b7280;margin:16px 0 0;">Cualquier cosa avisame. Gracias por el día 💪</p>`

    const html = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <div style="max-width:560px;margin:20px auto;padding:0 12px;">
    <div style="background:white;border-radius:10px;overflow:hidden;box-shadow:0 1px 4px rgba(0,0,0,0.08);">

      <div style="background:#1e293b;padding:20px 24px;">
        <h1 style="margin:0;font-size:17px;color:white;font-weight:700;">Cierre del día Tefy 🌆</h1>
        <p style="margin:4px 0 0;color:#94a3b8;font-size:13px;">${dayName} ${dateStr} — Logística CEOON</p>
      </div>

      <div style="padding:20px 24px;">
        <p style="margin:0 0 18px;color:#374151;font-size:14px;line-height:1.6;">${closingGreet}</p>

        ${overdueAlert}
        ${stillOpenAlert}
        ${allGood}
        ${checklist}
        ${tomorrowBlock}

        <div style="text-align:center;margin-top:20px;">
          <a href="https://agencyai-iota.vercel.app/tasks"
             style="display:inline-block;background:#1e293b;color:white;padding:10px 20px;border-radius:6px;text-decoration:none;font-size:13px;font-weight:600;">
            Actualizar tareas →
          </a>
        </div>

        ${closingNote}
      </div>

      <div style="background:#f9fafb;padding:12px 24px;border-top:1px solid #f3f4f6;text-align:center;">
        <p style="margin:0;font-size:11px;color:#9ca3af;">
          Rafael · Logística CEOON — Enviado automáticamente a las 6:00 PM
        </p>
      </div>

    </div>
  </div>
</body>
</html>`

    const subject = isFriday
      ? `Cierre semana Tefy — ${dayName} ${argNow.getUTCDate()} ${monthShort} 🏁`
      : `Cierre del día Tefy — ${dayName} ${argNow.getUTCDate()} ${monthShort}`

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
      summary: { overdue: overdue.length, stillOpen: stillOpen.length, dueTomorrow: dueTomorrow.length },
    })
  } catch (error) {
    console.error('Stephany evening cron error:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
