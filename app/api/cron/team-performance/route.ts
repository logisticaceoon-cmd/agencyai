import { NextResponse } from 'next/server'
import nodemailer from 'nodemailer'

export const maxDuration = 60

// ─── QuickChart URL builder ───────────────────────────────────────────────────
function chartUrl(cfg: object): string {
  return `https://quickchart.io/chart?c=${encodeURIComponent(JSON.stringify(cfg))}&w=520&h=240&bkg=white&f=png`
}

function barChart(labels: string[], data: number[][], dataLabels: string[], colors: string[], title: string) {
  return chartUrl({
    type: 'bar',
    data: {
      labels,
      datasets: dataLabels.map((lbl, i) => ({
        label: lbl,
        data: data[i],
        backgroundColor: colors[i],
        borderRadius: 4,
      })),
    },
    options: {
      plugins: { title: { display: false }, legend: { position: 'bottom', labels: { font: { size: 11 } } } },
      scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } },
    },
  })
}

function lineChart(labels: string[], datasets: { label: string; data: number[]; color: string }[], title: string) {
  return chartUrl({
    type: 'line',
    data: {
      labels,
      datasets: datasets.map(d => ({
        label: d.label,
        data: d.data,
        borderColor: d.color,
        backgroundColor: d.color + '22',
        tension: 0.3,
        pointRadius: 4,
        fill: true,
      })),
    },
    options: {
      plugins: { title: { display: false }, legend: { position: 'bottom', labels: { font: { size: 11 } } } },
      scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } },
    },
  })
}

// PDF generation removed — report sent as HTML email

// ─── HTML template ────────────────────────────────────────────────────────────
function buildHtml(data: {
  weekLabel: string
  members: {
    name: string
    role: string
    color: string
    weekly: { completed: number; inProgress: number; overdue: number; pending: number }
    monthlyWeeks: { label: string; completed: number }[]
    completedTasks: string[]
    overdueItems: { title: string; due: string }[]
    analysis: string
    score: 'ALTO' | 'MEDIO' | 'BAJO'
  }[]
}) {
  const scoreColors: Record<string, string> = { ALTO: '#16a34a', MEDIO: '#d97706', BAJO: '#dc2626' }
  const scoreEmoji: Record<string, string> = { ALTO: '🟢', MEDIO: '🟡', BAJO: '🔴' }

  const totalCompleted = data.members.reduce((s, m) => s + m.weekly.completed, 0)
  const totalOverdue = data.members.reduce((s, m) => s + m.weekly.overdue, 0)

  // Summary bar chart (all members side by side)
  const summaryChart = barChart(
    data.members.map(m => m.name.split(' ')[0]),
    [
      data.members.map(m => m.weekly.completed),
      data.members.map(m => m.weekly.inProgress),
      data.members.map(m => m.weekly.overdue),
    ],
    ['Completadas', 'En progreso', 'Vencidas'],
    ['#16a34a', '#2563eb', '#dc2626'],
    'Resumen equipo'
  )

  let memberSections = ''
  for (const m of data.members) {
    const weeklyChart = barChart(
      ['Completadas', 'En progreso', 'Vencidas', 'Pendientes'],
      [[m.weekly.completed], [m.weekly.inProgress], [m.weekly.overdue], [m.weekly.pending]],
      ['Esta semana'],
      ['#16a34a', '#2563eb', '#dc2626', '#94a3b8'],
      'Semana'
    )
    const monthlyChart = lineChart(
      m.monthlyWeeks.map(w => w.label),
      [{ label: 'Completadas', data: m.monthlyWeeks.map(w => w.completed), color: m.color }],
      'Tendencia mensual'
    )

    const completedList = m.completedTasks.length > 0
      ? m.completedTasks.map(t => `<li>${t}</li>`).join('')
      : '<li style="color:#94a3b8">Sin tareas cerradas esta semana</li>'

    const overdueList = m.overdueItems.length > 0
      ? m.overdueItems.map(t => `<li><strong>${t.title}</strong> <span style="color:#dc2626">(vencía ${t.due})</span></li>`).join('')
      : '<li style="color:#94a3b8">Sin tareas vencidas ✅</li>'

    memberSections += `
    <div class="member-section" style="page-break-before: always">
      <div class="member-header" style="background:${m.color}">
        <div class="member-avatar">${m.name.charAt(0)}</div>
        <div>
          <h2 class="member-name">${m.name}</h2>
          <p class="member-role">${m.role}</p>
        </div>
        <div class="score-badge" style="background:${scoreColors[m.score]}">
          ${scoreEmoji[m.score]} ${m.score}
        </div>
      </div>

      <div class="kpi-row">
        <div class="kpi green"><div class="kpi-num">${m.weekly.completed}</div><div class="kpi-lbl">Completadas</div></div>
        <div class="kpi blue"><div class="kpi-num">${m.weekly.inProgress}</div><div class="kpi-lbl">En progreso</div></div>
        <div class="kpi red"><div class="kpi-num">${m.weekly.overdue}</div><div class="kpi-lbl">Vencidas</div></div>
        <div class="kpi gray"><div class="kpi-num">${m.weekly.pending}</div><div class="kpi-lbl">Pendientes</div></div>
      </div>

      <div class="charts-row">
        <div class="chart-box">
          <h4>Semana actual</h4>
          <img src="${weeklyChart}" />
        </div>
        <div class="chart-box">
          <h4>Tendencia mensual</h4>
          <img src="${monthlyChart}" />
        </div>
      </div>

      <div class="lists-row">
        <div class="list-box">
          <h4>✅ Cerradas esta semana</h4>
          <ul>${completedList}</ul>
        </div>
        <div class="list-box">
          <h4>🚨 Tareas vencidas</h4>
          <ul>${overdueList}</ul>
        </div>
      </div>

      <div class="analysis-box">
        <strong>Análisis Ceonyx:</strong> ${m.analysis}
      </div>
    </div>`
  }

  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  body { font-family: 'Segoe UI', Arial, sans-serif; color: #0f172a; background: white; }

  /* ── COVER ── */
  .cover {
    min-height: 100vh;
    background: linear-gradient(135deg, #0f172a 0%, #1e3a5f 60%, #0f172a 100%);
    display: flex; flex-direction: column;
    justify-content: center; align-items: center;
    padding: 60px 40px; text-align: center;
  }
  .cover-logo { font-size: 48px; margin-bottom: 24px; }
  .cover-title { font-size: 38px; font-weight: 800; color: white; margin-bottom: 8px; }
  .cover-sub { font-size: 20px; color: #94a3b8; margin-bottom: 40px; }
  .cover-week { background: rgba(255,255,255,0.08); border: 1px solid rgba(255,255,255,0.2);
    border-radius: 12px; padding: 20px 40px; color: white; font-size: 16px; margin-bottom: 32px; }
  .cover-kpis { display: flex; gap: 24px; margin-top: 16px; }
  .cover-kpi { background: rgba(255,255,255,0.1); border-radius: 12px; padding: 20px 32px; text-align: center; }
  .cover-kpi-num { font-size: 40px; font-weight: 800; color: white; }
  .cover-kpi-lbl { font-size: 13px; color: #94a3b8; margin-top: 4px; }
  .cover-footer { margin-top: 48px; color: #64748b; font-size: 13px; }

  /* ── SUMMARY PAGE ── */
  .summary-page { padding: 48px 40px; min-height: 100vh; }
  .page-title { font-size: 26px; font-weight: 700; color: #0f172a; margin-bottom: 6px; }
  .page-sub { font-size: 14px; color: #64748b; margin-bottom: 32px; border-bottom: 2px solid #e2e8f0; padding-bottom: 16px; }

  .summary-chart { text-align: center; margin-bottom: 32px; }
  .summary-chart img { max-width: 100%; border-radius: 12px; border: 1px solid #e2e8f0; }

  .summary-table { width: 100%; border-collapse: collapse; font-size: 14px; }
  .summary-table th { background: #0f172a; color: white; padding: 12px 16px; text-align: left; }
  .summary-table td { padding: 12px 16px; border-bottom: 1px solid #f1f5f9; }
  .summary-table tr:nth-child(even) td { background: #f8fafc; }
  .badge { display: inline-block; padding: 3px 10px; border-radius: 20px; font-size: 11px; font-weight: 700; color: white; }

  /* ── MEMBER SECTION ── */
  .member-section { padding: 40px; min-height: 100vh; }
  .member-header { border-radius: 14px; padding: 24px 28px; display: flex; align-items: center; gap: 20px; margin-bottom: 24px; }
  .member-avatar { width: 56px; height: 56px; border-radius: 50%; background: rgba(255,255,255,0.25);
    display: flex; align-items: center; justify-content: center; font-size: 24px; font-weight: 800; color: white; flex-shrink: 0; }
  .member-name { font-size: 22px; font-weight: 800; color: white; }
  .member-role { font-size: 14px; color: rgba(255,255,255,0.75); margin-top: 2px; }
  .score-badge { margin-left: auto; padding: 8px 18px; border-radius: 24px; font-size: 14px; font-weight: 700; color: white; }

  .kpi-row { display: flex; gap: 12px; margin-bottom: 24px; }
  .kpi { flex: 1; border-radius: 10px; padding: 16px; text-align: center; }
  .kpi.green { background: #f0fdf4; border: 1px solid #bbf7d0; }
  .kpi.blue { background: #eff6ff; border: 1px solid #bfdbfe; }
  .kpi.red { background: #fef2f2; border: 1px solid #fecaca; }
  .kpi.gray { background: #f8fafc; border: 1px solid #e2e8f0; }
  .kpi-num { font-size: 32px; font-weight: 800; }
  .kpi.green .kpi-num { color: #16a34a; }
  .kpi.blue .kpi-num { color: #2563eb; }
  .kpi.red .kpi-num { color: #dc2626; }
  .kpi.gray .kpi-num { color: #64748b; }
  .kpi-lbl { font-size: 12px; color: #64748b; margin-top: 4px; }

  .charts-row { display: flex; gap: 16px; margin-bottom: 24px; }
  .chart-box { flex: 1; background: #f8fafc; border-radius: 12px; padding: 16px; border: 1px solid #e2e8f0; }
  .chart-box h4 { font-size: 13px; color: #64748b; margin-bottom: 10px; text-transform: uppercase; letter-spacing: 0.5px; }
  .chart-box img { width: 100%; border-radius: 8px; }

  .lists-row { display: flex; gap: 16px; margin-bottom: 24px; }
  .list-box { flex: 1; background: #f8fafc; border-radius: 12px; padding: 16px; border: 1px solid #e2e8f0; }
  .list-box h4 { font-size: 13px; font-weight: 700; color: #0f172a; margin-bottom: 10px; }
  .list-box ul { padding-left: 18px; font-size: 13px; color: #374151; line-height: 1.8; }

  .analysis-box { background: #eff6ff; border-left: 4px solid #2563eb; border-radius: 8px; padding: 16px; font-size: 14px; color: #1e40af; }
  .analysis-box strong { display: block; margin-bottom: 4px; color: #1e3a8a; }
</style>
</head>
<body>

<!-- COVER -->
<div class="cover">
  <div class="cover-logo">📊</div>
  <h1 class="cover-title">Reporte Semanal del Equipo</h1>
  <p class="cover-sub">Logística CEOON</p>
  <div class="cover-week">
    <div style="color:#94a3b8;font-size:13px;margin-bottom:4px">PERÍODO</div>
    <div style="font-size:18px;font-weight:600">${data.weekLabel}</div>
  </div>
  <div class="cover-kpis">
    <div class="cover-kpi">
      <div class="cover-kpi-num">${data.members.length}</div>
      <div class="cover-kpi-lbl">Miembros evaluados</div>
    </div>
    <div class="cover-kpi">
      <div class="cover-kpi-num" style="color:#4ade80">${totalCompleted}</div>
      <div class="cover-kpi-lbl">Tareas cerradas</div>
    </div>
    <div class="cover-kpi">
      <div class="cover-kpi-num" style="color:#f87171">${totalOverdue}</div>
      <div class="cover-kpi-lbl">Tareas vencidas</div>
    </div>
  </div>
  <div class="cover-footer">Generado por Ceonyx · Agente IA — Logística CEOON</div>
</div>

<!-- SUMMARY PAGE -->
<div class="summary-page" style="page-break-before: always">
  <h2 class="page-title">Resumen del equipo</h2>
  <p class="page-sub">${data.weekLabel}</p>

  <div class="summary-chart">
    <img src="${summaryChart}" />
  </div>

  <table class="summary-table">
    <thead>
      <tr>
        <th>Miembro</th>
        <th>Rol</th>
        <th style="text-align:center">Completadas</th>
        <th style="text-align:center">En progreso</th>
        <th style="text-align:center">Vencidas</th>
        <th style="text-align:center">Rendimiento</th>
      </tr>
    </thead>
    <tbody>
      ${data.members.map(m => `
      <tr>
        <td><strong>${m.name}</strong></td>
        <td style="color:#64748b">${m.role}</td>
        <td style="text-align:center;color:#16a34a;font-weight:700">${m.weekly.completed}</td>
        <td style="text-align:center;color:#2563eb;font-weight:700">${m.weekly.inProgress}</td>
        <td style="text-align:center;color:#dc2626;font-weight:700">${m.weekly.overdue}</td>
        <td style="text-align:center">
          <span class="badge" style="background:${scoreColors[m.score]}">${m.score}</span>
        </td>
      </tr>`).join('')}
    </tbody>
  </table>
</div>

${memberSections}

</body>
</html>`
}

// ─── MAIN CRON ────────────────────────────────────────────────────────────────
export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET
  if (cronSecret && request.headers.get('authorization') !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const supabaseUrl = process.env.SUPABASE_URL_REAL || ''
    const supabaseKey = process.env.SUPABASE_SERVICE_KEY_REAL || ''
    const workspaceId = '41b4b8ab-2483-418d-bb29-d39084ca36f0'

    const argNow = new Date(Date.now() - 3 * 60 * 60 * 1000)
    const MONTHS_ES = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic']
    const fmtDate = (d: Date) => `${d.getUTCDate()} ${MONTHS_ES[d.getUTCMonth()]}`

    // Week boundaries
    const weekEnd = new Date(argNow); weekEnd.setUTCHours(0,0,0,0)
    const weekStart = new Date(weekEnd.getTime() - 7 * 86400000)
    const utcWeekStart = new Date(weekStart.getTime() + 3*3600000).toISOString()
    const utcWeekEnd = new Date(weekEnd.getTime() + 3*3600000).toISOString()
    const weekLabel = `${fmtDate(weekStart)} al ${fmtDate(weekEnd)} de ${weekEnd.getUTCFullYear()}`

    // Month boundaries (4 weeks back from today)
    const monthStart = new Date(weekEnd.getTime() - 28 * 86400000)

    // Fetch all tasks
    const res = await fetch(
      `${supabaseUrl}/rest/v1/tasks?workspace_id=eq.${workspaceId}&select=title,status,assigned_to,due_date,updated_at,priority&limit=500`,
      { headers: { apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}` } }
    )
    const allTasks = await res.json()
    if (!Array.isArray(allTasks)) throw new Error('Error obteniendo tareas')

    // Known team members (always include even with 0 tasks)
    const teamMembers: Record<string, { name: string; role: string; color: string }> = {
      'rafael': { name: 'Rafael Betancourt', role: 'CEO', color: '#1e3a5f' },
      'rafaelb2512@gmail.com': { name: 'Rafael Betancourt', role: 'CEO', color: '#1e3a5f' },
      'stephany': { name: 'Stephany Peñaloza', role: 'Trafficker & Estratega', color: '#7c3aed' },
      'stephany.acp@gmail.com': { name: 'Stephany Peñaloza', role: 'Trafficker & Estratega', color: '#7c3aed' },
      'jessica': { name: 'Jessica Porras', role: 'Marketing & Redes', color: '#0891b2' },
      'jessicaporras39266@gmail.com': { name: 'Jessica Porras', role: 'Marketing & Redes', color: '#0891b2' },
    }

    // Group tasks by member
    const memberData: Record<string, any> = {}

    const getOrCreate = (key: string) => {
      const info = teamMembers[key?.toLowerCase()] || { name: key || 'Sin asignar', role: 'Equipo', color: '#64748b' }
      const canonical = info.name
      if (!memberData[canonical]) {
        memberData[canonical] = { ...info, weekly: { completed:0, inProgress:0, overdue:0, pending:0 },
          completedTasks: [], overdueItems: [],
          monthlyWeeks: [
            { label: `S1`, completed: 0 },
            { label: `S2`, completed: 0 },
            { label: `S3`, completed: 0 },
            { label: `S4 (esta)`, completed: 0 },
          ]
        }
      }
      return canonical
    }

    allTasks.forEach((t: any) => {
      const canonical = getOrCreate(t.assigned_to)
      if (canonical === 'Sin asignar') return
      const d = memberData[canonical]
      const updatedAt = new Date(t.updated_at)
      const dueDate = t.due_date ? new Date(t.due_date + 'T00:00:00Z') : null
      const isCompleted = t.status === 'completed'
      const isOverdue = dueDate && dueDate < argNow && !isCompleted && t.status !== 'cancelled'
      const completedThisWeek = isCompleted && updatedAt >= new Date(utcWeekStart) && updatedAt < new Date(utcWeekEnd)

      if (completedThisWeek) { d.weekly.completed++; d.completedTasks.push(t.title); d.monthlyWeeks[3].completed++ }
      else if (isOverdue) { d.weekly.overdue++; d.overdueItems.push({ title: t.title, due: t.due_date }) }
      else if (t.status === 'in_progress') d.weekly.inProgress++
      else if (t.status !== 'cancelled') d.weekly.pending++

      // Monthly trend - tasks completed in prev 3 weeks
      if (isCompleted && updatedAt >= new Date(monthStart.getTime() + 3*3600000) && updatedAt < new Date(utcWeekStart)) {
        const weekAgo = (weekEnd.getTime() - updatedAt.getTime()) / 86400000
        if (weekAgo <= 14) d.monthlyWeeks[2].completed++
        else if (weekAgo <= 21) d.monthlyWeeks[1].completed++
        else d.monthlyWeeks[0].completed++
      }
    })

    // Score analysis
    const scoreAnalysis = (d: any): { score: 'ALTO'|'MEDIO'|'BAJO'; analysis: string } => {
      if (d.overdueItems.length >= 3) return { score: 'BAJO', analysis: `Tiene ${d.overdueItems.length} tareas vencidas acumuladas. Esto es prioridad crítica esta semana. Rafael: revisar si hay bloqueos o falta de claridad en las tareas.` }
      if (d.weekly.completed >= 5) return { score: 'ALTO', analysis: `Semana sólida: ${d.weekly.completed} tareas cerradas. Rendimiento por encima del promedio esperado. Mantener el ritmo.` }
      if (d.weekly.completed >= 2) return { score: 'MEDIO', analysis: `Rendimiento aceptable. ${d.weekly.completed} tareas cerradas. Hay espacio para mejorar el ritmo de cierre. Verificar si hay tareas bloqueadas.` }
      return { score: 'BAJO', analysis: `Solo ${d.weekly.completed} tarea(s) cerrada(s) esta semana. Rendimiento por debajo del esperado. Rafael: conversar para identificar qué está frenando.` }
    }

    const members = Object.values(memberData).filter((m: any) => m.name !== 'Sin asignar').map((m: any) => {
      const { score, analysis } = scoreAnalysis(m)
      return { ...m, score, analysis }
    })

    // Sort: CEO first, then by score
    const sortOrder: Record<string,number> = { 'Rafael Betancourt': 0, 'Stephany Peñaloza': 1, 'Jessica Porras': 2 }
    members.sort((a: any, b: any) => (sortOrder[a.name] ?? 99) - (sortOrder[b.name] ?? 99))

    // Generate HTML
    const html = buildHtml({ weekLabel, members })

    // Send email with HTML report directly
    const transporter = nodemailer.createTransport({
      host: 'smtp.gmail.com', port: 465, secure: true,
      auth: { user: 'logisticaceoon@gmail.com', pass: process.env.GMAIL_APP_PASSWORD },
    })

    const totalCompleted = members.reduce((s: number, m: any) => s + m.weekly.completed, 0)
    const totalOverdue = members.reduce((s: number, m: any) => s + m.weekly.overdue, 0)

    await transporter.sendMail({
      from: '"Ceonyx · CEOON" <logisticaceoon@gmail.com>',
      to: 'logisticaceoon@gmail.com',
      subject: `📊 Reporte Semanal Equipo — ${weekLabel} | ${totalCompleted} cerradas · ${totalOverdue} vencidas`,
      html,
    })

    return NextResponse.json({ success: true, weekLabel, members: members.length, totalCompleted, totalOverdue })
  } catch (err: any) {
    console.error('team-performance error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
