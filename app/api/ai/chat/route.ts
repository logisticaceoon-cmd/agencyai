import { NextResponse } from 'next/server'
import { getAuthContext, isAuthError } from '@/lib/auth-supabase'

const MOCK_RESPONSES: Record<string, string[]> = {
  dashboard: [
    'Basado en tu actividad reciente, te recomiendo enfocarte primero en las tareas vencidas. Priorizar lo urgente sobre lo importante es clave para mantener la operacion fluida.',
    'Veo que tenes varios proyectos activos. Te sugiero hacer una revision rapida de cada uno para identificar cuellos de botella antes de que se conviertan en problemas.',
    'El estado general de la agencia se ve bien. Asegurate de hacer seguimiento con los clientes que no han tenido actividad reciente.',
  ],
  clients: [
    'Para mejorar la retencion, te recomiendo implementar reuniones de revision mensuales con cada cliente. Esto muestra proactividad y permite detectar problemas temprano.',
    'Es importante registrar toda la informacion de contacto, objetivos del cliente, presupuesto mensual y los KPIs que mas le importan. Esto te permite personalizar tu servicio.',
  ],
  projects: [
    'Para estructurar bien los microobjetivos, usa la metodologia SMART: especificos, medibles, alcanzables, relevantes y con fecha limite.',
    'Si un proyecto se atrasa, lo primero es identificar la causa raiz. Luego comunica al cliente con transparencia y presenta un plan de recuperacion concreto.',
  ],
  tasks: [
    'Usa la matriz de Eisenhower: urgente e importante primero, importante pero no urgente despues, urgente pero no importante delega, y ni urgente ni importante elimina.',
    'Para delegar mejor, asigna tareas con contexto claro: que se espera, para cuando, y que recursos tiene disponible la persona.',
  ],
  finances: [
    'Para mejorar la rentabilidad, analiza que clientes generan mas margen y enfoca tu esfuerzo comercial en perfiles similares.',
    'El momento ideal para subir precios es cuando ya demostraste resultados concretos. Presenta el aumento junto con un resumen de logros.',
  ],
  reports: [
    'Un buen reporte mensual incluye: resumen ejecutivo, KPIs clave con comparativa vs mes anterior, acciones realizadas, resultados obtenidos y proximos pasos.',
  ],
  kpis: [
    'Los KPIs esenciales dependen del tipo de servicio. Para marketing digital: ROAS, CPA, CTR, tasa de conversion. Para social media: engagement rate, alcance, crecimiento de seguidores.',
  ],
}

const ACTION_INSTRUCTION = `
Si el usuario pide ejecutar una accion (crear tarea, marcar como completada, crear reporte, etc.),
responde con un JSON especial al FINAL de tu mensaje normal:

[ACTION:{"type":"create_task","data":{"title":"X","priority":"high","dueDate":"2026-04-01"}}]
o
[ACTION:{"type":"complete_task","data":{"taskId":"X"}}]
o
[ACTION:{"type":"create_report","data":{"clientId":"X","type":"weekly"}}]
o
[ACTION:{"type":"schedule_meeting","data":{"title":"X","date":"2026-04-01T10:00:00"}}]

Solo inclui el JSON de accion si el usuario EXPLICITAMENTE pidio ejecutar algo.
Para consultas informativas, responde normalmente sin JSON.`

export async function POST(request: Request) {
  const auth = await getAuthContext()
  if (isAuthError(auth)) return auth
  const { supabase, workspaceId, userId } = auth

  try {
    const body = await request.json()
    const { message, messages: chatHistory, module, context } = body

    if (!message) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 })
    }

    let response: string

    // Try Anthropic API
    const anthropicKey = process.env.ANTHROPIC_API_KEY
    const openaiKey = process.env.OPENAI_API_KEY

    if (anthropicKey && anthropicKey !== 'YOUR_KEY' && anthropicKey.startsWith('sk-ant-')) {
      const systemPrompt = buildSystemPrompt(module, context) + '\n\n' + ACTION_INSTRUCTION

      // Use full chat history if provided, otherwise single message
      const apiMessages = chatHistory && chatHistory.length > 0
        ? chatHistory
        : [{ role: 'user' as const, content: message }]

      const anthropicRes = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': anthropicKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 1000,
          system: systemPrompt,
          messages: apiMessages,
        }),
      })

      if (anthropicRes.ok) {
        const data = await anthropicRes.json()
        response = data.content?.[0]?.text || 'No pude generar una respuesta.'
      } else {
        response = getMockResponse(module)
      }
    } else if (openaiKey && openaiKey !== 'YOUR_KEY' && openaiKey.startsWith('sk-')) {
      const systemPrompt = buildSystemPrompt(module, context) + '\n\n' + ACTION_INSTRUCTION

      const apiMessages = chatHistory && chatHistory.length > 0
        ? [{ role: 'system' as const, content: systemPrompt }, ...chatHistory]
        : [{ role: 'system' as const, content: systemPrompt }, { role: 'user' as const, content: message }]

      const openaiRes = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${openaiKey}`,
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          max_tokens: 1000,
          messages: apiMessages,
        }),
      })

      if (openaiRes.ok) {
        const data = await openaiRes.json()
        response = data.choices?.[0]?.message?.content || 'No pude generar una respuesta.'
      } else {
        response = getMockResponse(module)
      }
    } else {
      response = getMockResponse(module)
    }

    // Log conversation
    await supabase.from('ai_conversations').insert({
      workspace_id: workspaceId,
      user_id: userId,
      module: module || 'general',
      message,
      response,
    }).then(() => {}, () => {})

    return NextResponse.json({ response })
  } catch {
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}

function getMockResponse(module: string): string {
  const responses = MOCK_RESPONSES[module] || MOCK_RESPONSES.dashboard
  return responses[Math.floor(Math.random() * responses.length)]
}

function buildSystemPrompt(module: string, context: Record<string, unknown> = {}): string {
  const ctx = Object.entries(context)
    .map(([k, v]) => `${k}: ${v}`)
    .join(', ')

  const prompts: Record<string, string> = {
    dashboard: `Sos el asistente operacional de una agencia de marketing digital. Datos actuales: ${ctx}. Ayuda al usuario a priorizar su dia y detectar problemas urgentes. Responde en espanol rioplatense.`,
    clients: `Sos el agente CRM de una agencia. ${ctx}. Ayuda a gestionar relaciones, detectar oportunidades y mejorar retencion. Responde en espanol rioplatense.`,
    projects: `Sos el agente de gestion de proyectos. ${ctx}. Ayuda a detectar riesgos y sugerir acciones. Responde en espanol rioplatense.`,
    tasks: `Sos el agente de productividad. ${ctx}. Ayuda a priorizar y organizar el trabajo del equipo. Responde en espanol rioplatense.`,
    finances: `Sos el agente financiero de una agencia. ${ctx}. Ayuda a mejorar la rentabilidad y gestionar el flujo de caja. Responde en espanol rioplatense.`,
    reports: `Sos el agente de reportes. Ayuda a crear reportes profesionales que impresionen a los clientes. Responde en espanol rioplatense.`,
    kpis: `Sos el agente de metricas y KPIs. Ayuda a definir los indicadores correctos segun el tipo de agencia y cliente. Responde en espanol rioplatense.`,
  }

  return prompts[module] || prompts.dashboard
}
