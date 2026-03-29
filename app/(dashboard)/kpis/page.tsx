'use client'

import { useState, useEffect, useCallback } from 'react'
import { BarChart2, Plus, X, TrendingUp, TrendingDown, AlertTriangle, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { AgentWidget } from '@/components/ai/AgentWidget'

interface KPIRecord { id: string; value: number; period_start: string; period_end: string; notes: string; recorded_at: string }
interface KPI {
  id: string; name: string; description: string; unit: string; target_value: number
  current_value: number; frequency: string; category: string; color: string
  client_id: string; clients: { id: string; name: string } | null
  kpi_records: KPIRecord[]
}
interface Client { id: string; name: string }

const CATEGORIES = [
  { value: 'performance', label: 'Performance' },
  { value: 'financiero', label: 'Financiero' },
  { value: 'operacional', label: 'Operacional' },
  { value: 'satisfaccion', label: 'Satisfaccion' },
]

export default function KPIsPage() {
  const [kpis, setKpis] = useState<KPI[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [filterClient, setFilterClient] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [wizardStep, setWizardStep] = useState(1)
  const [wizardData, setWizardData] = useState({ name: '', description: '', unit: 'numero', target_value: '', color: '#2563eb', client_id: '', current_value: '', frequency: 'monthly' })
  const [showRecordForm, setShowRecordForm] = useState<string | null>(null)
  const [recordValue, setRecordValue] = useState('')
  const [recordNotes, setRecordNotes] = useState('')
  const [saving, setSaving] = useState(false)

  const KPI_TEMPLATES = [
    { icon: '📱', name: 'Alcance total', description: 'Personas unicas que vieron tu contenido', unit: 'personas', target: '10000' },
    { icon: '❤️', name: 'Tasa de engagement', description: 'Likes + comentarios + compartidos / alcance x 100', unit: 'porcentaje', target: '5' },
    { icon: '👥', name: 'Nuevos seguidores', description: 'Crecimiento de la comunidad por periodo', unit: 'numero', target: '500' },
    { icon: '🎥', name: 'Reproducciones de video', description: 'Total de views en Reels, TikTok o YouTube', unit: 'numero', target: '50000' },
    { icon: '💰', name: 'Conversiones / Ventas', description: 'Ventas o leads generados desde contenido', unit: 'numero', target: '50' },
  ]

  function selectTemplate(t: typeof KPI_TEMPLATES[0] | null) {
    if (t) {
      setWizardData(prev => ({ ...prev, name: t.name, description: t.description, unit: t.unit, target_value: t.target }))
    } else {
      setWizardData(prev => ({ ...prev, name: '', description: '', unit: 'numero', target_value: '' }))
    }
    setWizardStep(2)
  }

  function openWizard() { setShowForm(true); setWizardStep(1) }

  const fetchKpis = useCallback(async () => {
    setLoading(true)
    const [kRes, cRes] = await Promise.all([
      fetch(filterClient ? `/api/kpis?clientId=${filterClient}` : '/api/kpis'),
      fetch('/api/clients'),
    ])
    if (kRes.ok) { const j = await kRes.json(); setKpis(j.data || []) }
    if (cRes.ok) { const j = await cRes.json(); setClients(j.data || []) }
    setLoading(false)
  }, [filterClient])

  useEffect(() => { fetchKpis() }, [fetchKpis])

  async function handleCreate() {
    setSaving(true)
    await fetch('/api/kpis', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: wizardData.name, description: wizardData.description,
        client_id: wizardData.client_id || undefined, unit: wizardData.unit,
        target_value: parseFloat(wizardData.target_value) || 0,
        current_value: parseFloat(wizardData.current_value) || 0,
        frequency: wizardData.frequency, category: 'performance',
        color: wizardData.color,
      }),
    })
    setSaving(false); setShowForm(false)
    setWizardData({ name: '', description: '', unit: 'numero', target_value: '', color: '#2563eb', client_id: '', current_value: '', frequency: 'monthly' })
    fetchKpis()
  }

  async function handleRecord(kpiId: string) {
    if (!recordValue) return
    setSaving(true)
    const now = new Date()
    await fetch(`/api/kpis/${kpiId}/records`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        value: parseFloat(recordValue),
        period_start: new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0],
        period_end: now.toISOString().split('T')[0],
        notes: recordNotes,
      }),
    })
    setSaving(false); setShowRecordForm(null); setRecordValue(''); setRecordNotes(''); fetchKpis()
  }

  function getProgress(kpi: KPI) {
    if (!kpi.target_value) return 0
    return Math.min(100, (Number(kpi.current_value) / Number(kpi.target_value)) * 100)
  }

  function getTrend(kpi: KPI): 'up' | 'down' | 'none' {
    const records = kpi.kpi_records || []
    if (records.length < 2) return 'none'
    const sorted = [...records].sort((a, b) => new Date(b.recorded_at).getTime() - new Date(a.recorded_at).getTime())
    return sorted[0].value >= sorted[1].value ? 'up' : 'down'
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">KPIs y Metricas</h1>
          <p className="mt-1 text-sm text-slate-500">Seguimiento de indicadores clave</p>
        </div>
        <div className="flex items-center gap-3">
          <select value={filterClient} onChange={e => setFilterClient(e.target.value)} className="bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm">
            <option value="">Todos los clientes</option>
            {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <button onClick={openWizard} className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-blue-700">
            <Plus className="h-4 w-4" /> Nuevo KPI
          </button>
        </div>
      </div>

      {showForm && (
        <div className="rounded-xl border border-slate-200 bg-white p-6 space-y-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-3">
              <h3 className="text-sm font-semibold text-slate-900">Nuevo KPI — Paso {wizardStep} de 3</h3>
              <div className="flex gap-1">{[1,2,3].map(s => <div key={s} className={cn('h-1.5 w-8 rounded-full', s <= wizardStep ? 'bg-blue-600' : 'bg-slate-200')} />)}</div>
            </div>
            <button type="button" onClick={() => setShowForm(false)}><X className="h-4 w-4 text-slate-400" /></button>
          </div>

          {wizardStep === 1 && (
            <div className="space-y-3">
              <p className="text-sm text-slate-500">Elegi un tipo de KPI o crea uno personalizado</p>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {KPI_TEMPLATES.map((t, i) => (
                  <button key={i} onClick={() => selectTemplate(t)} className="text-left p-4 rounded-xl border border-slate-200 hover:border-blue-400 hover:bg-blue-50/50 transition-colors">
                    <span className="text-2xl">{t.icon}</span>
                    <p className="text-sm font-semibold text-slate-900 mt-2">{t.name}</p>
                    <p className="text-xs text-slate-400 mt-1 line-clamp-2">{t.description}</p>
                    <p className="text-xs text-blue-600 mt-1 font-medium">Meta: {t.target}/{t.unit === 'porcentaje' ? '%' : 'mes'}</p>
                  </button>
                ))}
                <button onClick={() => selectTemplate(null)} className="text-left p-4 rounded-xl border-2 border-dashed border-slate-300 hover:border-blue-400 transition-colors">
                  <span className="text-2xl">✏️</span>
                  <p className="text-sm font-semibold text-slate-900 mt-2">KPI Personalizado</p>
                  <p className="text-xs text-slate-400 mt-1">Defini tu propio indicador</p>
                </button>
              </div>
            </div>
          )}

          {wizardStep === 2 && (
            <div className="space-y-4">
              <p className="text-sm text-slate-500">Configura los detalles del KPI</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div><label className="text-xs text-slate-500 mb-1 block font-medium">Nombre *</label><input value={wizardData.name} onChange={e => setWizardData(p => ({...p, name: e.target.value}))} className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2.5 text-sm" /></div>
                <div><label className="text-xs text-slate-500 mb-1 block font-medium">Cliente</label><select value={wizardData.client_id} onChange={e => setWizardData(p => ({...p, client_id: e.target.value}))} className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2.5 text-sm"><option value="">Sin cliente</option>{clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
              </div>
              <div><label className="text-xs text-slate-500 mb-1 block font-medium">Descripcion</label><input value={wizardData.description} onChange={e => setWizardData(p => ({...p, description: e.target.value}))} className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2.5 text-sm" /></div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div><label className="text-xs text-slate-500 mb-1 block font-medium">Valor objetivo *</label><input type="number" step="0.01" value={wizardData.target_value} onChange={e => setWizardData(p => ({...p, target_value: e.target.value}))} className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2.5 text-sm" /></div>
                <div><label className="text-xs text-slate-500 mb-1 block font-medium">Unidad</label><select value={wizardData.unit} onChange={e => setWizardData(p => ({...p, unit: e.target.value}))} className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2.5 text-sm"><option value="numero">Numero</option><option value="porcentaje">Porcentaje</option><option value="personas">Personas</option><option value="moneda">Moneda</option></select></div>
                <div><label className="text-xs text-slate-500 mb-1 block font-medium">Valor actual</label><input type="number" step="0.01" value={wizardData.current_value} onChange={e => setWizardData(p => ({...p, current_value: e.target.value}))} placeholder="0" className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2.5 text-sm" /></div>
              </div>
              <div className="flex justify-between pt-2">
                <button onClick={() => setWizardStep(1)} className="text-sm text-slate-500 hover:text-slate-700">Atras</button>
                <button onClick={() => setWizardStep(3)} disabled={!wizardData.name || !wizardData.target_value} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50">Siguiente</button>
              </div>
            </div>
          )}

          {wizardStep === 3 && (
            <div className="space-y-4">
              <p className="text-sm text-slate-500">Con que frecuencia revisas este KPI?</p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                  { value: 'daily', icon: '📅', label: 'Diaria', desc: 'Ideal para metricas de alto volumen' },
                  { value: 'weekly', icon: '📆', label: 'Semanal', desc: 'Perfecto para engagement y seguidores' },
                  { value: 'biweekly', icon: '🗓️', label: 'Quincenal', desc: 'Para metricas de crecimiento moderado' },
                  { value: 'monthly', icon: '📊', label: 'Mensual', desc: 'Para resultados de conversion y ventas' },
                ].map(f => (
                  <button key={f.value} onClick={() => setWizardData(p => ({...p, frequency: f.value}))} className={cn('text-left p-4 rounded-xl border-2 transition-all', wizardData.frequency === f.value ? 'border-blue-500 bg-blue-50' : 'border-slate-200 hover:border-blue-300')}>
                    <span className="text-2xl">{f.icon}</span>
                    <p className="text-sm font-semibold text-slate-900 mt-2">{f.label}</p>
                    <p className="text-xs text-slate-400 mt-1">{f.desc}</p>
                  </button>
                ))}
              </div>
              <div className="flex justify-between pt-2">
                <button onClick={() => setWizardStep(2)} className="text-sm text-slate-500 hover:text-slate-700">Atras</button>
                <button onClick={handleCreate} disabled={saving} className="bg-blue-600 text-white px-6 py-2.5 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
                  {saving ? <Loader2 className="h-4 w-4 animate-spin inline mr-2" /> : null} Crear KPI
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => <div key={i} className="h-48 rounded-xl border border-slate-200 bg-white animate-pulse" />)}
        </div>
      ) : kpis.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white p-12 text-center">
          <BarChart2 className="h-12 w-12 text-slate-300 mx-auto mb-3" />
          <p className="text-sm text-slate-500">No hay KPIs configurados.</p>
          <p className="text-xs text-slate-400 mt-1">Crea tu primer KPI para empezar a trackear metricas.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {kpis.map(kpi => {
            const progress = getProgress(kpi)
            const trend = getTrend(kpi)
            const belowTarget = Number(kpi.current_value) < Number(kpi.target_value) * 0.7
            const records = [...(kpi.kpi_records || [])].sort((a, b) => new Date(a.recorded_at).getTime() - new Date(b.recorded_at).getTime()).slice(-6)

            return (
              <div key={kpi.id} className="rounded-xl border border-slate-200 bg-white p-5 space-y-4">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <div className="h-3 w-3 rounded-full" style={{ backgroundColor: kpi.color }} />
                      <h3 className="text-sm font-semibold text-slate-900">{kpi.name}</h3>
                    </div>
                    {kpi.clients && <p className="text-xs text-slate-400 mt-0.5">{kpi.clients.name}</p>}
                  </div>
                  <div className="flex items-center gap-1">
                    {belowTarget && <span className="text-xs bg-amber-50 text-amber-700 border border-amber-200 px-2 py-0.5 rounded-full font-medium flex items-center gap-1"><AlertTriangle className="h-3 w-3" /> Bajo</span>}
                    {trend === 'up' && <TrendingUp className="h-4 w-4 text-green-500" />}
                    {trend === 'down' && <TrendingDown className="h-4 w-4 text-red-500" />}
                  </div>
                </div>
                <div className="flex items-end justify-between">
                  <div>
                    <p className="text-2xl font-bold text-slate-900">{Number(kpi.current_value).toLocaleString()}</p>
                    <p className="text-xs text-slate-400">de {Number(kpi.target_value).toLocaleString()} {kpi.unit}</p>
                  </div>
                  <div className="relative h-14 w-14">
                    <svg className="h-14 w-14 -rotate-90" viewBox="0 0 36 36">
                      <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="#e2e8f0" strokeWidth="3" />
                      <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke={kpi.color} strokeWidth="3" strokeDasharray={`${progress}, 100`} strokeLinecap="round" />
                    </svg>
                    <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-slate-700">{Math.round(progress)}%</span>
                  </div>
                </div>
                {records.length > 1 && (
                  <div className="h-16">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={records.map(r => ({ v: r.value }))}>
                        <Line type="monotone" dataKey="v" stroke={kpi.color} strokeWidth={2} dot={false} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                )}
                <button onClick={() => setShowRecordForm(showRecordForm === kpi.id ? null : kpi.id)} className="w-full text-center text-xs text-blue-600 hover:text-blue-700 font-medium py-1">Registrar valor</button>
                {showRecordForm === kpi.id && (
                  <div className="space-y-2 border-t border-slate-100 pt-3">
                    <input type="number" step="0.01" value={recordValue} onChange={e => setRecordValue(e.target.value)} placeholder="Valor actual" className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm" />
                    <input value={recordNotes} onChange={e => setRecordNotes(e.target.value)} placeholder="Notas (opcional)" className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm" />
                    <button onClick={() => handleRecord(kpi.id)} disabled={saving || !recordValue} className="w-full bg-blue-600 text-white rounded-lg py-2 text-xs font-medium hover:bg-blue-700 disabled:opacity-50">{saving ? 'Guardando...' : 'Guardar registro'}</button>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      <AgentWidget config={{
        name: 'Agente de Metricas',
        description: 'Te ayudo a definir y trackear los KPIs correctos',
        module: 'kpis',
        suggestions: ['Que KPIs debo trackear para mis clientes?', 'Como defino un buen objetivo de KPI?', 'Como presento los KPIs al cliente?'],
      }} />
    </div>
  )
}
