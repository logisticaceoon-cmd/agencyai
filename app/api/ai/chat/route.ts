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

    // Get workspace info
    const { data: workspaceRow } = await supabase
      .from('workspaces')
      .select('name, professional_type_id, owner_id')
      .eq('id', workspaceId)
      .maybeSingle()

    // Get current user profile
    const { data: currentUser } = await supabase
      .from('users')
      .select('id, email, fullName, role, department')
      .eq('id', userId)
      .maybeSingle()

    const userName = currentUser?.fullName || currentUser?.email || 'Usuario'
    const userRole = currentUser?.role || 'Equipo'
    const isOwner = workspaceRow?.owner_id === userId

    // Get workspace context (general)
    const workspaceContext = await getWorkspaceContext(supabase, workspaceId)

    // Get user-specific context (tasks and clients assigned to this user)
    const userContext = await getUserContext(supabase, workspaceId, userId)

    // Build Ceonyx persona system prompt
    const now = new Date()
    const dateStr = now.toLocaleDateString('es-AR', {
      weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
    })
    const timeStr = now.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })

    const agencyName = workspaceRow?.name || 'la agencia'
    const agentName = 'Ceonyx'

    const ownerContext = isOwner ? `
Estás hablando con ${userName}, el CEO y fundador de la agencia.
- Tiene acceso completo a todo el sistema
- Priorizar siempre por: 1) impacto en ingresos, 2) crecimiento, 3) urgencia real
- Máximo 3 tareas críticas por día
- Es directo — no quiere listas largas ni texto de relleno
- Si se está dispersando en tareas de bajo valor, señalarlo
` : `
Estás hablando con ${userName}, ${userRole} del equipo.
- Sus clientes asignados: ${userContext.assignedClientNames.length > 0 ? userContext.assignedClientNames.join(', ') : 'ver tareas asignadas'}
- Tiene acceso a sus tareas y clientes asignados
- Ser claro, directo y práctico en las respuestas
`

    const systemPrompt = `Sos ${agentName}, el agente de inteligencia artificial interno de ${agencyName}.

IDENTIDAD:
- Nombre: Ceonyx
- Rol: Agente de IA — ${agencyName}
- Carácter: Directo, sin relleno. Hablás como socio senior, no como asistente. Tenés criterio propio.
- Cuando algo está mal lo decís. Cuando está bien lo reconocés en una línea y seguís.
- Hablás en español latinoamericano. Sin emojis excesivos.
- Firmás siempre como: Ceonyx · Agente IA — ${agencyName}

CONTEXTO DEL USUARIO:
${ownerContext}

CONTEXTO HOY — ${dateStr} ${timeStr}:
- Clientes activos en la agencia: ${workspaceContext.activeClients}
- Proyectos activos: ${workspaceContext.activeProjects}
- Ingresos del mes: $${workspaceContext.monthlyIncome.toLocaleString()}

TAREAS ASIGNADAS A ${userName.toUpperCase()}:
- Pendientes/En progreso: ${userContext.pendingTasks} tareas
- Vencidas: ${userContext.overdueTasks} tareas${userContext.overdueList.length > 0 ? '\n  → ' + userContext.overdueList.map((t: any) => `"${t.title}"`).join(', ') : ''}
- Para hoy: ${userContext.todayTasks} tareas${userContext.todayList.length > 0 ? '\n  → ' + userContext.todayList.map((t: any) => `"${t.title}"`).join(', ') : ''}

TAREAS GENERALES DEL WORKSPACE:
- Vencidas en total: ${workspaceContext.overdueTasks}
- Para hoy en total: ${workspaceContext.todayTasks}
- Módulo actual: ${module || 'dashboard'}

CAPACIDADES — ACCIONES EJECUTABLES:
Cuando el usuario pida ejecutar algo, respondé normalmente y al final agregá exactamente:
[ACTION:{"type":"TIPO","data":{...}}]

Tipos disponibles:
- create_task: {"title":"X","priority":"high|medium|low","dueDate":"YYYY-MM-DD","description":"X"}
- complete_task: {"taskId":"X"}
- create_report: {"title":"X","type":"weekly|monthly"}
- get_tasks: {}
- get_projects: {}

REGLAS DE COMUNICACIÓN:
- Sé conversacional. Una pregunta a la vez.
- No hagas listas largas sin que te las pidan.
- Si el mensaje empieza con [SISTEMA:] es un trigger automático, respondé como saludo inicial contextual.
- Máximo 2 emojis por mensaje.
- Cuando alguien saluda, respondé con el estado real de sus tareas del día.`

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

    if (!usedAI && hasValidOpenaiKey) {
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
      responseText = generateSmartFallback(workspaceContext, userContext, userName, message || apiMessages[apiMessages.length - 1]?.content || '')
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
      agent: agentName,
    })
  } catch (err) {
    console.error('Error en /api/ai/chat:', err)
    return NextResponse.json({
      response: 'Hubo un error al procesar tu mensaje. Intenta de nuevo.',
      action: null,
      hasAI: false,
      agent: 'Ceonyx',
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
      .lt('deadline', todayStr).not('deadline', 'is', null).is('deleted_at', null).limit(5),
    supabase.from('tasks').select('id, title, priority')
      .eq('workspace_id', workspaceId).in('status', ['pending', 'in_progress'])
      .gte('deadline', `${todayStr}T00:00:00Z`)
      .lte('deadline', `${todayStr}T23:59:59Z`)
      .is('deleted_at', null).limit(5),
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

async function getUserContext(supabase: any, workspaceId: string, userId: string) {
  const now = new Date()
  const todayStr = now.toISOString().split('T')[0]

  const [assignedRes, overdueRes, todayRes, clientsRes] = await Promise.all([
    // All pending tasks assigned to this user
    supabase.from('tasks').select('id, title, status, priority, deadline, clientId')
      .eq('workspace_id', workspaceId)
      .in('status', ['pending', 'in_progress'])
      .contains('assignedTo', [userId])
      .is('deleted_at', null)
      .limit(20),
    // Overdue tasks for this user
    supabase.from('tasks').select('id, title, deadline')
      .eq('workspace_id', workspaceId)
      .in('status', ['pending', 'in_progress'])
      .contains('assignedTo', [userId])
      .lt('deadline', todayStr)
      .not('deadline', 'is', null)
      .is('deleted_at', null)
      .limit(5),
    // Today's tasks for this user
    supabase.from('tasks').select('id, title, priority')
      .eq('workspace_id', workspaceId)
      .in('status', ['pending', 'in_progress'])
      .contains('assignedTo', [userId])
      .gte('deadline', `${todayStr}T00:00:00Z`)
      .lte('deadline', `${todayStr}T23:59:59Z`)
      .is('deleted_at', null)
      .limit(5),
    // Clients in workspace (for context)
    supabase.from('clients').select('id, name')
      .eq('workspace_id', workspaceId)
      .eq('status', 'active')
      .limit(10),
  ])

  return {
    pendingTasks: assignedRes.data?.length || 0,
    overdueTasks: overdueRes.data?.length || 0,
    overdueList: overdueRes.data || [],
    todayTasks: todayRes.data?.length || 0,
    todayList: todayRes.data || [],
    assignedClientNames: (clientsRes.data || []).map((c: any) => c.name),
  }
}

function generateSmartFallback(
  ctx: any,
  userCtx: any,
  userName: string,
  userMessage: string
): string {
  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Buenos días' : hour < 19 ? 'Buenas tardes' : 'Buenas noches'
  const lower = userMessage.toLowerCase()

  if (lower.includes('[sistema:') || lower.includes('hola') || lower.includes('buenos') || lower.includes('buenas')) {
    let msg = `${greeting}, ${userName}. `
    if (userCtx.overdueTasks > 0) {
      msg += `Tenés ${userCtx.overdueTasks} tarea${userCtx.overdueTasks > 1 ? 's' : ''} vencida${userCtx.overdueTasks > 1 ? 's' : ''}. `
    }
    if (userCtx.todayTasks > 0) {
      msg += `Hoy vencen ${userCtx.todayTasks} tarea${userCtx.todayTasks > 1 ? 's' : ''}. `
    }
    if (userCtx.pendingTasks === 0 && userCtx.overdueTasks === 0) {
      msg += `No tenés tareas pendientes asignadas. `
    }
    msg += '\n\nPara mis capacidades completas de IA, configurá la API key en Ajustes → Agente de IA.'
    return msg
  }

  if (lower.includes('tarea') || lower.includes('pendiente')) {
    return `Tenés ${userCtx.pendingTasks} tareas pendientes (${userCtx.overdueTasks} vencidas, ${userCtx.todayTasks} para hoy). Para análisis detallado, configurá la API key en Ajustes.`
  }

  return `Entendido. Para respuestas completas con IA, configurá tu API key en Ajustes → Agente de IA.`
}
