import { NextResponse } from 'next/server'
import { getAuthContext, isAuthError } from '@/lib/auth-supabase'
import { createAdminClient } from '@/lib/supabase/server'

// ── Prompt del sistema ──────────────────────────────────────
function systemPrompt() {
  return `Eres un analista senior de inteligencia competitiva en una agencia especializada en tráfico pago (Meta Ads, Google Ads).
Tu tarea es generar reportes mensuales de investigación de mercado detallados y accionables para clientes de la agencia.

SEÑALES CLAVE que buscas en anuncios:
- Anuncios activos 30+ días = están funcionando bien
- Múltiples versiones simultáneas = optimizando algo exitoso
- Mismo ángulo en varios competidores = el mercado lo valida
- FOMO, transformación, prueba social = gatillos emocionales dominantes

Siempre sé específico y accionable. Cuando no encuentres datos exactos, da estimaciones fundamentadas en indicadores visibles.
Responde ÚNICAMENTE con JSON válido, sin texto adicional antes ni después.`
}

// ── Prompt del usuario ─────────────────────────────────────
function userPrompt(client: Record<string, string>, competitors: Array<Record<string, string>>, month: string) {
  const monthLabel = new Date(month + '-02').toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })
  const compList = competitors
    .map((c, i) => `${i + 1}. ${c.name}${c.website ? ` (${c.website})` : ''}${c.instagram ? ` | IG: ${c.instagram}` : ''}`)
    .join('\n')

  return `Genera el reporte de investigación de mercado de ${monthLabel} para:

CLIENTE:
- Empresa: ${client.name}
- Industria: ${client.industry || 'No especificada'}
- Website: ${client.website || 'No proporcionado'}
- País/Mercado: ${client.country || 'No especificado'}

COMPETIDORES A ANALIZAR:
${compList || 'Sin competidores configurados — analiza el mercado general de la industria'}

INSTRUCCIONES:
Usa web search para investigar activamente:
1. Meta Ad Library (facebook.com/ads/library) — anuncios activos de cada competidor
2. Google Ads Transparency (adstransparency.google.com) — campañas activas
3. Perfiles de Instagram — seguidores, frecuencia, engagement
4. Sitios web — propuesta de valor, precios, CTAs
5. Google Trends — tendencias del sector

Devuelve ÚNICAMENTE este JSON (sin markdown, sin explicaciones):

{
  "report_month": "${month}",
  "executive_summary": {
    "headline": "Frase impactante que resume el mes",
    "key_findings": ["hallazgo 1", "hallazgo 2", "hallazgo 3"],
    "top_opportunities": ["oportunidad 1", "oportunidad 2", "oportunidad 3"],
    "urgency_alert": "Acción crítica esta semana (null si no hay)"
  },
  "market_overview": {
    "industry_status": "creciendo | estable | contrayéndose",
    "trend_summary": "2-3 oraciones sobre el estado del mercado",
    "key_trends": [
      {"trend": "nombre", "impact": "alto | medio | bajo", "description": "breve descripción"}
    ],
    "seasonal_notes": "Notas de estacionalidad (null si no aplica)"
  },
  "competitors": [
    {
      "name": "Nombre",
      "website": "url",
      "type": "direct | indirect",
      "social_media": {
        "instagram_followers": 0,
        "instagram_er_estimate": "1.2%",
        "instagram_post_frequency": "X posts/semana",
        "facebook_followers": 0,
        "dominant_platform": "instagram | facebook | tiktok"
      },
      "paid_ads": {
        "meta_ads_active": true,
        "meta_ads_count_estimate": 0,
        "meta_top_formats": ["video", "imagen"],
        "meta_main_angles": ["ángulo 1"],
        "meta_main_ctas": ["CTA 1"],
        "google_ads_active": true,
        "google_ads_formats": ["search"],
        "estimated_monthly_budget": "bajo <$1K | medio $1K-5K | alto $5K-20K | muy alto $20K+"
      },
      "website_analysis": {
        "main_cta": "texto CTA principal",
        "value_proposition": "propuesta en una frase",
        "pricing_visible": true,
        "trust_signals": ["reviews", "certificaciones"]
      },
      "strengths": ["fortaleza 1", "fortaleza 2"],
      "weaknesses": ["debilidad 1", "debilidad 2"],
      "threat_level": "alto | medio | bajo",
      "threat_reason": "justificación"
    }
  ],
  "ad_intelligence": {
    "dominant_format_in_market": "video | imagen | carrusel",
    "top_emotional_triggers": ["FOMO", "transformación"],
    "common_hooks": ["hook 1", "hook 2"],
    "market_saturation": "alta | media | baja",
    "untapped_angles": ["ángulo no explotado 1", "ángulo no explotado 2"],
    "best_ad_days": "lunes-miércoles | fin de semana | todos",
    "client_ad_opportunities": ["oportunidad específica 1", "oportunidad 2"]
  },
  "swot": {
    "strengths": ["fortaleza del cliente 1"],
    "weaknesses": ["debilidad 1"],
    "opportunities": ["oportunidad 1", "oportunidad 2"],
    "threats": ["amenaza 1"]
  },
  "recommendations": {
    "immediate": [
      {"action": "Acción urgente", "why": "justificación", "expected_impact": "impacto", "effort": "bajo | medio | alto"}
    ],
    "short_term": [
      {"action": "Acción próximo mes", "why": "justificación", "expected_impact": "impacto", "effort": "bajo | medio | alto"}
    ],
    "strategic": [
      {"action": "Acción 3-6 meses", "why": "justificación", "expected_impact": "impacto", "effort": "bajo | medio | alto"}
    ]
  },
  "kpis_to_watch": [
    {"metric": "nombre métrica", "current_benchmark": "valor actual", "target_3months": "meta", "how_to_measure": "cómo medirlo"}
  ],
  "confidence_level": "alto | medio | bajo",
  "confidence_notes": "por qué este nivel de confianza"
}`
}

// ── Handler ────────────────────────────────────────────────
export async function POST(request: Request) {
  try {
    const auth = await getAuthContext()
    if (isAuthError(auth)) return auth
    const { supabase, workspaceId } = auth

    const { clientId, month } = await request.json()
    if (!clientId) return NextResponse.json({ error: 'clientId requerido' }, { status: 400 })

    const reportMonth = month || new Date().toISOString().slice(0, 7)
    const reportDate  = reportMonth + '-01'

    // Verificar que el cliente pertenece al workspace
    const { data: client } = await supabase
      .from('clients')
      .select('id, name, industry, website, country')
      .eq('id', clientId)
      .eq('workspace_id', workspaceId)
      .single()

    if (!client) return NextResponse.json({ error: 'Cliente no encontrado' }, { status: 404 })

    // Obtener competidores
    const { data: competitors } = await supabase
      .from('market_research_competitors')
      .select('name, website, instagram')
      .eq('client_id', clientId)
      .order('priority')

    // Crear/actualizar registro con estado "generating"
    const adminSb = createAdminClient()
    const { data: reportRecord, error: upsertErr } = await adminSb
      .from('market_reports')
      .upsert({
        client_id:    clientId,
        workspace_id: workspaceId,
        report_month: reportDate,
        status:       'generating',
        updated_at:   new Date().toISOString(),
      }, { onConflict: 'client_id,report_month' })
      .select()
      .single()

    if (upsertErr) {
      console.error(upsertErr)
      return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
    }

    const anthropicKey = process.env.ANTHROPIC_API_KEY
    if (!anthropicKey || !anthropicKey.startsWith('sk-ant-')) {
      await adminSb.from('market_reports')
        .update({ status: 'failed', error_message: 'ANTHROPIC_API_KEY no configurada' })
        .eq('id', reportRecord.id)
      return NextResponse.json({ error: 'ANTHROPIC_API_KEY no configurada' }, { status: 500 })
    }

    const startTime = Date.now()

    // Llamar a Claude — primero con web search, fallback sin web search
    const makeApiCall = async (withWebSearch: boolean) => {
      const body: Record<string, unknown> = {
        model: 'claude-sonnet-4-6',
        max_tokens: 16000,
        system: systemPrompt(),
        messages: [{
          role: 'user',
          content: userPrompt(client as Record<string, string>, (competitors || []) as Array<Record<string, string>>, reportMonth),
        }],
      }
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'x-api-key': anthropicKey,
        'anthropic-version': '2023-06-01',
      }
      if (withWebSearch) {
        headers['anthropic-beta'] = 'web-search-2025-03-05'
        body.tools = [{ type: 'web_search_20250305', name: 'web_search', max_uses: 15 }]
      }
      return fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
      })
    }

    let res = await makeApiCall(true)

    // Si falla con web search (ej: beta no habilitada), reintentar sin ella
    if (!res.ok) {
      const errBody = await res.text()
      if (res.status === 400 || res.status === 403) {
        console.log('[market-research] web search no disponible, reintentando sin ella:', errBody)
        res = await makeApiCall(false)
      }
    }

    if (!res.ok) {
      const errText = await res.text()
      await adminSb.from('market_reports')
        .update({ status: 'failed', error_message: `API error ${res.status}: ${errText}` })
        .eq('id', reportRecord.id)
      return NextResponse.json({ error: `Anthropic API error: ${res.status}` }, { status: 500 })
    }

    const aiResponse = await res.json()
    const elapsed = Math.round((Date.now() - startTime) / 1000)

    // Extraer JSON del texto de respuesta
    let reportJson = null
    for (const block of aiResponse.content || []) {
      if (block.type === 'text') {
        try {
          const match = block.text.match(/\{[\s\S]*\}/)
          if (match) reportJson = JSON.parse(match[0])
        } catch {
          reportJson = { raw_text: block.text, parse_error: true }
        }
      }
    }

    if (!reportJson) {
      await adminSb.from('market_reports')
        .update({ status: 'failed', error_message: 'No se pudo extraer JSON de la respuesta' })
        .eq('id', reportRecord.id)
      return NextResponse.json({ error: 'Respuesta inválida de Claude' }, { status: 500 })
    }

    // Guardar reporte completado
    await adminSb.from('market_reports')
      .update({
        status:          'completed',
        report_data:     reportJson,
        generation_secs: elapsed,
        tokens_used:     aiResponse.usage?.output_tokens,
      })
      .eq('id', reportRecord.id)

    return NextResponse.json({ success: true, reportId: reportRecord.id, month: reportMonth })

  } catch (err) {
    console.error('[market-research/generate] error:', err)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
