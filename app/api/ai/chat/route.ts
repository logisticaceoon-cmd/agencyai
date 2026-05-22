import { NextResponse } from 'next/server'
import { getAuthContext, isAuthError } from '@/lib/auth-supabase'

export async function POST(request: Request) {
  try {
    const auth = await getAuthContext()
    if (isAuthError(auth)) return auth
    const { supabase, workspaceId, userId } = auth

    const body = await request.json()
    const { messages, message, module, imageBase64, imageMimeType } = body

    if (!message && (!messages || messages.length === 0)) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 })
    }

    // Fetch all context in parallel
    const [aiConfigRes, workspaceRes, currentUserRes] = await Promise.all([
      supabase.from('workspace_ai_config').select('*').eq('workspace_id', workspaceId).maybeSingle(),
      supabase.from('workspaces').select('name, professional_type_id, owner_id').eq('id', workspaceId).maybeSingle(),
      supabase.from('users').select('id, email, fullName, role, department').eq('id', userId).maybeSingle(),
    ])

    const aiConfig = aiConfigRes.data
    const workspaceRow = workspaceRes.data
    const currentUser = currentUserRes.data

    const userName = currentUser?.fullName || currentUser?.email || 'Usuario'
    const userRole = (currentUser?.role || 'viewer') as string
    const isOwner = workspaceRow?.owner_id === userId
    const effectiveRole = isOwner ? 'owner' : userRole

    // Load role-specific AI context from DB
    const { data: roleCtx } = await supabase
      .from('role_ai_context')
      .select('*')
      .eq('role', effectiveRole)
      .maybeSingle()

    // Get workspace context (general) and user context
    const [workspaceContext, userContext] = await Promise.all([
      getWorkspaceContext(supabase, workspaceId),
      getUserContext(supabase, workspaceId, userId),
    ])

    // Build date/time
    const now = new Date()
    const dateStr = now.toLocaleDateString('es-AR', {
      weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
    })
    const timeStr = now.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })

    const agencyName = workspaceRow?.name || 'la agencia'
    const agentName = 'Ceonyx'

    // Role-based user context block
    const roleSystemAddition = roleCtx?.system_prompt_addition || (isOwner ? `
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
`)

    const toneInstruction = roleCtx?.tone_instruction || ''

    const allowedTopics = roleCtx?.allowed_topics as string[] | undefined
    const restrictedTopics = roleCtx?.restricted_topics as string[] | undefined
    const topicsBlock = [
      allowedTopics?.length ? `TEMAS PERMITIDOS PARA ESTE ROL: ${allowedTopics.join(', ')}` : '',
      restrictedTopics?.length ? `TEMAS RESTRINGIDOS — NO ABORDAR: ${restrictedTopics.join(', ')}` : '',
    ].filter(Boolean).join('\n')

    const canViewFinances = roleCtx?.can_view_finances ?? isOwner
    const canViewAllClients = roleCtx?.can_view_all_clients ?? isOwner
    const financesLine = canViewFinances
      ? `- Ingresos del mes: $${workspaceContext.monthlyIncome.toLocaleString()}`
      : ''

    const systemPrompt = `Sos ${agentName}, el agente de inteligencia artificial interno de ${agencyName}.

IDENTIDAD:
- Nombre: Ceonyx
- Rol: Agente de IA — ${agencyName}
- Carácter: Directo, sin relleno. Hablás como socio senior, no como asistente. Tenés criterio propio.
- Cuando algo está mal lo decís. Cuando está bien lo reconocés en una línea y seguís.
- Hablás en español latinoamericano. Sin emojis excesivos.
- NUNCA firmes los mensajes. Sin firma al final. Sin "Ceonyx · Agente IA" ni nada similar.
${toneInstruction ? `\nTONO: ${toneInstruction}` : ''}

ROL DEL USUARIO — ${(roleCtx?.display_name || effectiveRole).toUpperCase()}:
${roleSystemAddition.trim()}
${topicsBlock ? `\n${topicsBlock}` : ''}

CONTEXTO HOY — ${dateStr} ${timeStr}:
- Clientes activos en la agencia: ${canViewAllClients ? workspaceContext.activeClients : 'ver clientes asignados'}
- Proyectos activos: ${workspaceContext.activeProjects}
${financesLine}

TAREAS ASIGNADAS A ${userName.toUpperCase()}:
- Pendientes/En progreso: ${userContext.pendingTasks} tareas
- Vencidas: ${userContext.overdueTasks} tareas${userContext.overdueList.length > 0 ? '\n  → ' + userContext.overdueList.map((t: {title: string}) => `"${t.title}"`).join(', ') : ''}
- Para hoy: ${userContext.todayTasks} tareas${userContext.todayList.length > 0 ? '\n  → ' + userContext.todayList.map((t: {title: string}) => `"${t.title}"`).join(', ') : ''}
${canViewAllClients ? `
TAREAS GENERALES DEL WORKSPACE:
- Vencidas en total: ${workspaceContext.overdueTasks}
- Para hoy en total: ${workspaceContext.todayTasks}` : ''}
- Módulo actual: ${module || 'dashboard'}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
EXPERTISE — ESTRATEGA DE MARKETING DIGITAL
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Sos un experto de nivel senior en marketing digital con foco en e-commerce y tráfico pago.
Tu conocimiento abarca las estrategias de las mejores marcas del mundo y cómo escalarlas.

META ADS — DOMINIO TOTAL:
- Estructura de campañas: CBO vs ABO, cuándo usar cada una
- Fases de aprendizaje: cómo salir del learning, presupuestos mínimos por campaña
- Audiencias: broad, lookalike, retargeting, Advantage+, exclusiones estratégicas
- Creativos: formatos que convierten (UGC, video corto, carrusel, imagen estática), ángulos de copy
- Bid strategy: cost cap, bid cap, highest volume — cuándo y por qué
- ROAS real: cómo calcularlo bien, benchmarks por vertical, diferencia entre ROAS de plataforma y real
- Análisis de métricas: CPM, CTR, CPC, CPA, frequency — qué números son buenas señales vs alertas rojas
- Escalado: horizontal (nuevas audiencias) vs vertical (aumentar presupuesto), reglas de escalado

E-COMMERCE:
- Embudo completo: TOFU (awareness) → MOFU (consideración) → BOFU (conversión) → retención
- Optimización de conversión: landing pages, checkout, páginas de producto
- Métricas clave: ROAS real, margen de contribución, LTV, AOV, tasa de repetición
- Shopify: configuración de píxel, catálogo dinámico, eventos de conversión
- Email + Ads: cómo combinar retargeting con flows de email

MARCAS DE REFERENCIA — PATRONES QUE ESTUDIÁS:
- Nike: storytelling emocional, comunidad, "Just Do It" como identidad que trasciende el producto
- Apple: minimalismo, experiencia, precio premium justificado por percepción de valor
- Gymshark: crecimiento 100% digital, micro-influencers antes de macro, UGC como motor
- Dollar Shave Club: copy directo, humor, propuesta de valor brutal y simple
- Airbnb: confianza como activo, comunidad, reseñas como fuerza de ventas
- Red Bull: contenido de valor primero, producto segundo, lifestyle brand total
- Zara: velocidad, feedback loop rápido, sin publicidad masiva, producto como marketing
- Duolingo: gamificación, personalidad de marca irreverente en redes, consistencia de voz
- Lululemon: comunidad física → digital, precio premium + identidad aspiracional
- Warby Parker: D2C puro, prueba en casa como innovación, propósito de marca real

ANÁLISIS DE IMÁGENES (cuando se adjunta una imagen):
Cuando el usuario envía una imagen, analizás con criterio experto:
- Si es una captura de Meta Ads Manager: identificás qué métricas están bien/mal, sugerís ajustes específicos
- Si es un creativo (imagen/video screenshot): evaluás copy, CTA, diseño, ángulo de venta, público objetivo implícito
- Si es un dashboard o reporte: extraés insights accionables, señalás tendencias y alertas
- Si es un producto o marca: analizás posicionamiento, oportunidades de diferenciación, ángulos de campaña

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
- Cuando alguien saluda, respondé con el estado real de sus tareas del día.
- Cuando analizás datos o imágenes, sé específico: números, porcentajes, benchmarks reales.
- Nunca des respuestas genéricas si tenés datos concretos disponibles.`

    // Build API messages — handle image in last user message
    let apiMessages: unknown[]

    if (messages && messages.length > 0) {
      apiMessages = messages
    } else {
      apiMessages = [{ role: 'user' as const, content: message }]
    }

    // If image is attached, wrap the last user message with vision content
    if (imageBase64 && imageMimeType) {
      const lastMsg = apiMessages[apiMessages.length - 1] as { role: string; content: string }
      const textContent = lastMsg?.content || message || ''

      // Replace last message with vision-enabled format
      apiMessages = [
        ...apiMessages.slice(0, -1),
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: {
                type: 'base64',
                media_type: imageMimeType,
                data: imageBase64,
              },
            },
            {
              type: 'text',
              text: textContent || 'Analizá esta imagen.',
            },
          ],
        },
      ]
    }

    let responseText = ''

    // Determine provider and keys
    const anthropicKey = aiConfig?.anthropic_api_key || process.env.ANTHROPIC_API_KEY
    const openaiKey = aiConfig?.openai_api_key || process.env.OPENAI_API_KEY
    const provider = aiConfig?.ai_provider || 'anthropic'
    const hasValidAnthropicKey = anthropicKey && anthropicKey !== 'YOUR_KEY' && anthropicKey.startsWith('sk-ant-')
    const hasValidOpenaiKey = openaiKey && openaiKey !== 'YOUR_KEY' && openaiKey.startsWith('sk-')

    let usedAI = false

    // Try Anthropic (primary or fallback)
    if ((provider === 'anthropic' || (!usedAI && hasValidAnthropicKey)) && hasValidAnthropicKey) {
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
            max_tokens: 1500,
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

    // Try OpenAI (primary or fallback)
    if (!usedAI && hasValidOpenaiKey) {
      try {
        // For OpenAI vision, format differently
        let openaiMessages: unknown[]
        if (imageBase64 && imageMimeType) {
          const lastApiMsg = (messages && messages.length > 0 ? messages[messages.length - 1] : { content: message }) as { content: string }
          openaiMessages = [
            { role: 'system', content: systemPrompt },
            ...(messages || []).slice(0, -1).map((m: { role: string; content: string }) => ({ role: m.role, content: m.content })),
            {
              role: 'user',
              content: [
                { type: 'image_url', image_url: { url: `data:${imageMimeType};base64,${imageBase64}` } },
                { type: 'text', text: lastApiMsg.content || message || 'Analizá esta imagen.' },
              ],
            },
          ]
        } else {
          openaiMessages = [
            { role: 'system', content: systemPrompt },
            ...(messages || [{ role: 'user', content: message }]).map((m: { role: string; content: string }) => ({ role: m.role, content: m.content })),
          ]
        }

        const res = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${openaiKey}` },
          body: JSON.stringify({
            model: imageBase64 ? 'gpt-4o' : 'gpt-4o-mini',
            max_tokens: 1500,
            messages: openaiMessages,
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
      responseText = generateSmartFallback(workspaceContext, userContext, userName, message || (apiMessages[apiMessages.length - 1] as {content: string})?.content || '')
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
      message: message || (apiMessages[apiMessages.length - 1] as {content: string})?.content,
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
      response: 'Hubo un error al procesar tu mensaje. Intentá de nuevo.',
      action: null,
      hasAI: false,
      agent: 'Ceonyx',
    })
  }
}

async function getWorkspaceContext(supabase: ReturnType<typeof Object.create>, workspaceId: string) {
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
    monthlyIncome: (incomeRes.data || []).reduce((s: number, t: {amount?: string | number}) => s + Number(t.amount || 0), 0),
  }
}

async function getUserContext(supabase: ReturnType<typeof Object.create>, workspaceId: string, userId: string) {
  const now = new Date()
  const todayStr = now.toISOString().split('T')[0]

  const [assignedRes, overdueRes, todayRes, clientsRes] = await Promise.all([
    supabase.from('tasks').select('id, title, status, priority, deadline, clientId')
      .eq('workspace_id', workspaceId)
      .in('status', ['pending', 'in_progress'])
      .contains('assignedTo', [userId])
      .is('deleted_at', null)
      .limit(20),
    supabase.from('tasks').select('id, title, deadline')
      .eq('workspace_id', workspaceId)
      .in('status', ['pending', 'in_progress'])
      .contains('assignedTo', [userId])
      .lt('deadline', todayStr)
      .not('deadline', 'is', null)
      .is('deleted_at', null)
      .limit(5),
    supabase.from('tasks').select('id, title, priority')
      .eq('workspace_id', workspaceId)
      .in('status', ['pending', 'in_progress'])
      .contains('assignedTo', [userId])
      .gte('deadline', `${todayStr}T00:00:00Z`)
      .lte('deadline', `${todayStr}T23:59:59Z`)
      .is('deleted_at', null)
      .limit(5),
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
    assignedClientNames: (clientsRes.data || []).map((c: {name: string}) => c.name),
  }
}

function generateSmartFallback(
  ctx: {overdueTasks: number; todayTasks: number},
  userCtx: {overdueTasks: number; todayTasks: number; pendingTasks: number},
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
    msg += '\n\nPara respuestas completas con IA, el owner del workspace debe configurar la API key en Ajustes → Agente de IA.'
    return msg
  }

  if (lower.includes('tarea') || lower.includes('pendiente')) {
    return `Tenés ${userCtx.pendingTasks} tareas pendientes (${userCtx.overdueTasks} vencidas, ${userCtx.todayTasks} para hoy). Para análisis detallado, configurá la API key en Ajustes → Agente de IA.`
  }

  return `Entendido. Para respuestas completas con IA, el owner debe configurar la API key en Ajustes → Agente de IA.`
}
