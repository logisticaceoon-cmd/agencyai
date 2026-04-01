import { NextResponse } from 'next/server'
import { getAuthContext, isAuthError } from '@/lib/auth-supabase'

export async function POST(request: Request) {
  const auth = await getAuthContext()
  if (isAuthError(auth)) return auth
  const { supabase, workspaceId } = auth

  try {
    const body = await request.json()
    const { userName = 'Usuario', agentName = 'Asistente', agentPersonality = 'profesional' } = body

    const now = new Date()
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
    const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000).toISOString()
    const twoDaysFromNow = new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000).toISOString()

    // Fetch all workspace data in parallel
    const [
      tasksRes,
      projectsRes,
      clientsRes,
      incomeRes,
      expensesRes,
      kpisRes,
    ] = await Promise.all([
      supabase.from('tasks').select('id, title, status, priority, deadline, updatedAt').eq('workspace_id', workspaceId),
      supabase.from('projects').select('id, name, status, progressPercent, updatedAt').eq('workspace_id', workspaceId).eq('status', 'active'),
      supabase.from('clients').select('id, name, status, updatedAt').eq('workspace_id', workspaceId).eq('status', 'active'),
      supabase.from('transactions').select('amount').eq('workspace_id', workspaceId).eq('type', 'income').gte('date', monthStart),
      supabase.from('transactions').select('amount').eq('workspace_id', workspaceId).eq('type', 'expense').gte('date', monthStart),
      supabase.from('kpis').select('id, name, currentValue, targetValue').eq('workspace_id', workspaceId),
    ])

    const tasks = tasksRes.data || []
    const projects = projectsRes.data || []
    const clients = clientsRes.data || []

    // Process data
    const overdueTasks = tasks.filter(t => t.deadline && new Date(t.deadline) < now && t.status !== 'completed' && t.status !== 'done')
    const urgentTasks = tasks.filter(t => t.deadline && new Date(t.deadline) >= now && new Date(t.deadline) <= new Date(twoDaysFromNow) && t.status !== 'completed' && t.status !== 'done')
    const inProgressTasks = tasks.filter(t => t.status === 'in_progress')
    const inactiveClients = clients.filter(c => c.updatedAt && new Date(c.updatedAt) < new Date(fourteenDaysAgo))
    const atRiskProjects = projects.filter(p => p.updatedAt && new Date(p.updatedAt) < new Date(new Date().getTime() - 5 * 24 * 60 * 60 * 1000))
    const avgProgress = projects.length > 0 ? Math.round(projects.reduce((s, p) => s + (p.progressPercent || 0), 0) / projects.length) : 0

    const income = (incomeRes.data || []).reduce((s, t) => s + Number(t.amount || 0), 0)
    const expenses = (expensesRes.data || []).reduce((s, t) => s + Number(t.amount || 0), 0)
    const margin = income > 0 ? Math.round(((income - expenses) / income) * 100) : 0

    const underperformingKPIs = (kpisRes.data || []).filter(k => k.targetValue && k.currentValue < k.targetValue)

    const contextData = `
TAREAS:
- Vencidas: ${overdueTasks.length > 0 ? overdueTasks.slice(0, 5).map(t => `"${t.title}"`).join(', ') : 'Ninguna'}
- Urgentes (vencen en 48h): ${urgentTasks.length > 0 ? urgentTasks.slice(0, 5).map(t => `"${t.title}"`).join(', ') : 'Ninguna'}
- En progreso: ${inProgressTasks.length}

PROYECTOS:
- En riesgo (sin actividad 5+ dias): ${atRiskProjects.length > 0 ? atRiskProjects.map(p => `"${p.name}"`).join(', ') : 'Ninguno'}
- Progreso promedio: ${avgProgress}%
- Total activos: ${projects.length}

CLIENTES:
- Sin actividad 14+ dias: ${inactiveClients.length > 0 ? inactiveClients.map(c => `"${c.name}"`).join(', ') : 'Ninguno'}
- Total activos: ${clients.length}

FINANZAS MES:
- Ingresos: $${income.toLocaleString()}
- Gastos: $${expenses.toLocaleString()}
- Margen: ${margin}%

KPIs POR DEBAJO DEL OBJETIVO:
${underperformingKPIs.length > 0 ? underperformingKPIs.map(k => `- ${k.name}: ${k.currentValue}/${k.targetValue}`).join('\n') : 'Todos en objetivo'}`

    const systemPrompt = `Sos ${agentName}, asistente de IA de la agencia de ${userName}.
Analizaste TODO el workspace y tenes estos datos:
${contextData}

Genera un analisis ejecutivo completo con:
1. RESUMEN EJECUTIVO (2-3 oraciones del estado general)
2. ALERTAS URGENTES (lo que necesita atencion inmediata)
3. PLAN PARA HOY (3-5 acciones concretas priorizadas)
4. RECOMENDACIONES ESTRATEGICAS (2-3 acciones de mediano plazo)
5. UNA PREGUNTA: pregunta si queres que ejecute alguna de estas acciones automaticamente

Se especifico, usa los nombres reales de tareas/clientes/proyectos.
Maximo 400 palabras. Formato con emojis para mejor lectura. Habla en espanol rioplatense.`

    // Try AI APIs
    const anthropicKey = process.env.ANTHROPIC_API_KEY
    const openaiKey = process.env.OPENAI_API_KEY

    if (anthropicKey && anthropicKey !== 'YOUR_KEY' && anthropicKey.startsWith('sk-ant-')) {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': anthropicKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 1500,
          system: systemPrompt,
          messages: [{ role: 'user', content: 'Analiza todo mi workspace y dame el reporte ejecutivo.' }],
        }),
      })

      if (res.ok) {
        const data = await res.json()
        return NextResponse.json({
          analysis: data.content?.[0]?.text || '',
          data: { overdueTasks: overdueTasks.length, urgentTasks: urgentTasks.length, inactiveClients: inactiveClients.length, income, expenses, margin },
        })
      }
    }

    if (openaiKey && openaiKey !== 'YOUR_KEY' && openaiKey.startsWith('sk-')) {
      const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${openaiKey}` },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          max_tokens: 1500,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: 'Analiza todo mi workspace y dame el reporte ejecutivo.' },
          ],
        }),
      })

      if (res.ok) {
        const data = await res.json()
        return NextResponse.json({
          analysis: data.choices?.[0]?.message?.content || '',
          data: { overdueTasks: overdueTasks.length, urgentTasks: urgentTasks.length, inactiveClients: inactiveClients.length, income, expenses, margin },
        })
      }
    }

    // Fallback
    let analysis = `📊 **RESUMEN EJECUTIVO**\nTu agencia tiene ${projects.length} proyecto${projects.length !== 1 ? 's' : ''} activo${projects.length !== 1 ? 's' : ''} y ${clients.length} cliente${clients.length !== 1 ? 's' : ''}.`

    if (overdueTasks.length > 0) {
      analysis += `\n\n🚨 **ALERTAS URGENTES**\nTenes ${overdueTasks.length} tarea${overdueTasks.length > 1 ? 's' : ''} vencida${overdueTasks.length > 1 ? 's' : ''}: ${overdueTasks.slice(0, 3).map(t => `"${t.title}"`).join(', ')}.`
    }

    if (inactiveClients.length > 0) {
      analysis += `\n\n👥 ${inactiveClients.length} cliente${inactiveClients.length > 1 ? 's' : ''} sin actividad en 14+ dias: ${inactiveClients.map(c => c.name).join(', ')}.`
    }

    analysis += `\n\n📋 **PLAN PARA HOY**\n1. Resolver las tareas vencidas mas urgentes\n2. Revisar el progreso de los proyectos activos\n3. Contactar clientes sin actividad reciente`

    analysis += `\n\n💰 **FINANZAS DEL MES**\nIngresos: $${income.toLocaleString()} | Gastos: $${expenses.toLocaleString()} | Margen: ${margin}%`

    analysis += `\n\n❓ Queres que cree las tareas del plan como items en tu tablero?`

    return NextResponse.json({
      analysis,
      data: { overdueTasks: overdueTasks.length, urgentTasks: urgentTasks.length, inactiveClients: inactiveClients.length, income, expenses, margin },
    })
  } catch (err) {
    console.error('Autonomous analysis error:', err)
    return NextResponse.json({ error: 'Error al analizar' }, { status: 500 })
  }
}
