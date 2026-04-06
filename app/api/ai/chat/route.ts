import { NextResponse } from 'next/server'
import { getAuthContext, isAuthError } from '@/lib/auth-supabase'

export async function POST(request: Request) {
  try {
    const auth = await getAuthContext()
    if (isAuthError(auth)) return auth
    const { supabase, workspaceId, userId } = auth

    const body = await request.json()
    const { messages, message, module } = body

    if (!message && (!messages || messages.length === 0)) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 })
    }

    // Get AI config for this workspace
    const { data: aiConfig } = await supabase
      .from('workspace_ai_config')
      .select('*')
      .eq('workspace_id', workspaceId)
      .maybeSingle()

    // Get professional type context
    const { data: workspaceRow } = await supabase
      .from('workspaces')
      .select('professional_type_id')
      .eq('id', workspaceId)
      .maybeSingle()

    let professionalContext = ''
    let professionalName = 'agencia'
    if (workspaceRow?.professional_type_id) {
      const { data: ptype } = await supabase
        .from('professional_types')
        .select('name, ai_agent_context')
        .eq('id', workspaceRow.professional_type_id)
        .maybeSingle()
      if (ptype) {
        professionalContext = ptype.ai_agent_context || ''
        professionalName = ptype.name || 'agencia'
      }
    }

    // Get workspace context
    const workspaceContext = await getWorkspaceContext(supabase, workspaceId)

    const agentName = aiConfig?.agent_name || 'Asistente AgencyAI'
    const personality = aiConfig?.agent_personality || 'profesional'

    const personalityDesc =
      personality === 'amigable' ? 'cercana y calida' :
      personality === 'directo' ? 'concisa y al punto' :
      personality === 'motivacional' ? 'motivadora y energica' :
      personality === 'analitico' ? 'analitica y basada en datos' :
      'profesional pero accesible'

    const now = new Date()
    const dateStr = now.toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' })

    const systemPrompt = `Sos ${agentName}, el asistente de IA para ${professionalName}.
${professionalContext ? professionalContext + '\n' : ''}Tu personalidad es: ${personality}. Respondes de forma ${personalityDesc}.
Hoy es ${dateStr}.

DATOS ACTUALES DE LA AGENCIA:
- Clientes activos: ${workspaceContext.activeClients}
- Proyectos activos: ${workspaceContext.activeProjects}
- Tareas vencidas: ${workspaceContext.overdueTasks}
${workspaceContext.overdueList.length > 0 ? `- Tareas vencidas: ${workspaceContext.overdueList.map((t: any) => `"${t.title}"`).join(', ')}` : ''}
- Tareas de hoy: ${workspaceContext.todayTasks}
${workspaceContext.todayList.length > 0 ? `- Tareas de hoy: ${workspaceContext.todayList.map((t: any) => `"${t.title}"`).join(', ')}` : ''}
- Ingresos del mes: $${workspaceContext.monthlyIncome.toLocaleString()}
- Modulo actual: ${module || 'dashboard'}

CAPACIDADES:
Podes ejecutar acciones reales. Cuando el usuario pide ejecutar algo, responde normalmente
Y al final agrega exactamente este formato (sin espacios extra):
[ACTION:{"type":"TIPO","data":{...}}]

Tipos de accion disponibles:
- create_task: {"title":"X","priority":"high|medium|low","dueDate":"YYYY-MM-DD","description":"X"}
- complete_task: {"taskId":"X"}
- create_report: {"title":"X","type":"weekly|monthly"}
- get_tasks: {}
- get_projects: {}

IMPORTANTE:
- Se conversacional. Hace UNA pregunta a la vez.
- No hagas listas enormes sin que te las pidan.
- Cuando el usuario salude, responde con saludo contextual del dia y UNA pregunta concreta.
- Si el mensaje empieza con [SISTEMA:] es un trigger automatico, responde como si fuera un saludo inicial.
- Habla en espanol neutro latinoamericano (tu, tienes, puedes).
- Maximo 1-2 emojis por mensaje.`

    // Build API messages
    const apiMessages = messages && messages.length > 0
      ? messages
      : [{ role: 'user' as const, content: message }]

    let responseText = ''

    // Determine provider
    const anthropicKey = aiConfig?.anthropic_api_key || process.env.ANTHROPIC_API_KEY
    const openaiKey = aiConfig?.openai_api_key || process.env.OPENAI_API_KEY
    const provider = aiConfig?.ai_provider || 'anthropic'
    const hasValidAnthropicKey = anthropicKey && anthropicKey !== 'YOUR_KEY' && anthropicKey.startsWith('sk-ant-')
    const hasValidOpenaiKey = openaiKey && openaiKey !== 'YOUR_KEY' && openaiKey.startsWith('sk-')

    let usedAI = false

    if (provider === 'openai' && hasValidOpenaiKey) {
      // OpenAI
      try {
        const res = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${openaiKey}` },
          body: JSON.stringify({
            model: 'gpt-4o-mini',
            max_tokens: 1000,
            messages: [{ role: 'system', content: systemPrompt }, ...apiMessages],
          }),
        })
        if (res.ok) {
          const data = await res.json()
          responseText = data.choices?.[0]?.message?.content || ''
          usedAI = true
        }
      } catch { /* fall through */ }
    }

    if (!usedAI && hasValidAnthropicKey) {
      // Anthropic
      try {
        const res = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': anthropicKey!,
            'anthropic-version': '2023-06-01',
          },
          body: JSON.stringify({
            model: 'claude-sonnet-4-20250514',
            max_tokens: 1000,
            system: systemPrompt,
            messages: apiMessages,
          }),
        })
        if (res.ok) {
          const data = await res.json()
          responseText = data.content?.[0]?.text || ''
          usedAI = true
        }
      } catch { /* fall through */ }
    }

    if (!usedAI && !hasValidAnthropicKey && hasValidOpenaiKey) {
      // Try OpenAI as fallback
      try {
        const res = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${openaiKey}` },
          body: JSON.stringify({
            model: 'gpt-4o-mini',
            max_tokens: 1000,
            messages: [{ role: 'system', content: systemPrompt }, ...apiMessages],
          }),
        })
        if (res.ok) {
          const data = await res.json()
          responseText = data.choices?.[0]?.message?.content || ''
          usedAI = true
        }
      } catch { /* fall through */ }
    }

    if (!usedAI) {
      // Smart fallback without AI
      const lastMsg = message || apiMessages[apiMessages.length - 1]?.content || ''
      responseText = generateSmartFallback(workspaceContext, lastMsg, agentName)
    }

    // Parse action from response
    let action = null
    let cleanText = responseText

    const actionMatch = responseText.match(/\[ACTION:(\{.*?\})\]/)
    if (actionMatch) {
      try {
        action = JSON.parse(actionMatch[1])
        cleanText = responseText.replace(/\[ACTION:\{.*?\}\]/, '').trim()
      } catch { /* ignore malformed JSON */ }
    }

    // Log conversation (best-effort)
    supabase.from('ai_conversations').insert({
      workspace_id: workspaceId,
      user_id: userId,
      module: module || 'dashboard',
      message: message || apiMessages[apiMessages.length - 1]?.content,
      response: cleanText,
    }).then(() => {}, () => {})

    return NextResponse.json({
      response: cleanText,
      action,
      provider: usedAI ? provider : 'fallback',
      hasAI: usedAI || hasValidAnthropicKey || hasValidOpenaiKey,
    })
  } catch (err) {
    console.error('Error en /api/ai/chat:', err)
    return NextResponse.json({
      response: 'Hubo un error al procesar tu mensaje. Intenta de nuevo.',
      action: null,
      hasAI: false,
    })
  }
}

async function getWorkspaceContext(supabase: any, workspaceId: string) {
  const now = new Date()
  const todayStr = now.toISOString().split('T')[0]
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()

  const [clientsRes, projectsRes, overdueRes, todayRes, incomeRes] = await Promise.all([
    supabase.from('clients').select('id', { count: 'exact', head: true })
      .eq('workspace_id', workspaceId).eq('status', 'active'),
    supabase.from('projects').select('id', { count: 'exact', head: true })
      .eq('workspace_id', workspaceId).eq('status', 'active'),
    supabase.from('tasks').select('id, title')
      .eq('workspace_id', workspaceId).in('status', ['pending', 'in_progress'])
      .lt('deadline', todayStr).not('deadline', 'is', null).limit(5),
    supabase.from('tasks').select('id, title, priority')
      .eq('workspace_id', workspaceId).in('status', ['pending', 'in_progress'])
      .gte('deadline', todayStr).lt('deadline', new Date(now.getTime() + 86400000).toISOString().split('T')[0])
      .limit(5),
    supabase.from('transactions').select('amount')
      .eq('workspace_id', workspaceId).eq('type', 'income').gte('date', monthStart),
  ])

  return {
    activeClients: clientsRes.count || 0,
    activeProjects: projectsRes.count || 0,
    overdueTasks: overdueRes.data?.length || 0,
    overdueList: overdueRes.data || [],
    todayTasks: todayRes.data?.length || 0,
    todayList: todayRes.data || [],
    monthlyIncome: (incomeRes.data || []).reduce((s: number, t: any) => s + Number(t.amount || 0), 0),
  }
}

function generateSmartFallback(ctx: any, userMessage: string, agentName: string): string {
  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Buenos dias' : hour < 19 ? 'Buenas tardes' : 'Buenas noches'
  const lower = userMessage.toLowerCase()

  if (lower.includes('[sistema:') || lower.includes('hola') || lower.includes('buenos') || lower.includes('buenas')) {
    let msg = `${greeting}! Soy ${agentName}. `
    if (ctx.overdueTasks > 0) {
      msg += `Tenes ${ctx.overdueTasks} tarea${ctx.overdueTasks > 1 ? 's' : ''} vencida${ctx.overdueTasks > 1 ? 's' : ''} que necesitan atencion. `
    }
    if (ctx.todayTasks > 0) {
      msg += `Hoy vencen ${ctx.todayTasks} tarea${ctx.todayTasks > 1 ? 's' : ''}. `
    }
    msg += `Tenes ${ctx.activeClients} clientes y ${ctx.activeProjects} proyectos activos. `
    msg += '\n\nPara activar mis capacidades completas de IA, configura tu API key en "Agente de IA". Queres que te lleve a la configuracion?'
    return msg
  }

  if (lower.includes('tarea') || lower.includes('pendiente') || lower.includes('urgente')) {
    return `Tenes ${ctx.overdueTasks} tareas vencidas y ${ctx.todayTasks} para hoy. Para respuestas mas detalladas, configura tu API key de Claude o ChatGPT en la seccion "Agente de IA".`
  }

  if (lower.includes('proyecto')) {
    return `Tenes ${ctx.activeProjects} proyectos activos. Para un analisis detallado, configura tu API key en "Agente de IA".`
  }

  if (lower.includes('reporte') || lower.includes('analisis') || lower.includes('mes')) {
    return `Este mes llevas $${ctx.monthlyIncome.toLocaleString()} en ingresos con ${ctx.activeClients} clientes activos. Para un analisis completo con IA, configura tu API key en "Agente de IA".`
  }

  return `Entendi tu mensaje. Para respuestas inteligentes y contextuales, configura tu API key de Claude o ChatGPT en la seccion "Agente de IA". Queres ir a configurarla?`
}
