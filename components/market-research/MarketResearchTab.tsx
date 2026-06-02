'use client'

import { useState, useEffect } from 'react'

interface Competitor { id: string; name: string; website: string; instagram: string; priority: number }
interface ReportSummary { id: string; report_month: string; status: string; created_at: string }
interface ReportFull { id: string; report_month: string; status: string; created_at: string; report_data: Record<string, unknown> }

function fmtMonth(d: string) {
  return new Date(d + 'T12:00:00').toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })
}

export function MarketResearchTab({ clientId }: { clientId: string; clientName: string }) {
  const [competitors, setCompetitors]   = useState<Competitor[]>([])
  const [reports,     setReports]       = useState<ReportSummary[]>([])
  const [latest,      setLatest]        = useState<ReportFull | null>(null)
  const [loading,     setLoading]       = useState(true)
  const [generating,  setGenerating]    = useState(false)
  const [shareLink,   setShareLink]     = useState<string | null>(null)
  const [loadingLink, setLoadingLink]   = useState(false)
  const [newComp,     setNewComp]       = useState({ name: '', website: '', instagram: '' })
  const [addingComp,  setAddingComp]    = useState(false)
  const [activeReport,setActiveReport]  = useState<ReportFull | null>(null)
  const [viewReport,  setViewReport]    = useState(false)

  useEffect(() => { loadData() }, [clientId])

  async function loadData() {
    setLoading(true)
    try {
      const [compRes, repRes] = await Promise.all([
        fetch(`/api/market-research/competitors?clientId=${clientId}`),
        fetch(`/api/market-research/reports?clientId=${clientId}`),
      ])
      const [compData, repData] = await Promise.all([compRes.json(), repRes.json()])
      setCompetitors(compData.data || [])
      setReports(repData.data?.reports || [])
      setLatest(repData.data?.latest || null)
      setActiveReport(repData.data?.latest || null)
    } finally {
      setLoading(false)
    }
  }

  async function generateReport() {
    if (!confirm('¿Generar reporte ahora? Esto tomará 2-5 minutos.')) return
    setGenerating(true)
    try {
      const res  = await fetch('/api/market-research/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientId }),
      })
      const data = await res.json()
      if (res.ok) { alert('✅ Reporte generado'); await loadData() }
      else         alert('❌ Error: ' + data.error)
    } finally { setGenerating(false) }
  }

  async function getShareLink() {
    setLoadingLink(true)
    try {
      const res  = await fetch(`/api/market-research/token?clientId=${clientId}`)
      const data = await res.json()
      if (data.token) {
        const url = `${window.location.origin}/portal/investigacion/${data.token}`
        setShareLink(url)
        await navigator.clipboard.writeText(url)
        alert('✅ Link copiado al portapapeles')
      }
    } finally { setLoadingLink(false) }
  }

  async function addCompetitor() {
    if (!newComp.name.trim()) return
    setAddingComp(true)
    try {
      const res = await fetch('/api/market-research/competitors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientId, ...newComp }),
      })
      if (res.ok) {
        setNewComp({ name: '', website: '', instagram: '' })
        const fresh = await fetch(`/api/market-research/competitors?clientId=${clientId}`)
        setCompetitors((await fresh.json()).data || [])
      }
    } finally { setAddingComp(false) }
  }

  async function removeCompetitor(id: string) {
    if (!confirm('¿Eliminar competidor?')) return
    await fetch(`/api/market-research/competitors?id=${id}`, { method: 'DELETE' })
    setCompetitors(prev => prev.filter(c => c.id !== id))
  }

  async function loadHistoricalReport(reportId: string) {
    const res  = await fetch(`/api/market-research/reports?clientId=${clientId}&reportId=${reportId}`)
    const data = await res.json()
    if (data.data) { setActiveReport(data.data); setViewReport(true) }
  }

  if (loading) return (
    <div className="flex items-center justify-center py-16 text-slate-400 text-sm">
      Cargando investigación de mercado...
    </div>
  )

  if (viewReport && activeReport?.report_data) {
    return <ReportViewer report={activeReport} onBack={() => { setViewReport(false); setActiveReport(latest) }} />
  }

  const d  = activeReport?.report_data as Record<string, unknown> | null
  const ex = d?.executive_summary as Record<string, unknown> | null
  const cs = d?.competitors as Array<Record<string, unknown>> | null

  return (
    <div className="space-y-6">
      {/* Acciones */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Investigación de Mercado</h2>
          <p className="text-sm text-slate-500">Análisis competitivo mensual automatizado con IA</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={getShareLink}
            disabled={loadingLink || !latest}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-40 transition-colors"
          >
            🔗 {loadingLink ? 'Generando...' : 'Copiar link del cliente'}
          </button>
          <button
            onClick={generateReport}
            disabled={generating}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors"
          >
            {generating
              ? <><span className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Generando...</>
              : '⚡ Generar reporte ahora'}
          </button>
        </div>
      </div>

      {/* Último reporte */}
      {latest ? (
        <div className="rounded-xl border border-slate-200 bg-white p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-indigo-50 flex items-center justify-center text-lg">📊</div>
            <div>
              <p className="text-sm font-semibold text-slate-800">Reporte de {fmtMonth(latest.report_month)}</p>
              <p className="text-xs text-slate-500">
                {latest.status === 'completed' ? '✅ Completado' : '⏳ Generando...'}
                {' · '}{new Date(latest.created_at).toLocaleDateString('es-ES')}
              </p>
            </div>
          </div>
          <button onClick={() => { setActiveReport(latest); setViewReport(true) }}
            className="text-sm text-indigo-600 font-medium hover:underline">
            Ver reporte completo →
          </button>
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center">
          <div className="text-3xl mb-3">📋</div>
          <p className="text-sm font-medium text-slate-600 mb-1">Sin reportes aún</p>
          <p className="text-xs text-slate-400">Agrega competidores y genera el primer reporte</p>
        </div>
      )}

      {/* Resumen ejecutivo rápido */}
      {ex && (
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
            Resumen — {fmtMonth(activeReport!.report_month)}
          </h3>
          <p className="text-base font-semibold text-slate-800 mb-3">{ex.headline as string}</p>
          {(ex.urgency_alert as string) && (
            <div className="flex items-start gap-2 p-3 rounded-lg bg-red-50 border border-red-100 mb-3">
              <span>🚨</span>
              <p className="text-sm text-red-700">{ex.urgency_alert as string}</p>
            </div>
          )}
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <p className="text-xs font-semibold text-slate-500 mb-2">Hallazgos clave</p>
              {((ex.key_findings as string[]) || []).map((f, i) => (
                <p key={i} className="text-sm text-slate-600 flex gap-2 mb-1">
                  <span className="text-indigo-400 mt-1">•</span>{f}
                </p>
              ))}
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500 mb-2">Oportunidades top</p>
              {((ex.top_opportunities as string[]) || []).map((o, i) => (
                <p key={i} className="text-sm text-slate-600 flex gap-2 mb-1">
                  <span className="text-green-500 mt-1">•</span>{o}
                </p>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Cards de amenaza rápida */}
      {cs && cs.length > 0 && (
        <div className="grid md:grid-cols-3 gap-3">
          {cs.slice(0, 3).map((c, i) => (
            <div key={i} className={`rounded-xl border p-4 ${
              c.threat_level === 'alto'  ? 'border-red-200 bg-red-50' :
              c.threat_level === 'medio' ? 'border-yellow-200 bg-yellow-50' :
              'border-green-200 bg-green-50'
            }`}>
              <div className="flex justify-between items-start mb-2">
                <p className="text-sm font-semibold text-slate-800">{c.name as string}</p>
                <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                  c.threat_level === 'alto'  ? 'bg-red-100 text-red-700' :
                  c.threat_level === 'medio' ? 'bg-yellow-100 text-yellow-700' :
                  'bg-green-100 text-green-700'
                }`}>{(c.threat_level as string)?.toUpperCase()}</span>
              </div>
              <p className="text-xs text-slate-500">{c.threat_reason as string}</p>
            </div>
          ))}
        </div>
      )}

      {/* Competidores configurados */}
      <div className="rounded-xl border border-slate-200 bg-white p-5">
        <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-4">
          Competidores configurados ({competitors.length})
        </h3>
        {competitors.length > 0 && (
          <div className="space-y-2 mb-4">
            {competitors.map(c => (
              <div key={c.id} className="flex items-center justify-between py-2 px-3 rounded-lg bg-slate-50">
                <div className="flex items-center gap-3">
                  <span className="h-7 w-7 rounded-full bg-indigo-100 flex items-center justify-center text-xs font-bold text-indigo-600">
                    {c.name[0].toUpperCase()}
                  </span>
                  <div>
                    <p className="text-sm font-medium text-slate-700">{c.name}</p>
                    {c.website && <p className="text-xs text-slate-400">{c.website}</p>}
                  </div>
                </div>
                <button onClick={() => removeCompetitor(c.id)}
                  className="text-slate-400 hover:text-red-500 text-xs transition-colors">✕</button>
              </div>
            ))}
          </div>
        )}
        <div className="grid grid-cols-3 gap-2">
          {(['name', 'website', 'instagram'] as const).map((field, i) => (
            <input key={field}
              value={newComp[field]}
              onChange={e => setNewComp(p => ({ ...p, [field]: e.target.value }))}
              placeholder={['Nombre *', 'Website', '@instagram'][i]}
              className="text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:border-indigo-400"
            />
          ))}
        </div>
        <button onClick={addCompetitor} disabled={addingComp || !newComp.name.trim()}
          className="mt-2 w-full text-sm text-indigo-600 border border-indigo-200 rounded-lg py-2 hover:bg-indigo-50 disabled:opacity-40 transition-colors font-medium">
          {addingComp ? 'Agregando...' : '+ Agregar competidor'}
        </button>
      </div>

      {/* Historial */}
      {reports.length > 1 && (
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Historial</h3>
          <div className="space-y-2">
            {reports.slice(1).map(r => (
              <div key={r.id} className="flex items-center justify-between py-2">
                <div>
                  <p className="text-sm font-medium text-slate-700">{fmtMonth(r.report_month)}</p>
                  <p className="text-xs text-slate-400">{r.status === 'completed' ? '✅' : '❌'} {new Date(r.created_at).toLocaleDateString('es-ES')}</p>
                </div>
                {r.status === 'completed' && (
                  <button onClick={() => loadHistoricalReport(r.id)}
                    className="text-sm text-indigo-600 hover:underline font-medium">Ver →</button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {shareLink && (
        <div className="rounded-xl border border-indigo-200 bg-indigo-50 p-4 text-sm text-indigo-700">
          <strong>Link del cliente:</strong> <span className="font-mono text-xs break-all">{shareLink}</span>
        </div>
      )}
    </div>
  )
}

// ── Report Viewer ──────────────────────────────────────────────────────────

// ── Report data interfaces ─────────────────────────────────
interface RExSummary { headline?: string; key_findings?: string[]; top_opportunities?: string[]; urgency_alert?: string | null }
interface RMarket    { industry_status?: string; trend_summary?: string; key_trends?: Array<{trend: string; impact: string}>; seasonal_notes?: string | null }
interface RSocial    { instagram_followers?: number; instagram_er_estimate?: string; instagram_post_frequency?: string; facebook_followers?: number }
interface RAds       { meta_ads_active?: boolean; meta_ads_count_estimate?: number; meta_top_formats?: string[]; meta_main_angles?: string[]; google_ads_active?: boolean; google_ads_formats?: string[]; estimated_monthly_budget?: string }
interface RWebsite   { main_cta?: string; value_proposition?: string; pricing_visible?: boolean; trust_signals?: string[] }
interface RCompetitor{ name: string; website?: string; type?: string; threat_level?: string; threat_reason?: string; strengths?: string[]; weaknesses?: string[]; social_media?: RSocial; paid_ads?: RAds; website_analysis?: RWebsite }
interface RAI        { dominant_format_in_market?: string; market_saturation?: string; best_ad_days?: string; top_emotional_triggers?: string[]; common_hooks?: string[]; untapped_angles?: string[]; client_ad_opportunities?: string[] }
interface RSwot      { strengths?: string[]; weaknesses?: string[]; opportunities?: string[]; threats?: string[] }
interface RRecoItem  { action: string; why: string; expected_impact: string; effort: string }
interface RRecos     { immediate?: RRecoItem[]; short_term?: RRecoItem[]; strategic?: RRecoItem[] }
interface RKpi       { metric: string; current_benchmark: string; target_3months: string; how_to_measure: string }

export function ReportViewer({ report, onBack }: { report: ReportFull; onBack: () => void }) {
  const d  = report.report_data
  const ex = (d?.executive_summary  || {}) as RExSummary
  const mo = (d?.market_overview    || {}) as RMarket
  const cs = (d?.competitors        || []) as RCompetitor[]
  const ai = (d?.ad_intelligence    || {}) as RAI
  const sw = (d?.swot               || {}) as RSwot
  const rc = (d?.recommendations    || {}) as RRecos
  const kp = (d?.kpis_to_watch      || []) as RKpi[]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <button onClick={onBack} className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700">
          ← Volver
        </button>
        <span className="text-sm font-semibold text-indigo-600">Reporte de {fmtMonth(report.report_month)}</span>
      </div>

      {/* Resumen */}
      {!!ex.headline && (
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Resumen ejecutivo</h3>
          <p className="text-lg font-bold text-slate-900 mb-4">{ex.headline as string}</p>
          {(ex.urgency_alert as string) && (
            <div className="flex gap-2 p-3 rounded-lg bg-red-50 border border-red-100 mb-4">
              <span>🚨</span>
              <p className="text-sm text-red-700 font-medium">{ex.urgency_alert as string}</p>
            </div>
          )}
          <div className="grid md:grid-cols-2 gap-4">
            {[
              { title: 'HALLAZGOS CLAVE', items: ex.key_findings as string[], dot: 'text-indigo-400' },
              { title: 'OPORTUNIDADES TOP', items: ex.top_opportunities as string[], dot: 'text-green-500' },
            ].map(({ title, items, dot }) => (
              <div key={title}>
                <p className="text-xs font-semibold text-slate-400 mb-2">{title}</p>
                {(items || []).map((item, i) => (
                  <p key={i} className="text-sm text-slate-700 flex gap-2 mb-1">
                    <span className={dot}>•</span>{item}
                  </p>
                ))}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Mercado */}
      {mo.trend_summary ? (
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
            Mercado — <span className="text-indigo-600">{mo.industry_status as string}</span>
          </h3>
          <p className="text-sm text-slate-600 mb-4">{mo.trend_summary as string}</p>
          <div className="flex flex-wrap gap-2">
            {((mo.key_trends as Array<{ trend: string; impact: string }>) || []).map((t, i) => (
              <span key={i} className={`text-xs px-3 py-1.5 rounded-full font-medium ${
                t.impact === 'alto'  ? 'bg-red-50 text-red-700 border border-red-100' :
                t.impact === 'medio' ? 'bg-yellow-50 text-yellow-700 border border-yellow-100' :
                'bg-slate-100 text-slate-600'
              }`}>{t.trend}</span>
            ))}
          </div>
        </div>
      ) : null}

      {/* Competidores */}
      {cs.length > 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-4">Competidores</h3>
          <div className="grid md:grid-cols-2 gap-4">
            {cs.map((c, i) => {
              const pa = (c.paid_ads || {}) as Record<string, unknown>
              const sm = (c.social_media || {}) as Record<string, unknown>
              return (
                <div key={i} className={`rounded-lg p-4 border ${
                  c.threat_level === 'alto'  ? 'border-red-200 bg-red-50' :
                  c.threat_level === 'medio' ? 'border-yellow-200 bg-yellow-50' :
                  'border-slate-200 bg-slate-50'
                }`}>
                  <div className="flex justify-between items-start mb-2">
                    <p className="font-semibold text-slate-800">{c.name as string}</p>
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                      c.threat_level === 'alto'  ? 'bg-red-100 text-red-700' :
                      c.threat_level === 'medio' ? 'bg-yellow-100 text-yellow-700' :
                      'bg-green-100 text-green-700'
                    }`}>{(c.threat_level as string)?.toUpperCase()}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-1 text-xs text-slate-600 mb-2">
                    <span>Meta: {pa.meta_ads_active ? '🟢 Activo' : '⚫'}</span>
                    <span>Google: {pa.google_ads_active ? '🟢 Activo' : '⚫'}</span>
                    <span>IG: {(sm.instagram_followers as number)?.toLocaleString() || '—'}</span>
                    <span>Budget: {pa.estimated_monthly_budget as string || '—'}</span>
                  </div>
                  {(pa.meta_main_angles as string[])?.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {(pa.meta_main_angles as string[]).map((a, j) => (
                        <span key={j} className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded">{a}</span>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      ) : null}

      {/* Inteligencia de Anuncios */}
      {ai.dominant_format_in_market && (
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Inteligencia de anuncios</h3>
          <div className="grid grid-cols-3 gap-3 mb-4 text-center">
            {[
              { v: ai.dominant_format_in_market, l: 'Formato dominante', c: 'text-indigo-600' },
              { v: ai.market_saturation, l: 'Saturación', c: 'text-yellow-600' },
              { v: ai.best_ad_days, l: 'Mejores días', c: 'text-green-600' },
            ].map(({ v, l, c }, i) => (
              <div key={i} className="bg-slate-50 rounded-lg p-3">
                <p className={`text-sm font-bold ${c}`}>{v as string}</p>
                <p className="text-xs text-slate-500">{l}</p>
              </div>
            ))}
          </div>
          <p className="text-xs font-semibold text-slate-400 mb-2">ÁNGULOS NO EXPLOTADOS</p>
          <div className="flex flex-wrap gap-2">
            {((ai.untapped_angles as string[]) || []).map((a, i) => (
              <span key={i} className="text-xs bg-green-50 text-green-700 border border-green-100 px-3 py-1.5 rounded-full">✨ {a}</span>
            ))}
          </div>
        </div>
      )}

      {/* FODA */}
      {sw.strengths && (
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-4">Análisis FODA</h3>
          <div className="grid grid-cols-2 gap-3">
            {[
              { key: 'strengths',     label: 'Fortalezas',   color: 'bg-green-50  border-green-100  text-green-800' },
              { key: 'weaknesses',    label: 'Debilidades',  color: 'bg-red-50    border-red-100    text-red-800' },
              { key: 'opportunities', label: 'Oportunidades',color: 'bg-indigo-50 border-indigo-100 text-indigo-800' },
              { key: 'threats',       label: 'Amenazas',     color: 'bg-amber-50  border-amber-100  text-amber-800' },
            ].map(({ key, label, color }) => (
              <div key={key} className={`rounded-lg border p-3 ${color}`}>
                <p className="text-xs font-bold mb-2">{label}</p>
                {(((sw as Record<string, string[] | undefined>)[key]) || []).map((item, i) => (
                  <p key={i} className="text-xs mb-1 flex gap-1"><span>—</span>{item}</p>
                ))}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recomendaciones */}
      {rc.immediate && (
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-4">Recomendaciones</h3>
          {[
            { key: 'immediate',  label: '🔴 Urgentes — esta semana',   bg: 'bg-red-50    border-red-100' },
            { key: 'short_term', label: '🟡 Corto plazo — este mes',   bg: 'bg-yellow-50 border-yellow-100' },
            { key: 'strategic',  label: '🟢 Estratégicas — 3-6 meses', bg: 'bg-green-50  border-green-100' },
          ].map(({ key, label, bg }) => (
            <div key={key} className="mb-4">
              <p className="text-xs font-bold text-slate-600 mb-2">{label}</p>
              {(((rc as Record<string, RRecoItem[] | undefined>)[key]) || []).map((r, i) => (
                <div key={i} className={`rounded-lg border p-3 mb-2 ${bg}`}>
                  <p className="text-sm font-semibold text-slate-800 mb-1">{r.action}</p>
                  <p className="text-xs text-slate-600"><strong>Por qué:</strong> {r.why}</p>
                  <p className="text-xs text-slate-600"><strong>Impacto:</strong> {r.expected_impact}</p>
                  <span className="inline-block mt-1 text-xs bg-white/60 px-2 py-0.5 rounded font-medium">Esfuerzo {r.effort}</span>
                </div>
              ))}
            </div>
          ))}
        </div>
      )}

      {/* KPIs */}
      {kp.length > 0 && (
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">KPIs a monitorear</h3>
          <div className="grid md:grid-cols-2 gap-3">
            {kp.map((k, i) => (
              <div key={i} className="rounded-lg bg-slate-50 border border-slate-200 p-3">
                <p className="text-sm font-semibold text-slate-800 mb-1">{k.metric as string}</p>
                <p className="text-xs text-slate-500">Benchmark: <strong className="text-slate-700">{k.current_benchmark as string}</strong></p>
                <p className="text-xs text-green-600 mt-0.5">Meta 3 meses: {k.target_3months as string}</p>
                <p className="text-xs text-slate-400 mt-1">{k.how_to_measure as string}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
