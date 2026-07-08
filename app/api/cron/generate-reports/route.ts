import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import nodemailer from 'nodemailer'

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

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const supabase = createAdminClient()
    const now = new Date().toISOString()
    const results: Array<{ template_id: string; report_id?: string; error?: string; email_sent?: boolean }> = []

    // Find templates due for generation
    const { data: templates, error: fetchError } = await supabase
      .from('report_templates')
      .select('*, clients(id, name, email)')
      .eq('is_scheduled', true)
      .lte('next_generation_at', now)

    if (fetchError) {
      console.error('Error fetching templates:', fetchError)
      return NextResponse.json({ error: 'Error al buscar plantillas' }, { status: 500 })
    }

    if (!templates || templates.length === 0) {
      return NextResponse.json({ success: true, message: 'No hay plantillas pendientes', generated: 0 })
    }

    for (const template of templates) {
      try {
        const sections = (template.sections as Array<{ type: string; enabled: boolean; title: string }>) || []
        const enabledSections = sections.filter(s => s.enabled)
        const workspaceId = template.workspace_id
        const clientId = template.client_id

        // Build report content by fetching real data for each section
        const reportContent: Record<string, unknown> = {}
        const generationLog: Array<{ section: string; status: string; count?: number }> = []

        // Date range: last period based on frequency
        const periodEnd = new Date()
        const periodStart = new Date()
        switch (template.schedule_frequency) {
          case 'weekly':
            periodStart.setDate(periodStart.getDate() - 7)
            break
          case 'biweekly':
            periodStart.setDate(periodStart.getDate() - 14)
            break
          case 'monthly':
            periodStart.setMonth(periodStart.getMonth() - 1)
            break
          case 'quarterly':
            periodStart.setMonth(periodStart.getMonth() - 3)
            break
          default:
            periodStart.setMonth(periodStart.getMonth() - 1)
        }

        const periodStartISO = periodStart.toISOString()
        const periodEndISO = periodEnd.toISOString()

        for (const section of enabledSections) {
          try {
            switch (section.type) {
              case 'completed_tasks': {
                let query = supabase
                  .from('tasks')
                  .select('id, title, status, priority, completed_at')
                  .eq('workspace_id', workspaceId)
                  .eq('status', 'completed')
                  .gte('completed_at', periodStartISO)
                  .lte('completed_at', periodEndISO)
                  .order('completed_at', { ascending: false })
                  .limit(50)

                if (clientId) query = query.eq('client_id', clientId)
                const { data: tasks } = await query
                reportContent.completed_tasks = {
                  title: section.title,
                  count: tasks?.length || 0,
                  items: (tasks || []).map(t => ({ id: t.id, title: t.title, priority: t.priority })),
                }
                generationLog.push({ section: section.type, status: 'ok', count: tasks?.length || 0 })
                break
              }

              case 'active_projects': {
                let query = supabase
                  .from('projects')
                  .select('id, name, status, progress, deadline')
                  .eq('workspace_id', workspaceId)
                  .in('status', ['active', 'in_progress'])
                  .order('name')
                  .limit(20)

                if (clientId) query = query.eq('client_id', clientId)
                const { data: projects } = await query
                reportContent.active_projects = {
                  title: section.title,
                  count: projects?.length || 0,
                  items: (projects || []).map(p => ({
                    id: p.id,
                    name: p.name,
                    status: p.status,
                    progress: p.progress || 0,
                    deadline: p.deadline,
                  })),
                }
                generationLog.push({ section: section.type, status: 'ok', count: projects?.length || 0 })
                break
              }

              case 'kpis': {
                let query = supabase
                  .from('kpis')
                  .select('id, name, current_value, target_value, unit, category')
                  .eq('workspace_id', workspaceId)
                  .limit(20)

                if (clientId) query = query.eq('client_id', clientId)
                const { data: kpis } = await query
                reportContent.kpis = {
                  title: section.title,
                  count: kpis?.length || 0,
                  items: (kpis || []).map(k => ({
                    id: k.id,
                    name: k.name,
                    current: k.current_value,
                    target: k.target_value,
                    unit: k.unit,
                    progress: k.target_value ? Math.round((k.current_value / k.target_value) * 100) : 0,
                  })),
                }
                generationLog.push({ section: section.type, status: 'ok', count: kpis?.length || 0 })
                break
              }

              case 'time_summary': {
                let query = supabase
                  .from('time_entries')
                  .select('hours, description')
                  .eq('workspace_id', workspaceId)
                  .gte('date', periodStartISO)
                  .lte('date', periodEndISO)

                if (clientId) query = query.eq('client_id', clientId)
                const { data: entries } = await query
                const totalHours = (entries || []).reduce((sum, e) => sum + (e.hours || 0), 0)
                reportContent.time_summary = {
                  title: section.title,
                  total_hours: Math.round(totalHours * 10) / 10,
                  entries_count: entries?.length || 0,
                }
                generationLog.push({ section: section.type, status: 'ok', count: entries?.length || 0 })
                break
              }

              case 'financial_summary': {
                let incomeQuery = supabase
                  .from('finances')
                  .select('amount')
                  .eq('workspace_id', workspaceId)
                  .eq('type', 'income')
                  .gte('date', periodStartISO)
                  .lte('date', periodEndISO)

                let expenseQuery = supabase
                  .from('finances')
                  .select('amount')
                  .eq('workspace_id', workspaceId)
                  .eq('type', 'expense')
                  .gte('date', periodStartISO)
                  .lte('date', periodEndISO)

                if (clientId) {
                  incomeQuery = incomeQuery.eq('client_id', clientId)
                  expenseQuery = expenseQuery.eq('client_id', clientId)
                }

                const [{ data: incomes }, { data: expenses }] = await Promise.all([
                  incomeQuery, expenseQuery,
                ])

                const totalIncome = (incomes || []).reduce((sum, i) => sum + (i.amount || 0), 0)
                const totalExpense = (expenses || []).reduce((sum, e) => sum + (e.amount || 0), 0)

                reportContent.financial_summary = {
                  title: section.title,
                  total_income: totalIncome,
                  total_expense: totalExpense,
                  net: totalIncome - totalExpense,
                }
                generationLog.push({ section: section.type, status: 'ok' })
                break
              }

              case 'executive_summary': {
                // Summary counts
                let tasksQuery = supabase
                  .from('tasks')
                  .select('id', { count: 'exact', head: true })
                  .eq('workspace_id', workspaceId)
                  .eq('status', 'completed')
                  .gte('completed_at', periodStartISO)

                let projectsQuery = supabase
                  .from('projects')
                  .select('id', { count: 'exact', head: true })
                  .eq('workspace_id', workspaceId)
                  .in('status', ['active', 'in_progress'])

                if (clientId) {
                  tasksQuery = tasksQuery.eq('client_id', clientId)
                  projectsQuery = projectsQuery.eq('client_id', clientId)
                }

                const [{ count: tasksCompleted }, { count: activeProjects }] = await Promise.all([
                  tasksQuery, projectsQuery,
                ])

                reportContent.executive_summary = {
                  title: section.title,
                  tasks_completed: tasksCompleted || 0,
                  active_projects: activeProjects || 0,
                  period: `${periodStart.toLocaleDateString('es-ES')} - ${periodEnd.toLocaleDateString('es-ES')}`,
                }
                generationLog.push({ section: section.type, status: 'ok' })
                break
              }

              case 'next_steps': {
                let query = supabase
                  .from('tasks')
                  .select('id, title, priority, deadline')
                  .eq('workspace_id', workspaceId)
                  .in('status', ['pending', 'in_progress'])
                  .order('deadline', { ascending: true, nullsFirst: false })
                  .limit(10)

                if (clientId) query = query.eq('client_id', clientId)
                const { data: upcoming } = await query
                reportContent.next_steps = {
                  title: section.title,
                  count: upcoming?.length || 0,
                  items: (upcoming || []).map(t => ({
                    id: t.id,
                    title: t.title,
                    priority: t.priority,
                    deadline: t.deadline,
                  })),
                }
                generationLog.push({ section: section.type, status: 'ok', count: upcoming?.length || 0 })
                break
              }

              default:
                generationLog.push({ section: section.type, status: 'skipped' })
            }
          } catch (sectionErr) {
            console.error(`Error generating section ${section.type}:`, sectionErr)
            generationLog.push({ section: section.type, status: 'error' })
          }
        }

        // Build report title
        const frequencyLabel: Record<string, string> = {
          weekly: 'Semanal',
          biweekly: 'Quincenal',
          monthly: 'Mensual',
          quarterly: 'Trimestral',
        }
        const freqText = frequencyLabel[template.schedule_frequency] || 'Periodico'
        const dateText = periodEnd.toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })
        const clientName = template.clients?.name || ''
        const reportTitle = `${template.name} — ${freqText} ${dateText}${clientName ? ` — ${clientName}` : ''}`

        // Insert report (reports table uses camelCase for original columns)
        const { data: report, error: insertError } = await supabase
          .from('reports')
          .insert({
            workspace_id: workspaceId,
            title: reportTitle,
            reportType: template.report_type || 'monthly',
            content: reportContent,
            status: 'draft',
            clientId: clientId || null,
            submittedById: template.created_by || 'system',
            template_id: template.id,
            auto_generated: true,
            generation_log: generationLog,
          })
          .select()
          .single()

        if (insertError) {
          console.error('Error inserting report:', insertError)
          results.push({ template_id: template.id, error: insertError.message })
          continue
        }

        // Update template timestamps
        const nextGen = calculateNextGeneration(
          template.schedule_frequency,
          template.schedule_day ?? 1
        )

        await supabase
          .from('report_templates')
          .update({
            last_generated_at: new Date().toISOString(),
            next_generation_at: nextGen,
            updated_at: new Date().toISOString(),
          })
          .eq('id', template.id)

        // Send email if auto_send and client has email
        let emailSent = false
        if (template.auto_send && template.clients?.email && process.env.GMAIL_APP_PASSWORD) {
          try {
            const reportUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'https://agencyai-iota.vercel.app'}/reports/${report.id}`
            const transporter = getTransporter()
            await transporter.sendMail({
              from: FROM_ADDRESS,
              to: template.clients.email,
              subject: `Nuevo reporte: ${reportTitle}`,
              html: buildReportEmail(reportTitle, clientName, reportContent, reportUrl),
            })
            emailSent = true
          } catch (emailErr) {
            console.error('Error sending report email:', emailErr)
          }
        }

        results.push({ template_id: template.id, report_id: report.id, email_sent: emailSent })
      } catch (templateErr) {
        console.error(`Error processing template ${template.id}:`, templateErr)
        results.push({ template_id: template.id, error: String(templateErr) })
      }
    }

    return NextResponse.json({
      success: true,
      generated: results.filter(r => r.report_id).length,
      errors: results.filter(r => r.error).length,
      results,
    })
  } catch (error) {
    console.error('Generate reports cron error:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}

function calculateNextGeneration(frequency: string, day: number): string {
  const now = new Date()
  const next = new Date(now)

  switch (frequency) {
    case 'weekly': {
      const targetDay = day % 7
      const currentDay = now.getDay()
      let daysUntil = targetDay - currentDay
      if (daysUntil <= 0) daysUntil += 7
      next.setDate(now.getDate() + daysUntil)
      next.setHours(7, 0, 0, 0)
      break
    }
    case 'biweekly': {
      const targetDay = day % 7
      const currentDay = now.getDay()
      let daysUntil = targetDay - currentDay
      if (daysUntil <= 0) daysUntil += 14
      next.setDate(now.getDate() + daysUntil)
      next.setHours(7, 0, 0, 0)
      break
    }
    case 'monthly': {
      const targetDayOfMonth = Math.min(Math.max(day, 1), 28)
      if (now.getDate() >= targetDayOfMonth) {
        next.setMonth(now.getMonth() + 1)
      }
      next.setDate(targetDayOfMonth)
      next.setHours(7, 0, 0, 0)
      break
    }
    case 'quarterly': {
      const currentMonth = now.getMonth()
      const nextQuarterMonth = Math.ceil((currentMonth + 1) / 3) * 3
      next.setMonth(nextQuarterMonth)
      next.setDate(Math.min(Math.max(day, 1), 28))
      next.setHours(7, 0, 0, 0)
      break
    }
  }

  return next.toISOString()
}

function buildReportEmail(
  title: string,
  clientName: string,
  content: Record<string, unknown>,
  reportUrl: string,
): string {
  const summary = content.executive_summary as { tasks_completed?: number; active_projects?: number; period?: string } | undefined
  const financial = content.financial_summary as { total_income?: number; total_expense?: number; net?: number } | undefined

  let statsHtml = ''
  if (summary) {
    statsHtml += `<div style="display:flex;gap:16px;margin-bottom:16px;">
      <div style="flex:1;background:#eff6ff;border-radius:8px;padding:16px;text-align:center;">
        <p style="margin:0;font-size:24px;font-weight:700;color:#1d4ed8;">${summary.tasks_completed || 0}</p>
        <p style="margin:4px 0 0;font-size:12px;color:#6b7280;">Tareas completadas</p>
      </div>
      <div style="flex:1;background:#f0fdf4;border-radius:8px;padding:16px;text-align:center;">
        <p style="margin:0;font-size:24px;font-weight:700;color:#16a34a;">${summary.active_projects || 0}</p>
        <p style="margin:4px 0 0;font-size:12px;color:#6b7280;">Proyectos activos</p>
      </div>
    </div>`
  }

  if (financial) {
    const formatCurrency = (n: number) => new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(n)
    statsHtml += `<div style="background:#f9fafb;border-radius:8px;padding:16px;margin-bottom:16px;">
      <p style="margin:0 0 8px;font-weight:600;color:#374151;">Resumen financiero</p>
      <p style="margin:0;font-size:13px;color:#6b7280;">Ingresos: <strong style="color:#16a34a;">${formatCurrency(financial.total_income || 0)}</strong> | Gastos: <strong style="color:#dc2626;">${formatCurrency(financial.total_expense || 0)}</strong></p>
    </div>`
  }

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <div style="max-width:580px;margin:24px auto;padding:0 12px;">
    <div style="background:white;border-radius:12px;overflow:hidden;box-shadow:0 1px 6px rgba(0,0,0,0.08);">
      <div style="background:linear-gradient(135deg,#0f172a 0%,#1e3a5f 100%);padding:24px 28px;">
        <h1 style="margin:0;font-size:18px;color:white;font-weight:700;">Nuevo reporte disponible</h1>
        <p style="margin:6px 0 0;color:#94a3b8;font-size:13px;">${clientName ? `Para ${clientName} — ` : ''}${title}</p>
      </div>
      <div style="padding:24px 28px;">
        ${statsHtml}
        <div style="text-align:center;margin-top:24px;">
          <a href="${reportUrl}"
             style="display:inline-block;background:#2563eb;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;font-size:14px;font-weight:600;">
            Ver reporte completo
          </a>
        </div>
        <p style="font-size:12px;color:#9ca3af;margin:20px 0 0;text-align:center;">
          Reporte generado automaticamente por AgencyAI
        </p>
      </div>
    </div>
  </div>
</body>
</html>`
}
