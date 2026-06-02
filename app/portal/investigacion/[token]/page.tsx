'use client'

import { useState, useEffect, use } from 'react'

// ── Tipos ───────────────────────────────────────────────────
interface ClientInfo { id: string; name: string; industry: string; country: string }
interface ReportSummary { id: string; report_month: string; status: string; created_at: string }
interface ReportData { [key: string]: unknown }

const TABS = ['Resumen', 'Competidores', 'Anuncios', 'Mercado', 'Oportunidades', 'Historial'] as const
type Tab = typeof TABS[number]

// ── Utilidades ──────────────────────────────────────────────
function fmtMonth(d: string) {
  return new Date(d + 'T12:00:00').toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })
}
function fmtNum(n: number) {
  if (!n) return '0'
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M'
  if (n >= 1_000)     return (n / 1_000).toFixed(1) + 'K'
  return String(n)
}

// ── Página principal ────────────────────────────────────────
export default function InvestigacionPortal({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params)
  const [client,   setClient]   = useState<ClientInfo | null>(null)
  const [reports,  setReports]  = useState<ReportSummary[]>([])
  const [latest,   setLatest]   = useState<{ id: string; report_month: string; report_data: ReportData } | null>(null)
  const [active,   setActive]   = useState<{ id: string; report_month: string; report_data: ReportData } | null>(null)
  const [tab,      setTab]      = useState<Tab>('Resumen')
  const [loading,  setLoading]  = useState(true)
  const [error,    setError]    = useState('')

  useEffect(() => {
    fetch(`/api/market-research/portal?token=${token}`)
      .then(r => r.json())
      .then(data => {
        if (data.error) { setError(data.error); return }
        setClient(data.client)
        setReports(data.reports || [])
        setLatest(data.latest)
        setActive(data.latest)
      })
      .catch(() => setError('Error de conexión'))
      .finally(() => setLoading(false))
  }, [token])

  async function loadReport(reportId: string) {
    const res = await fetch(`/api/market-research/reports?clientId=${client?.id}&reportId=${reportId}`)
    const data = await res.json()
    if (data.data) { setActive(data.data); setTab('Resumen') }
  }

  if (loading) return (
    <div className="min-h-screen bg-[#0b0f1a] flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="h-10 w-10 border-2 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin" />
        <p className="text-slate-400 text-sm">Cargando tu informe de mercado...</p>
      </div>
    </div>
  )

  if (error) return (
    <div className="min-h-screen bg-[#0b0f1a] flex items-center justify-center">
      <div className="text-center">
        <div className="text-4xl mb-4">⚠️</div>
        <p className="text-slate-400">{error}</p>
      </div>
    </div>
  )

  const d   = active?.report_data || {}
  const ex  = (d.executive_summary  || {}) as ReportData
  const mo  = (d.market_overview    || {}) as ReportData
  const cs  = (d.competitors        || []) as ReportData[]
  const ai  = (d.ad_intelligence    || {}) as ReportData
  const sw  = (d.swot               || {}) as ReportData
  const rc  = (d.recommendations    || {}) as ReportData
  const kp  = (d.kpis_to_watch      || []) as ReportData[]

  return (
    <div className="min-h-screen bg-[#0b0f1a] text-slate-200">
      {/* Header */}
      <header className="bg-[#111827] border-b border-[#1f2d45] px-6 h-16 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-sm font-bold">
            {client?.name?.[0]?.toUpperCase() || 'A'}
          </div>
          <div>
            <p className="text-sm font-semibold leading-tight">{client?.name || '—'}</p>
            <p className="text-xs text-slate-500">{client?.industry} · {client?.country}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {active && (
            <span className="text-xs bg-indigo-500/15 text-indigo-300 px-3 py-1 rounded-full font-medium">
              {fmtMonth(active.report_month)}
            </span>
          )}
          <span className="text-xs bg-emerald-500/15 text-emerald-400 px-3 py-1 rounded-full font-medium">✦ Actualización automática</span>
        </div>
      </header>

      {/* No report */}
      {!active ? (
        <div className="flex flex-col items-center justify-center h-[70vh] text-center">
          <div className="text-5xl mb-4">📋</div>
          <h2 className="text-lg font-semibold text-slate-300 mb-2">Tu primer informe está en camino</h2>
          <p className="text-sm text-slate-500 max-w-sm">Tu agencia generará el análisis de mercado mensual automáticamente. El primer informe estará disponible pronto.</p>
        </div>
      ) : (
        <>
          {/* Tabs */}
          <nav className="bg-[#111827] border-b border-[#1f2d45] px-6 flex gap-1 overflow-x-auto">
            {TABS.map(t => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`px-4 py-3.5 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                  tab === t
                    ? 'border-indigo-500 text-indigo-300'
                    : 'border-transparent text-slate-500 hover:text-slate-300'
                }`}
              >
                {t}
              </button>
            ))}
          </nav>

          <main className="max-w-5xl mx-auto px-6 py-8">

            {/* ── RESUMEN ── */}
            {tab === 'Resumen' && (
              <div className="space-y-6">
                {(ex.urgency_alert as string) && (
                  <div className="flex gap-3 p-4 rounded-xl bg-red-500/10 border border-red-500/20">
                    <span className="text-xl">🚨</span>
                    <div>
                      <p className="text-sm font-semibold text-red-400 mb-1">Acción urgente esta semana</p>
                      <p className="text-sm text-slate-300">{ex.urgency_alert as string}</p>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {[
                    { label: 'Competidores', value: cs.length, color: 'text-indigo-400' },
                    { label: 'Amenazas altas', value: cs.filter(c => c.threat_level === 'alto').length, color: 'text-red-400' },
                    { label: 'Oportunidades', value: (sw.opportunities as string[])?.length || 0, color: 'text-emerald-400' },
                    { label: 'Estado mercado', value: mo.industry_status as string || '—', color: 'text-yellow-400' },
                  ].map((m, i) => (
                    <div key={i} className="rounded-xl bg-[#111827] border border-[#1f2d45] p-4 text-center">
                      <p className={`text-2xl font-bold ${m.color}`}>{m.value}</p>
                      <p className="text-xs text-slate-500 mt-1">{m.label}</p>
                    </div>
                  ))}
                </div>

                <div className="rounded-xl bg-[#111827] border border-[#1f2d45] p-5">
                  <p className="text-lg font-bold text-slate-100 mb-3">{ex.headline as string}</p>
                  <p className="text-sm text-slate-400 leading-relaxed">{mo.trend_summary as string}</p>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div className="rounded-xl bg-[#111827] border border-[#1f2d45] p-5">
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Hallazgos clave</p>
                    {((ex.key_findings as string[]) || []).map((f, i) => (
                      <div key={i} className="flex gap-2 mb-2">
                        <span className="h-1.5 w-1.5 rounded-full bg-indigo-500 mt-2 flex-shrink-0" />
                        <p className="text-sm text-slate-300">{f}</p>
                      </div>
                    ))}
                  </div>
                  <div className="rounded-xl bg-[#111827] border border-[#1f2d45] p-5">
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Oportunidades top</p>
                    {((ex.top_opportunities as string[]) || []).map((o, i) => (
                      <div key={i} className="flex gap-2 mb-2">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 mt-2 flex-shrink-0" />
                        <p className="text-sm text-slate-300">{o}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* ── COMPETIDORES ── */}
            {tab === 'Competidores' && (
              <div className="grid md:grid-cols-2 gap-4">
                {cs.map((c, i) => {
                  const pa = (c.paid_ads || {}) as ReportData
                  const sm = (c.social_media || {}) as ReportData
                  const wa = (c.website_analysis || {}) as ReportData
                  const threat = c.threat_level as string
                  return (
                    <div key={i} className={`rounded-xl border p-5 relative overflow-hidden ${
                      threat === 'alto'  ? 'border-red-500/30 bg-red-500/5' :
                      threat === 'medio' ? 'border-yellow-500/30 bg-yellow-500/5' :
                      'border-emerald-500/30 bg-emerald-500/5'
                    }`}>
                      <div className={`absolute top-0 left-0 right-0 h-0.5 ${
                        threat === 'alto'  ? 'bg-red-500' :
                        threat === 'medio' ? 'bg-yellow-500' :
                        'bg-emerald-500'
                      }`} />
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <p className="font-bold text-slate-100">{c.name as string}</p>
                          {(c.website as string) && <p className="text-xs text-slate-500">{c.website as string}</p>}
                        </div>
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                          threat === 'alto'  ? 'bg-red-500/20 text-red-400' :
                          threat === 'medio' ? 'bg-yellow-500/20 text-yellow-400' :
                          'bg-emerald-500/20 text-emerald-400'
                        }`}>{threat?.toUpperCase()}</span>
                      </div>

                      <div className="grid grid-cols-2 gap-2 mb-3">
                        {[
                          ['Instagram', fmtNum(sm.instagram_followers as number)],
                          ['ER estimado', (sm.instagram_er_estimate as string) || '—'],
                          ['Meta Ads', pa.meta_ads_active ? '🟢 Activo' : '⚫'],
                          ['Google Ads', pa.google_ads_active ? '🟢 Activo' : '⚫'],
                        ].map(([l, v], j) => (
                          <div key={j} className="bg-[#0b0f1a]/60 rounded-lg p-2 text-center">
                            <p className="text-sm font-semibold text-slate-200">{v}</p>
                            <p className="text-xs text-slate-500">{l}</p>
                          </div>
                        ))}
                      </div>

                      <p className="text-xs text-slate-400 italic mb-2">"{wa.value_proposition as string}"</p>

                      {(pa.meta_main_angles as string[])?.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {(pa.meta_main_angles as string[]).map((a, j) => (
                            <span key={j} className="text-xs bg-amber-500/15 text-amber-400 px-2 py-0.5 rounded">{a}</span>
                          ))}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}

            {/* ── ANUNCIOS ── */}
            {tab === 'Anuncios' && (
              <div className="space-y-5">
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { l: 'Formato dominante', v: ai.dominant_format_in_market as string, c: 'text-indigo-400' },
                    { l: 'Saturación',        v: ai.market_saturation as string,          c: 'text-yellow-400' },
                    { l: 'Mejores días',      v: ai.best_ad_days as string,               c: 'text-emerald-400' },
                  ].map((m, i) => (
                    <div key={i} className="rounded-xl bg-[#111827] border border-[#1f2d45] p-4 text-center">
                      <p className={`text-base font-bold ${m.c}`}>{m.v || '—'}</p>
                      <p className="text-xs text-slate-500 mt-1">{m.l}</p>
                    </div>
                  ))}
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div className="rounded-xl bg-[#111827] border border-[#1f2d45] p-5">
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Gatillos emocionales del mercado</p>
                    <div className="flex flex-wrap gap-2">
                      {((ai.top_emotional_triggers as string[]) || []).map((t, i) => (
                        <span key={i} className="text-sm bg-purple-500/15 text-purple-300 px-3 py-1.5 rounded-full">{t}</span>
                      ))}
                    </div>
                  </div>
                  <div className="rounded-xl bg-[#111827] border border-[#1f2d45] p-5">
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Hooks más usados</p>
                    {((ai.common_hooks as string[]) || []).map((h, i) => (
                      <p key={i} className="text-sm text-slate-300 flex gap-2 mb-1.5">
                        <span className="text-slate-500">—</span>{h}
                      </p>
                    ))}
                  </div>
                </div>

                <div className="rounded-xl bg-[#111827] border border-[#1f2d45] p-5">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">✨ Ángulos no explotados — oportunidades para diferenciarte</p>
                  <div className="flex flex-wrap gap-2">
                    {((ai.untapped_angles as string[]) || []).map((a, i) => (
                      <span key={i} className="text-sm bg-emerald-500/15 text-emerald-300 border border-emerald-500/20 px-3 py-1.5 rounded-full">✨ {a}</span>
                    ))}
                  </div>
                </div>

                <div className="rounded-xl bg-[#111827] border border-[#1f2d45] p-5">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Oportunidades específicas de ads para ti</p>
                  {((ai.client_ad_opportunities as string[]) || []).map((o, i) => (
                    <div key={i} className="flex gap-2 mb-2">
                      <span className="h-1.5 w-1.5 rounded-full bg-indigo-500 mt-2 flex-shrink-0" />
                      <p className="text-sm text-slate-300">{o}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ── MERCADO ── */}
            {tab === 'Mercado' && (
              <div className="space-y-5">
                <div className="rounded-xl bg-[#111827] border border-[#1f2d45] p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Estado</p>
                    <span className="text-sm font-bold text-indigo-400">{mo.industry_status as string}</span>
                  </div>
                  <p className="text-sm text-slate-300 leading-relaxed">{mo.trend_summary as string}</p>
                </div>

                <div className="rounded-xl bg-[#111827] border border-[#1f2d45] p-5">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Tendencias del sector</p>
                  <div className="space-y-3">
                    {((mo.key_trends as Array<{trend: string; impact: string; description: string}>) || []).map((t, i) => (
                      <div key={i} className="flex items-start gap-3">
                        <span className={`h-2 w-2 rounded-full mt-1.5 flex-shrink-0 ${
                          t.impact === 'alto'  ? 'bg-red-400' :
                          t.impact === 'medio' ? 'bg-yellow-400' :
                          'bg-slate-500'
                        }`} />
                        <div>
                          <p className="text-sm font-semibold text-slate-200">{t.trend}</p>
                          <p className="text-xs text-slate-500">{t.description}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {(mo.seasonal_notes as string) && (
                  <div className="rounded-xl bg-[#111827] border border-[#1f2d45] p-5">
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Estacionalidad</p>
                    <p className="text-sm text-slate-300">{mo.seasonal_notes as string}</p>
                  </div>
                )}
              </div>
            )}

            {/* ── OPORTUNIDADES ── */}
            {tab === 'Oportunidades' && (
              <div className="space-y-6">
                {/* FODA */}
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { key: 'strengths',    label: '💪 Fortalezas',   cls: 'border-emerald-500/30 bg-emerald-500/5' },
                    { key: 'weaknesses',   label: '⚠️ Debilidades',   cls: 'border-red-500/30    bg-red-500/5' },
                    { key: 'opportunities',label: '🚀 Oportunidades', cls: 'border-indigo-500/30  bg-indigo-500/5' },
                    { key: 'threats',      label: '🌩 Amenazas',      cls: 'border-amber-500/30   bg-amber-500/5' },
                  ].map(({ key, label, cls }) => (
                    <div key={key} className={`rounded-xl border p-4 ${cls}`}>
                      <p className="text-xs font-bold text-slate-300 mb-3">{label}</p>
                      {((sw[key] as string[]) || []).map((item, i) => (
                        <p key={i} className="text-xs text-slate-400 flex gap-1.5 mb-1.5"><span className="text-slate-600">—</span>{item}</p>
                      ))}
                    </div>
                  ))}
                </div>

                {/* Recomendaciones */}
                {[
                  { key: 'immediate',  label: '🔴 Urgentes — esta semana',   bg: 'border-red-500/30    bg-red-500/5' },
                  { key: 'short_term', label: '🟡 Corto plazo — este mes',   bg: 'border-yellow-500/30 bg-yellow-500/5' },
                  { key: 'strategic',  label: '🟢 Estratégicas — 3-6 meses', bg: 'border-emerald-500/30 bg-emerald-500/5' },
                ].map(({ key, label, bg }) => (
                  <div key={key}>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">{label}</p>
                    {((rc[key] as Array<{action: string; why: string; expected_impact: string; effort: string}>) || []).map((r, i) => (
                      <div key={i} className={`rounded-xl border p-4 mb-2 ${bg}`}>
                        <p className="text-sm font-semibold text-slate-200 mb-1">{r.action}</p>
                        <p className="text-xs text-slate-400 mb-0.5"><strong className="text-slate-500">Por qué:</strong> {r.why}</p>
                        <p className="text-xs text-slate-400"><strong className="text-slate-500">Impacto:</strong> {r.expected_impact}</p>
                        <span className="inline-block mt-2 text-xs bg-white/5 border border-white/10 px-2 py-0.5 rounded font-medium text-slate-400">
                          Esfuerzo {r.effort}
                        </span>
                      </div>
                    ))}
                  </div>
                ))}

                {/* KPIs */}
                {kp.length > 0 && (
                  <div>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">📐 KPIs a monitorear</p>
                    <div className="grid md:grid-cols-2 gap-3">
                      {kp.map((k, i) => (
                        <div key={i} className="rounded-xl bg-[#111827] border border-[#1f2d45] p-4">
                          <p className="text-sm font-semibold text-slate-200 mb-1">{k.metric as string}</p>
                          <p className="text-xs text-slate-500">Benchmark: <span className="text-slate-300 font-medium">{k.current_benchmark as string}</span></p>
                          <p className="text-xs text-emerald-400 mt-0.5">Meta 3 meses: {k.target_3months as string}</p>
                          <p className="text-xs text-slate-600 mt-1">{k.how_to_measure as string}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ── HISTORIAL ── */}
            {tab === 'Historial' && (
              <div className="space-y-4">
                <div className="rounded-xl bg-[#111827] border border-[#1f2d45] p-5">
                  {reports.length === 0 ? (
                    <p className="text-sm text-slate-500 text-center py-8">Sin reportes anteriores</p>
                  ) : (
                    <ul className="divide-y divide-[#1f2d45]">
                      {reports.map(r => (
                        <li key={r.id} className="flex items-center justify-between py-4">
                          <div>
                            <p className="text-sm font-semibold text-slate-200">{fmtMonth(r.report_month)}</p>
                            <p className="text-xs text-slate-500 mt-0.5">
                              {r.id === active?.id ? '📌 Viendo ahora · ' : ''}
                              {new Date(r.created_at).toLocaleDateString('es-ES')}
                            </p>
                          </div>
                          {r.id !== active?.id && (
                            <button
                              onClick={() => loadReport(r.id)}
                              className="text-sm text-indigo-400 hover:underline font-medium"
                            >
                              Ver →
                            </button>
                          )}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                <div className="rounded-xl border border-indigo-500/20 bg-indigo-500/5 p-5">
                  <p className="text-sm font-semibold text-indigo-300 mb-1">🗓 Próximo informe</p>
                  <p className="text-sm text-slate-400">
                    Tu siguiente análisis se genera automáticamente el <strong className="text-slate-200">1 de cada mes</strong>. No necesitas hacer nada.
                  </p>
                </div>
              </div>
            )}

          </main>
        </>
      )}
    </div>
  )
}
