import { NextResponse } from 'next/server'
import { getOrgContext } from '@/lib/org'

const SYSTEM_PROMPTS: Record<string, string> = {
  dashboard:
    'Sos un asistente de productividad para una agencia digital. Ayudas a resumir el estado diario, priorizar tareas y dar recomendaciones sobre la carga de trabajo del equipo. Responde siempre en espanol.',
  clients:
    'Sos un asistente especializado en gestion de clientes para agencias digitales. Ayudas a analizar la cartera de clientes, sugerir estrategias de retencion, y dar insights sobre la salud de las cuentas. Responde siempre en espanol.',
  tasks:
    'Sos un asistente de gestion de tareas para una agencia digital. Ayudas a priorizar tareas, identificar bloqueos, y sugerir distribuciones de trabajo optimas. Responde siempre en espanol.',
  projects:
    'Sos un asistente de gestion de proyectos para una agencia digital. Ayudas a evaluar el estado de proyectos, identificar riesgos, y sugerir timelines realistas. Responde siempre en espanol.',
  reports:
    'Sos un asistente para la generacion de reportes en una agencia digital. Ayudas a escribir resumenes ejecutivos, analizar tendencias de rendimiento, y sugerir mejoras basadas en datos. Responde siempre en espanol.',
}

export async function POST(request: Request) {
  const ctx = await getOrgContext()
  if ('error' in ctx) return ctx.error

  try {
    const body = await request.json()
    const { message, module, context } = body as {
      message: string
      module: string
      context?: Record<string, unknown>
    }

    if (!message || typeof message !== 'string') {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 })
    }

    const apiKey = process.env.ANTHROPIC_API_KEY

    if (!apiKey) {
      return NextResponse.json({
        response:
          'Para habilitar el asistente IA, configura tu ANTHROPIC_API_KEY en el archivo .env.local',
      })
    }

    const systemPrompt = [
      SYSTEM_PROMPTS[module] || SYSTEM_PROMPTS.dashboard,
      `Agencia: ${ctx.org.name}`,
      `Usuario: ${ctx.user.fullName} (${ctx.membership.role})`,
      context ? `Contexto adicional: ${JSON.stringify(context)}` : '',
    ]
      .filter(Boolean)
      .join('\n')

    const anthropicRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1024,
        system: systemPrompt,
        messages: [{ role: 'user', content: message }],
      }),
    })

    if (!anthropicRes.ok) {
      const errText = await anthropicRes.text()
      console.error('Anthropic API error:', errText)
      return NextResponse.json({
        response:
          'Hubo un error al procesar tu consulta. Por favor intenta nuevamente.',
      })
    }

    const data = await anthropicRes.json()
    const responseText =
      data.content?.[0]?.type === 'text'
        ? data.content[0].text
        : 'No se pudo obtener una respuesta.'

    return NextResponse.json({ response: responseText })
  } catch (error) {
    console.error('AI chat error:', error)
    return NextResponse.json(
      { response: 'Ocurrio un error inesperado. Intenta nuevamente.' },
      { status: 500 }
    )
  }
}
