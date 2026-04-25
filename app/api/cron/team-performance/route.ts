import { NextResponse } from 'next/server'
import nodemailer from 'nodemailer'

// 0 12 * * 1 = Monday 9 AM Argentina (12:00 UTC)
export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET
  if (cronSecret && request.headers.get('authorization') !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const supabaseUrl = process.env.SUPABASE_URL_REAL || ''
    const supabaseKey = process.env.SUPABASE_SERVICE_KEY_REAL || ''
    const workspaceId = '41b4b8ab-2483-418d-bb29-d39084ca36f0'

    // Last week boundaries in Argentina time
    const argNow = new Date(Date.now() - 3 * 60 * 60 * 1000)
    const weekStart = new Date(argNow)
    weekStart.setUTCDate(argNow.getUTCDate() - 7)
    weekStart.setUTCHours(0, 0, 0, 0)
    const weekEnd = new Date(argNow)
    weekEnd.setUTCHours(0, 0, 0, 0)
    // Convert to UTC for DB
    const utcStart = new Date(weekStart.getTime() + 3 * 60 * 60 * 1000).toISOString()
    const utcEnd = new Date(weekEnd.getTime() + 3 * 60 * 60 * 1000).toISOString()

    const MONTHS_ES = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic']
    const fmtDate = (d: Date) => `${d.getUTCDate()} ${MONTHS_ES[d.getUTCMonth()]}`

    // Get ALL tasks (to analyze per member)
    const res = await fetch(
      `${supabaseUrl}/rest/v1/tasks?workspace_id=eq.${workspaceId}&select=title,status,assigned_to,due_date,updated_at,priority&limit=500`,
      { headers: { apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}` } }
    )
    const allTasks = await res.json()
    if (!Array.isArray(allTasks)) throw new Error('No se pudieron obtener tareas')

    // Group by assigned_to
    const memberMap: Record<string, any> = {}
    allTasks.forEach((t: any) => {
      const member = t.assigned_to || 'Sin asignar'
      if (!memberMap[member]) memberMap[member] = { completed: [], inProgress: [], overdue: [], pending: [] }
      const isOverdue = t.due_date && new Date(t.due_date) < argNow && t.status !== 'completed' && t.status !== 'cancelled'
      const completedThisWeek = t.status === 'completed' && new Date(t.updated_at) >= new Date(utcStart)

      if (completedThisWeek) memberMap[member].completed.push(t)
      else if (isOverdue) memberMap[member].overdue.push(t)
      else if (t.status === 'in_progress') memberMap[member].inProgress.push(t)
      else if (t.status === 'pending' || t.status === 'todo') memberMap[member].pending.push(t)
    })

    // Build email
    const analysisMap: Record<string, string> = {
      good: '✅ Rendimiento sólido. Mantener el ritmo.',
      ok: '⚠️ Rendimiento aceptable. Hay espacio para mejorar el cierre de tareas.',
      low: '🔴 Rendimiento bajo. Requiere atención — ver si necesita soporte o tiene bloqueos.',
      overdue: '🚨 Tareas vencidas acumuladas. Esto es prioridad para esta semana.',
    }

    const scoreAnalysis = (data: any) => {
      if (data.overdue.length >= 3) return analysisMap.overdue
      if (data.completed.length >= 5) return analysisMap.good
      if (data.completed.length >= 2) return analysisMap.ok
      return analysisMap.low
    }

    let membersHtml = ''
    for (const [member, data] of Object.entries(memberMap) as [string, any][]) {
      if (member === 'Sin asignar') continue
      const analysis = scoreAnalysis(data)
      const score = data.completed.length >= 5 ? 'ALTO' : data.completed.length >= 2 ? 'MEDIO' : 'BAJO'
      const scoreColor = score === 'ALTO' ? '#16a34a' : score === 'MEDIO' ? '#d97706' : '#dc2626'

      membersHtml += `
      <div style="background:#f8fafc;border-radius:10px;padding:20px;margin:16px 0;border:1px solid #e2e8f0">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">
          <h3 style="margin:0;color:#0f172a">👤 ${member}</h3>
          <span style="background:${scoreColor};color:white;padding:4px 12px;border-radius:20px;font-size:12px;font-weight:700">${score}</span>
        </div>
        <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-bottom:16px">
          <div style="text-align:center;background:white;border-radius:8px;padding:10px;border:1px solid #e2e8f0">
            <div style="font-size:24px;font-weight:700;color:#16a34a">${data.completed.length}</div>
            <div style="font-size:11px;color:#64748b">Completadas</div>
          </div>
          <div style="text-align:center;background:white;border-radius:8px;padding:10px;border:1px solid #e2e8f0">
            <div style="font-size:24px;font-weight:700;color:#2563eb">${data.inProgress.length}</div>
            <div style="font-size:11px;color:#64748b">En progreso</div>
          </div>
          <div style="text-align:center;background:white;border-radius:8px;padding:10px;border:1px solid #e2e8f0">
            <div style="font-size:24px;font-weight:700;color:#64748b">${data.pending.length}</div>
            <div style="font-size:11px;color:#64748b">Pendientes</div>
          </div>
          <div style="text-align:center;background:white;border-radius:8px;padding:10px;border:1px solid #fecaca">
            <div style="font-size:24px;font-weight:700;color:#dc2626">${data.overdue.length}</div>
            <div style="font-size:11px;color:#64748b">Vencidas</div>
          </div>
        </div>
        ${data.completed.length > 0 ? `
        <div style="margin-bottom:12px">
          <strong style="font-size:13px;color:#16a34a">✅ Cerradas esta semana:</strong>
          <ul style="margin:6px 0;padding-left:20px;color:#374151;font-size:13px">
            ${data.completed.map((t: any) => `<li>${t.title}</li>`).join('')}
          </ul>
        </div>` : ''}
        ${data.overdue.length > 0 ? `
        <div style="background:#fef2f2;border-radius:6px;padding:10px;margin-bottom:12px">
          <strong style="font-size:13px;color:#dc2626">🚨 Tareas vencidas:</strong>
          <ul style="margin:6px 0;padding-left:20px;color:#374151;font-size:13px">
            ${data.overdue.map((t: any) => `<li>${t.title} (vencía ${t.due_date})</li>`).join('')}
          </ul>
        </div>` : ''}
        <div style="background:#eff6ff;border-radius:6px;padding:12px;font-size:13px;color:#1e40af">
          <strong>Análisis Ceonyx:</strong> ${analysis}
        </div>
      </div>`
    }

    const html = `
    <div style="font-family:sans-serif;max-width:640px;margin:0 auto;padding:24px">
      <h2 style="color:#0f172a;border-bottom:2px solid #e2e8f0;padding-bottom:12px">
        📊 Reporte Semanal del Equipo
      </h2>
      <p style="color:#64748b;font-size:14px">
        Semana del ${fmtDate(weekStart)} al ${fmtDate(weekEnd)} · Ceonyx · Logística CEOON
      </p>
      ${membersHtml}
      <p style="color:#94a3b8;font-size:12px;margin-top:32px;border-top:1px solid #e2e8f0;padding-top:16px">
        Ceonyx · Agente IA — Logística CEOON · Reporte automático cada lunes
      </p>
    </div>`

    const transporter = nodemailer.createTransport({
      host: 'smtp.gmail.com', port: 465, secure: true,
      auth: { user: 'logisticaceoon@gmail.com', pass: process.env.GMAIL_APP_PASSWORD },
    })

    await transporter.sendMail({
      from: '"Ceonyx · CEOON" <logisticaceoon@gmail.com>',
      to: 'logisticaceoon@gmail.com',
      subject: `📊 Reporte Semanal Equipo — semana del ${fmtDate(weekStart)}`,
      html,
    })

    return NextResponse.json({ success: true, members: Object.keys(memberMap).length })
  } catch (err: any) {
    console.error('team-performance error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
