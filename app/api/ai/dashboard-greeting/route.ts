import { NextResponse } from 'next/server'
import { getAuthContext, isAuthError } from '@/lib/auth-supabase'

export async function POST(request: Request) {
  const auth = await getAuthContext()
  if (isAuthError(auth)) return auth

  try {
    const body = await request.json()
    const {
      userName,
      hour,
      overdueTasks = [],
      todayTasks = [],
      activeProjects = 0,
      agentName = 'Asistente AgencyAI',
      agentPersonality = 'profesional',
    } = body

    const timeGreeting =
      hour < 12 ? 'Buenos dias' : hour < 19 ? 'Buenas tardes' : 'Buenas noches'

    const todayTasksList = todayTasks
      .map((t: { title: string; project?: string }) => `- "${t.title}"${t.project ? ` (${t.project})` : ''}`)
      .join('\n')

    const overdueTasksList = overdueTasks
      .map((t: { title: string; dueDate?: string }) => `- "${t.title}" (vencida ${t.dueDate || ''})`)
      .join('\n')

    const systemPrompt = `Sos ${agentName}, el asistente de IA de la agencia. Tu personalidad es ${agentPersonality}.
Estas saludando a ${userName} al inicio de su jornada de trabajo.
Tenes acceso a estos datos actuales de su agencia:
- Tareas que vencen HOY: ${todayTasks.length > 0 ? '\n' + todayTasksList : 'Ninguna'}
- Tareas VENCIDAS sin completar: ${overdueTasks.length > 0 ? '\n' + overdueTasksList : 'Ninguna'}
- Proyectos activos: ${activeProjects}

Tu saludo debe:
1. Ser calido y personalizado, maximo 3-4 oraciones
2. Mencionar especificamente las tareas urgentes del dia
3. Si hay tareas vencidas, mencionarlo con urgencia pero sin alarmar
4. Terminar con UNA pregunta concreta sobre que quiere hacer primero
5. NO usar emojis en exceso, maximo 1-2
6. Hablar en primera persona como asistente`

    // Try Anthropic API
    const anthropicKey = process.env.ANTHROPIC_API_KEY
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
          max_tokens: 300,
          system: systemPrompt,
          messages: [{ role: 'user', content: `Saludame. Es ${timeGreeting.toLowerCase()}.` }],
        }),
      })

      if (res.ok) {
        const data = await res.json()
        return NextResponse.json({ greeting: data.content?.[0]?.text || '' })
      }
    }

    // Try OpenAI API
    const openaiKey = process.env.OPENAI_API_KEY
    if (openaiKey && openaiKey !== 'YOUR_KEY' && openaiKey.startsWith('sk-')) {
      const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${openaiKey}`,
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          max_tokens: 300,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: `Saludame. Es ${timeGreeting.toLowerCase()}.` },
          ],
        }),
      })

      if (res.ok) {
        const data = await res.json()
        return NextResponse.json({ greeting: data.choices?.[0]?.message?.content || '' })
      }
    }

    // Fallback: contextual hardcoded greeting
    let greeting = `${timeGreeting}, ${userName}!`

    if (overdueTasks.length > 0) {
      greeting += ` Tenes ${overdueTasks.length} tarea${overdueTasks.length > 1 ? 's' : ''} vencida${overdueTasks.length > 1 ? 's' : ''} que necesitan atencion.`
    }

    if (todayTasks.length > 0) {
      greeting += ` Hoy vencen ${todayTasks.length} tarea${todayTasks.length > 1 ? 's' : ''}: ${todayTasks.slice(0, 3).map((t: { title: string }) => `"${t.title}"`).join(', ')}.`
    } else if (overdueTasks.length === 0) {
      greeting += ` Todo al dia con tus tareas. Tenes ${activeProjects} proyecto${activeProjects !== 1 ? 's' : ''} activo${activeProjects !== 1 ? 's' : ''}.`
    }

    greeting += ' Queres que revisemos juntos las prioridades de hoy?'

    return NextResponse.json({ greeting })
  } catch {
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
