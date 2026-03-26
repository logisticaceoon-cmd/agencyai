import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { Resend } from 'resend'

export async function GET(request: Request) {
  const resend = new Resend(process.env.RESEND_API_KEY)
  // Verify cron secret
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const now = new Date()
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000)

    // Gather data
    const [completedTasks, pendingTasks, reports, overdueTasks, users] = await Promise.all([
      prisma.task.count({ where: { status: 'completed', updatedAt: { gte: yesterday } } }),
      prisma.task.count({ where: { status: { in: ['pending', 'in_progress'] } } }),
      prisma.report.findMany({
        where: { createdAt: { gte: yesterday } },
        include: { submittedBy: { select: { fullName: true } } },
      }),
      prisma.task.findMany({
        where: { deadline: { lt: now }, status: { in: ['pending', 'in_progress'] } },
        select: { title: true, deadline: true },
        take: 10,
      }),
      prisma.user.findMany({
        where: { status: 'active' },
        select: { id: true, fullName: true, department: true },
      }),
    ])

    const teamStats = await Promise.all(
      users.map(async (u) => {
        const [tasksCompleted, reportsSubmitted] = await Promise.all([
          prisma.task.count({
            where: { assignedTo: { has: u.id }, status: 'completed', updatedAt: { gte: yesterday } },
          }),
          prisma.report.count({
            where: { submittedById: u.id, createdAt: { gte: yesterday } },
          }),
        ])
        return { ...u, tasksCompleted, reportsSubmitted }
      })
    )

    const ceoEmail = process.env.CEO_EMAIL
    if (!ceoEmail) {
      return NextResponse.json({ error: 'CEO_EMAIL not configured' }, { status: 500 })
    }

    const html = `
      <!DOCTYPE html>
      <html>
      <head><meta charset="utf-8"><style>
        body { font-family: Arial, sans-serif; background: #0a0a0a; color: #fff; margin: 0; padding: 0; }
        .container { max-width: 600px; margin: 0 auto; padding: 24px; }
        .header { background: #6366f1; padding: 24px; border-radius: 12px; text-align: center; margin-bottom: 24px; }
        .header h1 { margin: 0; font-size: 24px; }
        .card { background: #111; border: 1px solid #2a2a2a; border-radius: 8px; padding: 16px; margin-bottom: 16px; }
        .kpi-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 24px; }
        .kpi { background: #1a1a1a; border-radius: 8px; padding: 16px; text-align: center; }
        .kpi-value { font-size: 32px; font-weight: bold; color: #6366f1; }
        .kpi-label { font-size: 12px; color: #a1a1aa; }
        table { width: 100%; border-collapse: collapse; }
        th, td { padding: 8px 12px; text-align: left; border-bottom: 1px solid #2a2a2a; }
        th { color: #a1a1aa; font-size: 12px; }
        .alert { background: #ef444420; border: 1px solid #ef444450; border-radius: 8px; padding: 12px; margin-bottom: 8px; }
        .btn { display: inline-block; background: #6366f1; color: #fff; padding: 12px 24px; border-radius: 8px; text-decoration: none; }
      </style></head>
      <body>
        <div class="container">
          <div class="header">
            <h1>⚡ AgencyAI</h1>
            <p style="margin:4px 0;color:#c7d2fe">Resumen del ${now.toLocaleDateString('es-AR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
          </div>

          <div class="kpi-grid">
            <div class="kpi"><div class="kpi-value">${completedTasks}</div><div class="kpi-label">Tareas completadas ayer</div></div>
            <div class="kpi"><div class="kpi-value">${pendingTasks}</div><div class="kpi-label">Tareas pendientes</div></div>
            <div class="kpi"><div class="kpi-value">${reports.length}</div><div class="kpi-label">Reportes del día</div></div>
            <div class="kpi"><div class="kpi-value">${overdueTasks.length}</div><div class="kpi-label">Tareas vencidas</div></div>
          </div>

          <div class="card">
            <h3 style="margin:0 0 12px">Estado del equipo</h3>
            <table>
              <thead><tr><th>Persona</th><th>Tareas completadas</th><th>Reportes</th></tr></thead>
              <tbody>
                ${teamStats.map((m) => `<tr><td>${m.fullName}</td><td>${m.tasksCompleted}</td><td>${m.reportsSubmitted}</td></tr>`).join('')}
              </tbody>
            </table>
          </div>

          ${overdueTasks.length > 0 ? `
          <div class="card">
            <h3 style="margin:0 0 12px;color:#ef4444">⚠️ Alertas críticas</h3>
            ${overdueTasks.map((t) => `<div class="alert"><strong>${t.title}</strong><br><small>Venció: ${t.deadline?.toLocaleDateString('es-AR')}</small></div>`).join('')}
          </div>` : ''}

          <div style="text-align:center;margin-top:24px">
            <a href="${process.env.NEXT_PUBLIC_APP_URL}" class="btn">Ver app completa →</a>
          </div>
        </div>
      </body>
      </html>
    `

    await resend.emails.send({
      from: process.env.EMAIL_FROM || 'noreply@agencyai.com',
      to: ceoEmail,
      subject: `🌅 Resumen AgencyAI — ${now.toLocaleDateString('es-AR')}`,
      html,
    })

    return NextResponse.json({ success: true, sentTo: ceoEmail })
  } catch (error) {
    console.error('Daily digest error:', error)
    return NextResponse.json({ error: 'Failed to send digest' }, { status: 500 })
  }
}
