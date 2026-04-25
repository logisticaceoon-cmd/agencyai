import { NextResponse } from 'next/server'
import nodemailer from 'nodemailer'

// 20:00 UTC = 17:00 (5 PM) Argentina
export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET
  if (cronSecret && request.headers.get('authorization') !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const supabaseUrl = process.env.SUPABASE_URL_REAL || ''
    const supabaseKey = process.env.SUPABASE_SERVICE_KEY_REAL || ''
    const workspaceId = '41b4b8ab-2483-418d-bb29-d39084ca36f0'

    // Argentina "today" and "today+2"
    const argNow = new Date(Date.now() - 3 * 60 * 60 * 1000)
    const argToday = new Date(argNow)
    argToday.setUTCHours(0, 0, 0, 0)
    const argPlus2 = new Date(argToday.getTime() + 2 * 24 * 60 * 60 * 1000)

    const todayStr = argToday.toISOString().split('T')[0]
    const plus2Str = argPlus2.toISOString().split('T')[0]

    // Pull tasks with due_date between today and today+2, not completed
    const res = await fetch(
      `${supabaseUrl}/rest/v1/tasks?workspace_id=eq.${workspaceId}&status=neq.completed&status=neq.cancelled&due_date=gte.${todayStr}&due_date=lte.${plus2Str}&select=title,status,due_date,assigned_to,priority&order=due_date.asc`,
      { headers: { apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}` } }
    )
    const tasks = await res.json()
    if (!Array.isArray(tasks) || tasks.length === 0) {
      return NextResponse.json({ success: true, message: 'No hay tareas próximas a vencer' })
    }

    const MONTHS_ES = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic']
    const formatDate = (d: string) => {
      const dt = new Date(d + 'T00:00:00Z')
      return `${dt.getUTCDate()} ${MONTHS_ES[dt.getUTCMonth()]}`
    }

    const dueToday = tasks.filter((t: any) => t.due_date === todayStr)
    const due2Days = tasks.filter((t: any) => t.due_date !== todayStr)

    let html = `
    <div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px">
      <h2 style="color:#0f172a;border-bottom:2px solid #e2e8f0;padding-bottom:12px">⏰ Alerta de Tareas — Logística CEOON</h2>
      <p style="color:#64748b;font-size:14px">Reporte diario · ${formatDate(todayStr)} · Ceonyx</p>`

    if (dueToday.length > 0) {
      html += `<div style="background:#fef2f2;border-left:4px solid #ef4444;padding:16px;border-radius:8px;margin:20px 0">
        <h3 style="color:#dc2626;margin:0 0 12px">🚨 Vencen HOY (${dueToday.length})</h3>`
      dueToday.forEach((t: any) => {
        const assignee = t.assigned_to || 'Sin asignar'
        const priority = t.priority ? `[${t.priority.toUpperCase()}]` : ''
        html += `<div style="background:white;border-radius:6px;padding:10px 14px;margin:6px 0;border:1px solid #fecaca">
          <strong>${t.title}</strong> ${priority}<br>
          <span style="color:#64748b;font-size:13px">👤 ${assignee} · Estado: ${t.status}</span>
        </div>`
      })
      html += `</div>`
    }

    if (due2Days.length > 0) {
      html += `<div style="background:#fffbeb;border-left:4px solid #f59e0b;padding:16px;border-radius:8px;margin:20px 0">
        <h3 style="color:#d97706;margin:0 0 12px">⚠️ Vencen en 2 días (${due2Days.length})</h3>`
      due2Days.forEach((t: any) => {
        const assignee = t.assigned_to || 'Sin asignar'
        const priority = t.priority ? `[${t.priority.toUpperCase()}]` : ''
        html += `<div style="background:white;border-radius:6px;padding:10px 14px;margin:6px 0;border:1px solid #fde68a">
          <strong>${t.title}</strong> ${priority}<br>
          <span style="color:#64748b;font-size:13px">👤 ${assignee} · Vence: ${formatDate(t.due_date)} · Estado: ${t.status}</span>
        </div>`
      })
      html += `</div>`
    }

    html += `
      <p style="color:#94a3b8;font-size:12px;margin-top:32px;border-top:1px solid #e2e8f0;padding-top:16px">
        Ceonyx · Agente IA — Logística CEOON
      </p>
    </div>`

    const transporter = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 465,
      secure: true,
      auth: { user: 'logisticaceoon@gmail.com', pass: process.env.GMAIL_APP_PASSWORD },
    })

    await transporter.sendMail({
      from: '"Ceonyx · CEOON" <logisticaceoon@gmail.com>',
      to: 'logisticaceoon@gmail.com',
      subject: `⏰ ${dueToday.length > 0 ? `🚨 ${dueToday.length} tarea(s) vencen HOY` : `⚠️ ${due2Days.length} tarea(s) vencen en 2 días`} — CEOON`,
      html,
    })

    return NextResponse.json({ success: true, dueToday: dueToday.length, due2Days: due2Days.length })
  } catch (err: any) {
    console.error('task-alerts error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
