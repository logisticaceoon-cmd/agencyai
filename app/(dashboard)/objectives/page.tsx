'use client'

import { useState, useEffect, useCallback } from 'react'
import { Target, Plus, X, ChevronDown, ChevronUp, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface KeyResult {
  id: string; title: string; description: string; metric_type: string
  start_value: number; target_value: number; current_value: number
  unit: string; due_date: string; status: string
}
interface Objective {
  id: string; title: string; description: string; type: string
  client_id: string | null; quarter: string; year: number; status: string
  owner_id: string; clients: { id: string; name: string } | null
  key_results: KeyResult[]
}
interface Client { id: string; name: string }

const QUARTERS = ['Q1', 'Q2', 'Q3', 'Q4']

function getCurrentQuarter() {
  const m = new Date().getMonth()
  if (m < 3) return 'Q1'
  if (m < 6) return 'Q2'
  if (m < 9) return 'Q3'
  return 'Q4'
}

export default function ObjectivesPage() {
  const [objectives, setObjectives] = useState<Objective[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [quarter, setQuarter] = useState(getCurrentQuarter())
  const [year, setYear] = useState(new Date().getFullYear())
  const [expanded, setExpanded] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [showKRForm, setShowKRForm] = useState<string | null>(null)
  const [showUpdateKR, setShowUpdateKR] = useState<string | null>(null)
  const [krValue, setKRValue] = useState('')
  const [saving, setSaving] = useState(false)

  const fetchData = useCallback(async () => {
    setLoading(true)
    const [oRes, cRes] = await Promise.all([
      fetch(`/api/objectives?quarter=${quarter}&year=${year}`),
      fetch('/api/clients'),
    ])
    if (oRes.ok) { const j = await oRes.json(); setObjectives(j.data || []) }
    if (cRes.ok) { const j = await cRes.json(); setClients(j.data || []) }
    setLoading(false)
  }, [quarter, year])

  useEffect(() => { fetchData() }, [fetchData])

  async function handleCreateObj(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setSaving(true)
    const fd = new FormData(e.currentTarget)
    await fetch('/api/objectives', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: fd.get('title'), description: fd.get('description'),
        type: fd.get('type'), client_id: fd.get('client_id') || undefined,
        quarter, year,
      }),
    })
    setSaving(false); setShowForm(false); fetchData()
  }

  async function handleCreateKR(e: React.FormEvent<HTMLFormElement>, objId: string) {
    e.preventDefault()
    setSaving(true)
    const fd = new FormData(e.currentTarget)
    await fetch(`/api/objectives/${objId}/key-results`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: fd.get('title'), metric_type: fd.get('metric_type'),
        start_value: parseFloat(fd.get('start_value') as string) || 0,
        target_value: parseFloat(fd.get('target_value') as string),
        unit: fd.get('unit'), due_date: fd.get('due_date') || undefined,
      }),
    })
    setSaving(false); setShowKRForm(null); fetchData()
  }

  async function handleUpdateKR(krId: string, objId: string) {
    if (!krValue) return
    setSaving(true)
    await fetch(`/api/objectives/${objId}/key-results`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ kr_id: krId, current_value: parseFloat(krValue) }),
    })
    setSaving(false); setShowUpdateKR(null); setKRValue(''); fetchData()
  }

  function getObjProgress(obj: Objective) {
    const krs = obj.key_results || []
    if (krs.length === 0) return 0
    const avg = krs.reduce((sum, kr) => {
      const range = Number(kr.target_value) - Number(kr.start_value)
      if (range === 0) return sum
      return sum + Math.min(100, ((Number(kr.current_value) - Number(kr.start_value)) / range) * 100)
    }, 0) / krs.length
    return Math.round(avg)
  }

  function getKRProgress(kr: KeyResult) {
    const range = Number(kr.target_value) - Number(kr.start_value)
    if (range === 0) return 0
    return Math.min(100, Math.round(((Number(kr.current_value) - Number(kr.start_value)) / range) * 100))
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Objetivos y OKRs</h1>
          <p className="mt-1 text-sm text-slate-500">Seguimiento de objetivos por trimestre</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-lg p-1">
            {QUARTERS.map(q => (
              <button key={q} onClick={() => setQuarter(q)} className={cn(
                'px-3 py-1.5 rounded-md text-xs font-medium transition-colors',
                quarter === q ? 'bg-blue-600 text-white' : 'text-slate-500 hover:bg-slate-50'
              )}>{q}</button>
            ))}
          </div>
          <select value={year} onChange={e => setYear(parseInt(e.target.value))} className="bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm">
            {[2024, 2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
          </select>
          <button onClick={() => setShowForm(true)} className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-blue-700">
            <Plus className="h-4 w-4" /> Nuevo objetivo
          </button>
        </div>
      </div>

      {showForm && (
        <form onSubmit={handleCreateObj} className="rounded-xl border border-slate-200 bg-white p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-900">Nuevo objetivo — {quarter} {year}</h3>
            <button type="button" onClick={() => setShowForm(false)}><X className="h-4 w-4 text-slate-400" /></button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div><label className="text-xs text-slate-500 mb-1 block font-medium">Titulo *</label><input name="title" required className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2.5 text-sm" /></div>
            <div className="grid grid-cols-2 gap-4">
              <div><label className="text-xs text-slate-500 mb-1 block font-medium">Tipo</label><select name="type" className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2.5 text-sm"><option value="agency">Agencia</option><option value="client">Cliente</option></select></div>
              <div><label className="text-xs text-slate-500 mb-1 block font-medium">Cliente</label><select name="client_id" className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2.5 text-sm"><option value="">Sin cliente</option>{clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
            </div>
          </div>
          <div><label className="text-xs text-slate-500 mb-1 block font-medium">Descripcion</label><textarea name="description" className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2.5 text-sm h-20 resize-none" /></div>
          <button type="submit" disabled={saving} className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-lg text-sm font-medium disabled:opacity-50">Crear objetivo</button>
        </form>
      )}

      {loading ? (
        <div className="space-y-4">{[1, 2].map(i => <div key={i} className="h-32 rounded-xl border border-slate-200 bg-white animate-pulse" />)}</div>
      ) : objectives.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white p-12 text-center">
          <Target className="h-12 w-12 text-slate-300 mx-auto mb-3" />
          <p className="text-sm text-slate-500">No hay objetivos para {quarter} {year}.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {objectives.map(obj => {
            const progress = getObjProgress(obj)
            const isExpanded = expanded === obj.id
            return (
              <div key={obj.id} className="rounded-xl border border-slate-200 bg-white overflow-hidden">
                <button onClick={() => setExpanded(isExpanded ? null : obj.id)} className="w-full flex items-center gap-4 p-5 text-left hover:bg-slate-50 transition-colors">
                  <div className="relative h-12 w-12 flex-shrink-0">
                    <svg className="h-12 w-12 -rotate-90" viewBox="0 0 36 36">
                      <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="#e2e8f0" strokeWidth="3" />
                      <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="#2563eb" strokeWidth="3" strokeDasharray={`${progress}, 100`} strokeLinecap="round" />
                    </svg>
                    <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-slate-700">{progress}%</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-semibold text-slate-900">{obj.title}</h3>
                      <span className={cn('text-[10px] px-2 py-0.5 rounded-full font-medium border',
                        obj.type === 'agency' ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-purple-50 text-purple-700 border-purple-200'
                      )}>{obj.type === 'agency' ? 'Agencia' : 'Cliente'}</span>
                      {obj.clients && <span className="text-xs text-slate-400">{obj.clients.name}</span>}
                    </div>
                    {obj.description && <p className="text-xs text-slate-500 mt-1 truncate">{obj.description}</p>}
                    <p className="text-xs text-slate-400 mt-1">{(obj.key_results || []).length} key results</p>
                  </div>
                  {isExpanded ? <ChevronUp className="h-5 w-5 text-slate-400" /> : <ChevronDown className="h-5 w-5 text-slate-400" />}
                </button>

                {isExpanded && (
                  <div className="border-t border-slate-100 p-5 space-y-4">
                    {(obj.key_results || []).map(kr => {
                      const krProg = getKRProgress(kr)
                      return (
                        <div key={kr.id} className="space-y-2">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm font-medium text-slate-800">{kr.title}</p>
                              <p className="text-xs text-slate-400">{Number(kr.current_value).toLocaleString()} / {Number(kr.target_value).toLocaleString()} {kr.unit || ''}</p>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className={cn('text-xs font-bold', krProg >= 70 ? 'text-green-600' : krProg >= 40 ? 'text-amber-600' : 'text-red-600')}>{krProg}%</span>
                              <button onClick={() => { setShowUpdateKR(showUpdateKR === kr.id ? null : kr.id); setKRValue(String(kr.current_value)) }} className="text-xs text-blue-600 hover:text-blue-700 font-medium">Actualizar</button>
                            </div>
                          </div>
                          <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                            <div className={cn('h-full rounded-full transition-all', krProg >= 70 ? 'bg-green-500' : krProg >= 40 ? 'bg-amber-500' : 'bg-red-500')} style={{ width: `${krProg}%` }} />
                          </div>
                          {showUpdateKR === kr.id && (
                            <div className="flex items-center gap-2 pt-1">
                              <input type="number" step="0.01" value={krValue} onChange={e => setKRValue(e.target.value)} className="flex-1 bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-sm" placeholder="Nuevo valor" />
                              <button onClick={() => handleUpdateKR(kr.id, obj.id)} disabled={saving} className="bg-blue-600 text-white px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-blue-700 disabled:opacity-50">
                                {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Guardar'}
                              </button>
                            </div>
                          )}
                        </div>
                      )
                    })}

                    {showKRForm === obj.id ? (
                      <form onSubmit={(e) => handleCreateKR(e, obj.id)} className="border-t border-slate-100 pt-4 space-y-3">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                          <div><label className="text-xs text-slate-500 mb-1 block">Titulo *</label><input name="title" required className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm" /></div>
                          <div><label className="text-xs text-slate-500 mb-1 block">Tipo metrica</label><select name="metric_type" className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm"><option value="percentage">Porcentaje</option><option value="number">Numero</option><option value="currency">Moneda</option><option value="boolean">Booleano</option></select></div>
                          <div><label className="text-xs text-slate-500 mb-1 block">Unidad</label><input name="unit" className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm" placeholder="%, USD, unid..." /></div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                          <div><label className="text-xs text-slate-500 mb-1 block">Valor inicial</label><input name="start_value" type="number" step="0.01" defaultValue="0" className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm" /></div>
                          <div><label className="text-xs text-slate-500 mb-1 block">Valor objetivo *</label><input name="target_value" type="number" step="0.01" required className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm" /></div>
                          <div><label className="text-xs text-slate-500 mb-1 block">Fecha limite</label><input name="due_date" type="date" className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm" /></div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button type="submit" disabled={saving} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-xs font-medium hover:bg-blue-700 disabled:opacity-50">Crear KR</button>
                          <button type="button" onClick={() => setShowKRForm(null)} className="text-xs text-slate-500 hover:text-slate-700">Cancelar</button>
                        </div>
                      </form>
                    ) : (
                      <button onClick={() => setShowKRForm(obj.id)} className="flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-700 font-medium pt-2">
                        <Plus className="h-3 w-3" /> Agregar Key Result
                      </button>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {!loading && objectives.length > 0 && (
        <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-200">
            <h3 className="text-sm font-semibold text-slate-900">Resumen {quarter} {year}</h3>
          </div>
          <table className="w-full">
            <thead><tr className="bg-slate-50 border-b border-slate-200">
              <th className="text-left px-5 py-2.5 text-xs font-semibold text-slate-500 uppercase">Objetivo</th>
              <th className="text-center px-5 py-2.5 text-xs font-semibold text-slate-500 uppercase">Tipo</th>
              <th className="text-center px-5 py-2.5 text-xs font-semibold text-slate-500 uppercase">Key Results</th>
              <th className="text-center px-5 py-2.5 text-xs font-semibold text-slate-500 uppercase">Progreso</th>
            </tr></thead>
            <tbody className="divide-y divide-slate-100">
              {[...objectives].sort((a, b) => getObjProgress(b) - getObjProgress(a)).map(obj => {
                const p = getObjProgress(obj)
                return (
                  <tr key={obj.id} className="hover:bg-slate-50">
                    <td className="px-5 py-3 text-sm font-medium text-slate-800">{obj.title}</td>
                    <td className="px-5 py-3 text-center text-xs text-slate-500">{obj.type === 'agency' ? 'Agencia' : 'Cliente'}</td>
                    <td className="px-5 py-3 text-center text-sm text-slate-600">{(obj.key_results || []).length}</td>
                    <td className="px-5 py-3">
                      <div className="flex items-center justify-center gap-2">
                        <div className="w-24 h-2 bg-slate-100 rounded-full overflow-hidden">
                          <div className={cn('h-full rounded-full', p >= 70 ? 'bg-green-500' : p >= 40 ? 'bg-amber-500' : 'bg-red-500')} style={{ width: `${p}%` }} />
                        </div>
                        <span className="text-xs font-bold text-slate-700 w-8">{p}%</span>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
