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
    'El valor de un cliente se calcula considerando su fee mensual, la duracion promedio de la relacion, y las oportunidades de upselling. Un cliente rentable no es solo el que paga mas.',
  ],
  projects: [
    'Para estructurar bien los microobjetivos, usa la metodologia SMART: especificos, medibles, alcanzables, relevantes y con fecha limite.',
    'Si un proyecto se atrasa, lo primero es identificar la causa raiz. Luego comunica al cliente con transparencia y presenta un plan de recuperacion concreto.',
    'Usa actualizaciones semanales cortas con el cliente. Un mensaje de 3-5 lineas con progreso, proximos pasos y bloqueos genera confianza.',
  ],
  tasks: [
    'Usa la matriz de Eisenhower: urgente e importante primero, importante pero no urgente despues, urgente pero no importante delega, y ni urgente ni importante elimina.',
    'Para delegar mejor, asigna tareas con contexto claro: que se espera, para cuando, y que recursos tiene disponible la persona.',
    'Revisa las tareas pendientes hace mas de una semana. Si no avanzaron, probablemente necesiten ser reasignadas o redefinidas.',
  ],
  finances: [
    'Para mejorar la rentabilidad, analiza que clientes generan mas margen y enfoca tu esfuerzo comercial en perfiles similares.',
    'El momento ideal para subir precios es cuando ya demostraste resultados concretos. Presenta el aumento junto con un resumen de logros.',
    'Para clientes que pagan tarde, establece politicas claras desde el inicio: fecha de corte, recargos por mora, y pausar servicios si la deuda supera X dias.',
  ],
  reports: [
    'Un buen reporte mensual incluye: resumen ejecutivo, KPIs clave con comparativa vs mes anterior, acciones realizadas, resultados obtenidos y proximos pasos.',
    'Cuando los resultados no fueron los esperados, se honesto pero orientado a soluciones. Explica que paso, que aprendiste y que vas a hacer diferente.',
    'Para el resumen ejecutivo: empieza con el dato mas impactante, luego contexto en 2 oraciones, y cierra con la accion principal del proximo periodo.',
  ],
  kpis: [
    'Los KPIs esenciales dependen del tipo de servicio. Para marketing digital: ROAS, CPA, CTR, tasa de conversion. Para social media: engagement rate, alcance, crecimiento de seguidores.',
    'Un buen objetivo de KPI debe ser desafiante pero alcanzable. Usa datos historicos como base y aplica un incremento del 10-20% como meta.',
    'Presenta los KPIs al cliente con contexto: no solo el numero, sino que significa, como se compara con el periodo anterior, y que accion tomas al respecto.',
  ],
}

export async function POST(request: Request) {
  const auth = await getAuthContext()
  if (isAuthError(auth)) return auth
  const { supabase, workspaceId, userId } = auth

  try {
    const { message, module, context } = await request.json()

    if (!message) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 })
    }

    let response: string

    const apiKey = process.env.ANTHROPIC_API_KEY
    if (apiKey && apiKey !== 'YOUR_KEY' && apiKey.startsWith('sk-ant-')) {
      const systemPrompt = buildSystemPrompt(module, context)
      const anthropicRes = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 1000,
          system: systemPrompt,
          messages: [{ role: 'user', content: message }],
        }),
      })

      if (anthropicRes.ok) {
        const data = await anthropicRes.json()
        response = data.content?.[0]?.text || 'No pude generar una respuesta.'
      } else {
        response = getMockResponse(module)
      }
    } else {
      response = getMockResponse(module)
    }

    await supabase.from('ai_conversations').insert({
      workspace_id: workspaceId,
      user_id: userId,
      module: module || 'general',
      message,
      response,
    })

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
    dashboard: `Sos el asistente operacional de una agencia de marketing digital. Datos actuales: ${ctx}. Ayuda al usuario a priorizar su dia y detectar problemas urgentes. Responde en espanol.`,
    clients: `Sos el agente CRM de una agencia. ${ctx}. Ayuda a gestionar relaciones, detectar oportunidades y mejorar retencion. Responde en espanol.`,
    projects: `Sos el agente de gestion de proyectos. ${ctx}. Ayuda a detectar riesgos y sugerir acciones. Responde en espanol.`,
    tasks: `Sos el agente de productividad. ${ctx}. Ayuda a priorizar y organizar el trabajo del equipo. Responde en espanol.`,
    finances: `Sos el agente financiero de una agencia. ${ctx}. Ayuda a mejorar la rentabilidad y gestionar el flujo de caja. Responde en espanol.`,
    reports: `Sos el agente de reportes. Ayuda a crear reportes profesionales que impresionen a los clientes. Responde en espanol.`,
    kpis: `Sos el agente de metricas y KPIs. Ayuda a definir los indicadores correctos segun el tipo de agencia y cliente. Responde en espanol.`,
  }

  return prompts[module] || prompts.dashboard
}
