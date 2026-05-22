import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import nodemailer from 'nodemailer'

const STEPHANY_EMAIL = 'stephany.acp@gmail.com'
const RAFAEL_EMAIL = 'logisticaceoon@gmail.com'
const FROM_ADDRESS = process.env.EMAIL_FROM || 'Ceonyx · Logística CEOON <logisticaceoon@gmail.com>'

function getTransporter() {
  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.GMAIL_USER || 'logisticaceoon@gmail.com',
      pass: process.env.GMAIL_APP_PASSWORD,
    },
  })
}

const DAYS = ['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado']
const MONTHS = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']

function trunc(s: string, n = 68) { return s.length > n ? s.substring(0, n) + '…' : s }

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const supabase = createAdminClient()
    const nowUTC = new Date()
    const argOffset = -3 * 60 * 60 * 1000
    const argNow = new Date(nowUTC.getTime() + argOffset)
    const dayOfWeek = argNow.getUTCDay()

    if (dayOfWeek === 0 || dayOfWeek === 6) {
      return NextResponse.json({ success: true, skipped: 'weekend' })
    }

    const todayStart = new Date(Date.UTC(argNow.getUTCFullYear(), argNow.getUTCMonth(), argNow.getUTCDate(), 3, 0, 0, 0))
    const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000 - 1)
    const tomorrowStart = new Date(todayEnd.getTime() + 1)
    const tomorrowEnd = new Date(tomorrowStart.getTime() + 24 * 60 * 60 * 1000 - 1)

    const WORKSPACE_ID = '41b4b8ab-2483-418d-bb29-d39084ca36f0'
    const STEPHANY_USER_ID = '079cb567-1bb8-4726-b6ae-deaaf83ecbda'

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

    const dayName = DAYS[argNow.getUTCDay()]
    const dateStr = `${argNow.getUTCDate()} de ${MONTHS[argNow.getUTCMonth()]}`
    const monthShort = MONTHS[argNow.getUTCMonth()].substring(0, 3)
    const isFriday = dayOfWeek === 5

    const greeting = isFriday
      ? '¡Viernes! Antes de cortarla, rápido checklist 👇'
      : 'Llegó la tarde Tefy. ¿Cómo te fue? Revisá esto antes de cerrar 👇'

    const overdueAlert = overdue.length > 0
      ? `<div style="background:#fee2e2;border-left:4px solid #dc2626;padding:14px 18px;margin-bottom:16px;border-radius:6px;">
          <p style="margin:0 0 8px;font-weight:700;color:#b91c1c;font-size:14px;">🔴 Quedaron sin cerrar — me avisás qué pasó</p>
          <ul style="margin:0;padding-left:20px;color:#1f2937;font-size:13px;line-height:1.9;">
            ${overdue.slice(0, 4).map(t => `<li>${trunc(t.title)}</li>`).join('')}
          </ul>
        </div>` : ''

    const stillOpenAlert = stillOpen.length > 0
      ? `<div style="background:#fef9c3;border-left:4px solid #f59e0b;padding:14px 18px;margin-bottom:16px;border-radius:6px;">
          <p style="margin:0 0 8px;font-weight:700;color:#92400e;font-size:14px;">🟡 Eran para hoy — ¿las cerraste?</p>
          <ul style="margin:0;padding-left:20px;color:#1f2937;font-size:13px;line-height:1.9;">
            ${stillOpen.slice(0, 4).map(t => `<li>${trunc(t.title)}</li>`).join('')}
          </ul>
        </div>` : ''

    const tomorrowBlock = dueTomorrow.length > 0
      ? `<div style="background:#eff6ff;border-left:4px solid #3b82f6;padding:14px 18px;margin-bottom:16px;border-radius:6px;">
          <p style="margin:0 0 8px;font-weight:700;color:#1d4ed8;font-size:14px;">📋 ${isFriday ? 'El lunes arrancás con esto' : 'Mañana tenés esto'}</p>
          <ul style="margin:0;padding-left:20px;color:#1f2937;font-size:13px;line-height:1.9;">
            ${dueTomorrow.slice(0, 3).map(t => `<li>${trunc(t.title)}</li>`).join('')}
          </ul>
        </div>` : ''

    const allGood = (overdue.length === 0 && stillOpen.length === 0)
      ? `<div style="background:#f0fdf4;border-left:4px solid #16a34a;padding:14px 18px;margin-bottom:16px;border-radius:6px;">
          <p style="margin:0;color:#15803d;font-size:14px;">✅ Todo limpio Tefy. Excelente día 🔥</p>
        </div>` : ''

    const checklist = `
      <div style="background:#f8fafc;border-radius:8px;padding:14px 18px;border:1px solid #e2e8f0;">
        <p style="margin:0 0 10px;font-size:13px;font-weight:700;color:#0f172a;">Checklist cierre:</p>
        <table style="width:100%;font-size:13px;color:#475569;">
          <tr><td style="padding:4px 0;width:20px;">☐</td><td>Revisé métricas de RMONIA, YASMIN y AMURA</td></tr>
          <tr><td style="padding:4px 0;">☐</td><td>Mandé reporte diario al cliente (si aplica)</td></tr>
          <tr><td style="padding:4px 0;">☐</td><td>Pausé o ajusté lo que estaba quemando presupuesto</td></tr>
          <tr><td style="padding:4px 0;">☐</td><td>Actualicé el estado de mis tareas en AgencyAi</td></tr>
          ${isFriday ? '<tr><td style="padding:4px 0;">☐</td><td>Todo ordenado para el lunes</td></tr>' : ''}
        </table>
      </div>`

    const closeNote = isFriday
      ? `<p style="font-size:13px;color:#94a3b8;margin:16px 0 0;text-align:center;">Buen finde Tefy 🙌 Nos vemos el lunes.</p>`
      : `<p style="font-size:13px;color:#94a3b8;margin:16px 0 0;text-align:center;">Cualquier cosa me avisás. Mañana de vuelta 💪</p>`

    const html = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <div style="max-width:560px;margin:20px auto;padding:0 12px;">
    <div style="background:white;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.06);">

      <div style="background:linear-gradient(135deg,#1e293b 0%,#334155 100%);padding:22px 24px;">
        <h1 style="margin:0;font-size:18px;color:white;font-weight:800;letter-spacing:-0.3px;">Cierre del día Tefy 🌆</h1>
        <p style="margin:5px 0 0;color:#94a3b8;font-size:13px;">${dayName} ${dateStr} · Logística CEOON</p>
      </div>

      <div style="padding:22px 24px;">
        <p style="margin:0 0 20px;color:#334155;font-size:15px;line-height:1.6;font-weight:500;">${greeting}</p>
        ${overdueAlert}${stillOpenAlert}${allGood}${checklist}
        <div style="margin-top:16px;">${tomorrowBlock}</div>

        <div style="text-align:center;margin-top:22px;">
          <a href="https://agencyai-iota.vercel.app/tasks"
             style="display:inline-block;background:#1e293b;color:white;padding:11px 22px;border-radius:8px;text-decoration:none;font-size:13px;font-weight:700;">
            Actualizar tareas →
          </a>
        </div>
        ${closeNote}
      </div>

      <div style="background:#f8fafc;padding:12px 24px;border-top:1px solid #f1f5f9;text-align:center;">
        <p style="margin:0;font-size:11px;color:#94a3b8;">Ceonyx · Agente IA — Logística CEOON · 6:00 PM</p>
      </div>
    </div>
  </div>
</body>
</html>`

    const subject = isFriday
      ? `Cierre de semana Tefy 🏁 — ${dayName} ${argNow.getUTCDate()} ${monthShort}`
      : `Cierre del día Tefy — ${dayName} ${argNow.getUTCDate()} ${monthShort}`

    if (process.env.GMAIL_APP_PASSWORD) {
      const transporter = getTransporter()
      await transporter.sendMail({ from: FROM_ADDRESS, to: STEPHANY_EMAIL, cc: RAFAEL_EMAIL, subject, html })
    }

    return NextResponse.json({
      success: true,
      emailSent: !!process.env.GMAIL_APP_PASSWORD,
      summary: { overdue: overdue.length, stillOpen: stillOpen.length, dueTomorrow: dueTomorrow.length },
    })
  } catch (error: any) {
    console.error('Stephany evening error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
