'use client'

import { useEffect, useState, useCallback } from 'react'
import { toast } from '@/hooks/use-toast'
import { downloadCSV } from '@/lib/export'
import { downloadPDF } from '@/lib/pdf'
import { cn, timeAgo } from '@/lib/utils'
import {
  MessageCircle,
  Plus,
  Search,
  Phone,
  Mail,
  Video,
  MessageSquare,
  StickyNote,
  MoreHorizontal,
  Download,
  Sparkles,
  X,
  Filter,
} from 'lucide-react'

interface Interaction {
  id: string
  client_id: string
  type: string
  date: string
  summary: string
  outcome: string | null
  next_action: string | null
  duration_minutes: number | null
  created_by: string | null
  created_at: string
  clients: { id: string; name: string } | null
}

interface Client {
  id: string
  name: string
}

const typeConfig: Record<string, { label: string; icon: typeof Phone; color: string; bg: string }> = {
  call:     { label: 'Llamada',   icon: Phone,          color: 'text-blue-600',   bg: 'bg-blue-50' },
  email:    { label: 'Email',     icon: Mail,           color: 'text-amber-600',  bg: 'bg-amber-50' },
  meeting:  { label: 'Reunion',   icon: Video,          color: 'text-purple-600', bg: 'bg-purple-50' },
  whatsapp: { label: 'WhatsApp',  icon: MessageSquare,  color: 'text-green-600',  bg: 'bg-green-50' },
  note:     { label: 'Nota',      icon: StickyNote,     color: 'text-slate-600',  bg: 'bg-slate-50' },
  other:    { label: 'Otro',      icon: MoreHorizontal, color: 'text-gray-600',   bg: 'bg-gray-50' },
}

export default function CommunicationsPage() {
  const [interactions, setInteractions] = useState<Interaction[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [clientFilter, setClientFilter] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [aiSummary, setAiSummary] = useState<string | null>(null)
  const [summaryLoading, setSummaryLoading] = useState(false)
  const [form, setForm] = useState({
    client_id: '',
    type: 'call',
    summary: '',
    outcome: '',
    next_action: '',
    duration_minutes: '',
    date: new Date().toISOString().slice(0, 16),
  })

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (clientFilter) params.set('client_id', clientFilter)
      if (typeFilter) params.set('type', typeFilter)

      const [interRes, clientsRes] = await Promise.all([
        fetch(`/api/communications?${params}`),
        fetch('/api/clients?limit=200'),
      ])

      if (interRes.ok) {
        const data = await interRes.json()
        setInteractions(data.data || [])
      }
      if (clientsRes.ok) {
        const data = await clientsRes.json()
        setClients(data.data || data || [])
      }
    } finally {
      setLoading(false)
    }
  }, [clientFilter, typeFilter])

  useEffect(() => { loadData() }, [loadData])

  const filtered = interactions.filter(i => {
    if (!searchQuery) return true
    const q = searchQuery.toLowerCase()
    return i.summary.toLowerCase().includes(q) ||
      (i.clients?.name || '').toLowerCase().includes(q) ||
      (i.outcome || '').toLowerCase().includes(q)
  })

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    try {
      const payload = {
        ...form,
        duration_minutes: form.duration_minutes ? parseInt(form.duration_minutes) : null,
      }

      const url = editingId ? `/api/communications/${editingId}` : '/api/communications'
      const method = editingId ? 'PATCH' : 'POST'

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (res.ok) {
        toast({ title: editingId ? 'Interaccion actualizada' : 'Interaccion registrada' })
        setShowModal(false)
        resetForm()
        loadData()
      } else {
        toast({ title: 'Error', description: 'No se pudo guardar', variant: 'destructive' })
      }
    } catch {
      toast({ title: 'Error', variant: 'destructive' })
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Eliminar esta interaccion?')) return
    const res = await fetch(`/api/communications/${id}`, { method: 'DELETE' })
    if (res.ok) {
      toast({ title: 'Eliminada' })
      loadData()
    }
  }

  function startEdit(i: Interaction) {
    setEditingId(i.id)
    setForm({
      client_id: i.client_id,
      type: i.type,
      summary: i.summary,
      outcome: i.outcome || '',
      next_action: i.next_action || '',
      duration_minutes: i.duration_minutes?.toString() || '',
      date: new Date(i.date).toISOString().slice(0, 16),
    })
    setShowModal(true)
  }

  function resetForm() {
    setEditingId(null)
    setForm({ client_id: '', type: 'call', summary: '', outcome: '', next_action: '', duration_minutes: '', date: new Date().toISOString().slice(0, 16) })
  }

  async function loadAISummary(clientId: string) {
    setSummaryLoading(true)
    setAiSummary(null)
    try {
      const res = await fetch(`/api/communications/summary?client_id=${clientId}`)
      if (res.ok) {
        const data = await res.json()
        setAiSummary(data.summary)
      }
    } finally {
      setSummaryLoading(false)
    }
  }

  function exportCSV() {
    downloadCSV(filtered.map(i => ({
      fecha: new Date(i.date).toLocaleDateString('es-ES'),
      tipo: typeConfig[i.type]?.label || i.type,
      cliente: i.clients?.name || '',
      resumen: i.summary,
      resultado: i.outcome || '',
      accion_pendiente: i.next_action || '',
      duracion_min: i.duration_minutes || '',
    })), 'comunicaciones', [
      { key: 'fecha', label: 'Fecha' },
      { key: 'tipo', label: 'Tipo' },
      { key: 'cliente', label: 'Cliente' },
      { key: 'resumen', label: 'Resumen' },
      { key: 'resultado', label: 'Resultado' },
      { key: 'accion_pendiente', label: 'Accion pendiente' },
      { key: 'duracion_min', label: 'Duracion (min)' },
    ])
  }

  function exportPDFList() {
    downloadPDF({
      title: 'Comunicaciones',
      subtitle: `${filtered.length} interacciones`,
      filename: `comunicaciones_${new Date().toISOString().slice(0, 10)}`,
      orientation: 'landscape',
      columns: [
        { key: 'fecha', label: 'Fecha' },
        { key: 'tipo', label: 'Tipo' },
        { key: 'cliente', label: 'Cliente' },
        { key: 'resumen', label: 'Resumen' },
        { key: 'resultado', label: 'Resultado' },
        { key: 'accion_pendiente', label: 'Accion pendiente' },
      ],
      data: filtered.map(i => ({
        fecha: new Date(i.date).toLocaleDateString('es-ES'),
        tipo: typeConfig[i.type]?.label || i.type,
        cliente: i.clients?.name || '',
        resumen: i.summary.slice(0, 80),
        resultado: (i.outcome || '').slice(0, 60),
        accion_pendiente: (i.next_action || '').slice(0, 60),
      })),
    })
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Comunicaciones</h1>
          <p className="mt-1 text-sm text-slate-500">Registro de interacciones con clientes</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={exportCSV} disabled={filtered.length === 0} className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50">
            <Download className="h-4 w-4" /> CSV
          </button>
          <button onClick={exportPDFList} disabled={filtered.length === 0} className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50">
            <Download className="h-4 w-4" /> PDF
          </button>
          <button onClick={() => { resetForm(); setShowModal(true) }} className="flex items-center gap-2 rounded-lg bg-[#2563eb] px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-blue-700">
            <Plus className="h-4 w-4" /> Nueva interaccion
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input type="text" placeholder="Buscar por resumen, cliente..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="w-full rounded-lg border border-slate-200 bg-white pl-10 pr-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500" />
        </div>
        <select value={clientFilter} onChange={e => setClientFilter(e.target.value)} className="rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 focus:border-blue-500 focus:outline-none">
          <option value="">Todos los clientes</option>
          {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)} className="rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 focus:border-blue-500 focus:outline-none">
          <option value="">Todos los tipos</option>
          {Object.entries(typeConfig).map(([key, val]) => <option key={key} value={key}>{val.label}</option>)}
        </select>
      </div>

      {/* AI Summary */}
      {clientFilter && (
        <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-blue-600" />
              <span className="text-sm font-semibold text-blue-900">Resumen IA</span>
            </div>
            <button onClick={() => loadAISummary(clientFilter)} disabled={summaryLoading} className="text-xs text-blue-600 hover:text-blue-800 font-medium">
              {summaryLoading ? 'Generando...' : aiSummary ? 'Regenerar' : 'Generar resumen'}
            </button>
          </div>
          {aiSummary && <p className="text-sm text-blue-800">{aiSummary}</p>}
          {!aiSummary && !summaryLoading && <p className="text-sm text-blue-600">Selecciona un cliente y genera un resumen con IA de las interacciones.</p>}
        </div>
      )}

      {/* List */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="rounded-lg border border-slate-200 bg-white p-4 animate-pulse">
              <div className="h-4 w-1/3 bg-slate-100 rounded mb-2" />
              <div className="h-3 w-2/3 bg-slate-100 rounded" />
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <MessageCircle className="h-10 w-10 text-slate-300 mb-3" />
          <p className="text-sm font-medium text-slate-600">Sin interacciones</p>
          <p className="text-xs text-slate-400 mt-1">Registra tu primera comunicacion con un cliente</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(i => {
            const tc = typeConfig[i.type] || typeConfig.other
            const Icon = tc.icon
            return (
              <div key={i.id} className="rounded-lg border border-slate-200 bg-white p-4 hover:border-slate-300 transition-colors">
                <div className="flex items-start gap-3">
                  <div className={cn('flex h-9 w-9 items-center justify-center rounded-lg flex-shrink-0', tc.bg)}>
                    <Icon className={cn('h-4 w-4', tc.color)} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={cn('inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold border', tc.bg, tc.color)}>{tc.label}</span>
                      {i.clients && <span className="text-xs text-slate-500">{i.clients.name}</span>}
                      <span className="text-xs text-slate-400">{timeAgo(i.date)}</span>
                      {i.duration_minutes && <span className="text-xs text-slate-400">{i.duration_minutes} min</span>}
                    </div>
                    <p className="text-sm text-slate-900">{i.summary}</p>
                    {i.outcome && <p className="text-xs text-slate-500 mt-1">Resultado: {i.outcome}</p>}
                    {i.next_action && (
                      <p className="text-xs text-amber-600 mt-1 flex items-center gap-1">
                        <Filter className="h-3 w-3" /> Pendiente: {i.next_action}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button onClick={() => startEdit(i)} className="rounded p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100">
                      <MoreHorizontal className="h-4 w-4" />
                    </button>
                    <button onClick={() => handleDelete(i.id)} className="rounded p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50">
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-slate-900">{editingId ? 'Editar interaccion' : 'Nueva interaccion'}</h2>
              <button onClick={() => { setShowModal(false); resetForm() }} className="rounded-lg p-1 hover:bg-slate-100">
                <X className="h-5 w-5 text-slate-500" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-sm font-medium text-slate-700">Cliente *</label>
                <select required value={form.client_id} onChange={e => setForm(f => ({ ...f, client_id: e.target.value }))} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none">
                  <option value="">Seleccionar cliente</option>
                  {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium text-slate-700">Tipo *</label>
                  <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none">
                    {Object.entries(typeConfig).map(([key, val]) => <option key={key} value={key}>{val.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-700">Duracion (min)</label>
                  <input type="number" value={form.duration_minutes} onChange={e => setForm(f => ({ ...f, duration_minutes: e.target.value }))} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none" />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700">Fecha</label>
                <input type="datetime-local" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none" />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700">Resumen *</label>
                <textarea required rows={3} value={form.summary} onChange={e => setForm(f => ({ ...f, summary: e.target.value }))} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none resize-none" placeholder="Que se discutio o comunico?" />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700">Resultado</label>
                <input type="text" value={form.outcome} onChange={e => setForm(f => ({ ...f, outcome: e.target.value }))} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none" placeholder="Que se decidio o acordo?" />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700">Accion pendiente</label>
                <input type="text" value={form.next_action} onChange={e => setForm(f => ({ ...f, next_action: e.target.value }))} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none" placeholder="Que queda por hacer?" />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => { setShowModal(false); resetForm() }} className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">Cancelar</button>
                <button type="submit" className="rounded-lg bg-[#2563eb] px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">{editingId ? 'Guardar' : 'Registrar'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
