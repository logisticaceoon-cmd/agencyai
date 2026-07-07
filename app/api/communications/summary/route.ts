import { NextResponse } from 'next/server'
import { getAuthContext, isAuthError } from '@/lib/auth-supabase'

export async function GET(request: Request) {
  try {
    const auth = await getAuthContext()
    if (isAuthError(auth)) return auth
    const { supabase, workspaceId } = auth

    const { searchParams } = new URL(request.url)
    const clientId = searchParams.get('client_id')

    if (!clientId) {
      return NextResponse.json({ error: 'client_id es requerido' }, { status: 400 })
    }

    // Obtener ultimas 20 interacciones del cliente
    const { data: interactions, error } = await supabase
      .from('client_interactions')
      .select('type, date, summary, outcome, next_action, duration_minutes')
      .eq('workspace_id', workspaceId)
      .eq('client_id', clientId)
      .order('date', { ascending: false })
      .limit(20)

    if (error) {
      console.error('Error fetching interactions for summary:', error)
      return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
    }

    if (!interactions || interactions.length === 0) {
      return NextResponse.json({ summary: 'No hay interacciones registradas con este cliente.' })
    }

    // Intentar generar resumen con IA
    const apiKey = process.env.ANTHROPIC_API_KEY || process.env.OPENAI_API_KEY
    if (!apiKey) {
      // Sin IA: generar resumen basico
      const typeCounts: Record<string, number> = {}
      let totalDuration = 0
      for (const i of interactions) {
        typeCounts[i.type] = (typeCounts[i.type] || 0) + 1
        totalDuration += i.duration_minutes || 0
      }
      const typeStr = Object.entries(typeCounts).map(([t, c]) => `${c} ${t}`).join(', ')
      const pendingActions = interactions
        .filter(i => i.next_action)
        .map(i => i.next_action)
        .slice(0, 3)

      let summary = `${interactions.length} interacciones recientes (${typeStr}).`
      if (totalDuration > 0) summary += ` Tiempo total: ${totalDuration} minutos.`
      if (pendingActions.length > 0) summary += ` Acciones pendientes: ${pendingActions.join('; ')}.`

      return NextResponse.json({ summary })
    }

    // Generar resumen con IA
    const interactionText = interactions.map(i =>
      `[${i.type}] ${new Date(i.date).toLocaleDateString('es-ES')}: ${i.summary}${i.outcome ? ` → ${i.outcome}` : ''}${i.next_action ? ` (Pendiente: ${i.next_action})` : ''}`
    ).join('\n')

    const prompt = `Resume las siguientes interacciones con un cliente de agencia en 2-3 oraciones. Destaca patrones, temas recurrentes y acciones pendientes:\n\n${interactionText}`

    try {
      if (process.env.ANTHROPIC_API_KEY) {
        const res = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': process.env.ANTHROPIC_API_KEY,
            'anthropic-version': '2023-06-01',
          },
          body: JSON.stringify({
            model: 'claude-sonnet-4-20250514',
            max_tokens: 300,
            messages: [{ role: 'user', content: prompt }],
          }),
        })
        const data = await res.json()
        return NextResponse.json({ summary: data.content?.[0]?.text || 'No se pudo generar el resumen.' })
      } else if (process.env.OPENAI_API_KEY) {
        const res = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
          },
          body: JSON.stringify({
            model: 'gpt-4o-mini',
            max_tokens: 300,
            messages: [{ role: 'user', content: prompt }],
          }),
        })
        const data = await res.json()
        return NextResponse.json({ summary: data.choices?.[0]?.message?.content || 'No se pudo generar el resumen.' })
      }
    } catch (aiErr) {
      console.error('AI summary error:', aiErr)
    }

    return NextResponse.json({ summary: 'No se pudo generar el resumen con IA.' })
  } catch (err) {
    console.error('Summary error:', err)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
