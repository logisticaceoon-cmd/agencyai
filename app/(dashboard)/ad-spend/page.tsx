'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import {
  TrendingUp, Plus, X, DollarSign, MousePointerClick, Target,
  MoreVertical, Pencil, Trash2, Loader2, BarChart3, Search, Download,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { downloadCSV } from '@/lib/export'
import { downloadPDF } from '@/lib/pdf'
import * as Dialog from '@radix-ui/react-dialog'
import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import { toast } from '@/hooks/use-toast'

// ═══════════════════════════════════════
// TYPES
// ═══════════════════════════════════════

interface AdSpendRecord {
  id: string
  client_id: string
  platform: string
  campaign_name: string | null
  amount: number
  currency: string
  period_start: string
  period_end: string
  roas: number | null
  impressions: number | null
  clicks: number | null
  conversions: number | null
  cpa: number | null
  ctr: number | null
  notes: string | null
  created_at: string
  clients?: { id: string; name: string } | null
}

interface Client {
  id: string
  name: string
}

const PLATFORMS = [
  { value: 'meta', label: 'Meta Ads' },
  { value: 'google', label: 'Google Ads' },
  { value: 'tiktok', label: 'TikTok Ads' },
  { value: 'linkedin', label: 'LinkedIn Ads' },
  { value: 'twitter', label: 'Twitter/X Ads' },
  { value: 'other', label: 'Otro' },
]

const PLATFORM_COLORS: Record<string, string> = {
  meta: 'bg-blue-100 text-blue-700',
  google: 'bg-red-100 text-red-700',
  tiktok: 'bg-slate-100 text-slate-700',
  linkedin: 'bg-sky-100 text-sky-700',
  twitter: 'bg-slate-100 text-slate-700',
  other: 'bg-gray-100 text-gray-600',
}

const CURRENCIES = ['USD', 'ARS', 'CLP', 'MXN', 'EUR']

function fmt(n: number, currency = 'USD') {
  return new Intl.NumberFormat('es', { style: 'currency', currency, maximumFractionDigits: 0 }).format(n)
}

function fmtNum(n: number) {
  return new Intl.NumberFormat('es').format(n)
}

// ═══════════════════════════════════════
// SKELETON
// ═══════════════════════════════════════

function CardSkeleton() {
  return (
    <div className="rounded-xl border border-[var(--border-base)] bg-white p-5 animate-pulse">
      <div className="h-3 w-20 bg-slate-200 rounded mb-3" />
      <div className="h-7 w-28 bg-slate-200 rounded" />
    </div>
  )
}

function TableSkeleton() {
  return (
    <div className="space-y-3">
      {[...Array(5)].map((_, i) => (
        <div key={i} className="h-14 bg-slate-100 rounded-lg animate-pulse" />
      ))}
    </div>
  )
}

// ═══════════════════════════════════════
// MAIN PAGE
// ═══════════════════════════════════════

export default function AdSpendPage() {
  const [records, setRecords] = useState<AdSpendRecord[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [bulkLoading, setBulkLoading] = useState(false)

  // Filters
  const [filterClient, setFilterClient] = useState('')
  const [filterPlatform, setFilterPlatform] = useState('')
  const [filterFrom, setFilterFrom] = useState('')
  const [filterTo, setFilterTo] = useState('')

  // Modal
  const [showModal, setShowModal] = useState(false)
  const [editingRecord, setEditingRecord] = useState<AdSpendRecord | null>(null)

  // Form state
  const [form, setForm] = useState({
    client_id: '', platform: 'meta', campaign_name: '', amount: '',
    currency: 'USD', period_start: '', period_end: '',
    roas: '', impressions: '', clicks: '', conversions: '',
    cpa: '', ctr: '', notes: '',
  })

  const fetchRecords = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (filterClient) params.set('client_id', filterClient)
      if (filterPlatform) params.set('platform', filterPlatform)
      if (filterFrom) params.set('from', filterFrom)
      if (filterTo) params.set('to', filterTo)

      const res = await fetch(`/api/ad-spend?${params}`)
      const json = await res.json()
      setRecords(json.data || [])
    } catch {
      toast({ title: 'Error al cargar registros', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }, [filterClient, filterPlatform, filterFrom, filterTo])

  const fetchClients = useCallback(async () => {
    try {
      const res = await fetch('/api/clients')
      const json = await res.json()
      setClients((json.data || []).map((c: { id: string; name: string }) => ({ id: c.id, name: c.name })))
    } catch { /* ignore */ }
  }, [])

  useEffect(() => { fetchRecords() }, [fetchRecords])
  useEffect(() => { fetchClients() }, [fetchClients])

  // Summary calculations
  const summary = useMemo(() => {
    const now = new Date()
    const thisMonth = records.filter(r => {
      const d = new Date(r.period_start)
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
    })

    const totalSpend = thisMonth.reduce((s, r) => s + Number(r.amount), 0)
    const roasValues = records.filter(r => r.roas != null).map(r => Number(r.roas))
    const avgRoas = roasValues.length > 0 ? roasValues.reduce((s, v) => s + v, 0) / roasValues.length : 0
    const totalClicks = records.reduce((s, r) => s + (r.clicks || 0), 0)
    const totalConversions = records.reduce((s, r) => s + (r.conversions || 0), 0)

    return { totalSpend, avgRoas, totalClicks, totalConversions }
  }, [records])

  function resetForm() {
    setForm({
      client_id: '', platform: 'meta', campaign_name: '', amount: '',
      currency: 'USD', period_start: '', period_end: '',
      roas: '', impressions: '', clicks: '', conversions: '',
      cpa: '', ctr: '', notes: '',
    })
    setEditingRecord(null)
  }

  function openCreate() {
    resetForm()
    setShowModal(true)
  }

  function openEdit(record: AdSpendRecord) {
    setEditingRecord(record)
    setForm({
      client_id: record.client_id,
      platform: record.platform,
      campaign_name: record.campaign_name || '',
      amount: String(record.amount),
      currency: record.currency,
      period_start: record.period_start,
      period_end: record.period_end,
      roas: record.roas != null ? String(record.roas) : '',
      impressions: record.impressions != null ? String(record.impressions) : '',
      clicks: record.clicks != null ? String(record.clicks) : '',
      conversions: record.conversions != null ? String(record.conversions) : '',
      cpa: record.cpa != null ? String(record.cpa) : '',
      ctr: record.ctr != null ? String(record.ctr) : '',
      notes: record.notes || '',
    })
    setShowModal(true)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.client_id || !form.platform || !form.period_start || !form.period_end) {
      toast({ title: 'Completa los campos requeridos', variant: 'destructive' })
      return
    }

    setSaving(true)
    try {
      const payload: Record<string, unknown> = {
        client_id: form.client_id,
        platform: form.platform,
        campaign_name: form.campaign_name || null,
        amount: parseFloat(form.amount) || 0,
        currency: form.currency,
        period_start: form.period_start,
        period_end: form.period_end,
        roas: form.roas ? parseFloat(form.roas) : null,
        impressions: form.impressions ? parseInt(form.impressions) : null,
        clicks: form.clicks ? parseInt(form.clicks) : null,
        conversions: form.conversions ? parseInt(form.conversions) : null,
        cpa: form.cpa ? parseFloat(form.cpa) : null,
        ctr: form.ctr ? parseFloat(form.ctr) : null,
        notes: form.notes || null,
      }

      const url = editingRecord ? `/api/ad-spend/${editingRecord.id}` : '/api/ad-spend'
      const method = editingRecord ? 'PATCH' : 'POST'

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!res.ok) throw new Error()

      toast({ title: editingRecord ? 'Registro actualizado' : 'Registro creado' })
      setShowModal(false)
      resetForm()
      fetchRecords()
    } catch {
      toast({ title: 'Error al guardar', variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Eliminar este registro?')) return
    try {
      const res = await fetch(`/api/ad-spend/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error()
      toast({ title: 'Registro eliminado' })
      fetchRecords()
    } catch {
      toast({ title: 'Error al eliminar', variant: 'destructive' })
    }
  }

  // ── Bulk actions ──

  const allSelected = records.length > 0 && selectedIds.size === records.length
  const someSelected = selectedIds.size > 0 && selectedIds.size < records.length

  function toggleRecord(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function toggleAll() {
    if (allSelected) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(records.map((r) => r.id)))
    }
  }

  async function bulkDeleteRecords() {
    if (!confirm(`Eliminar ${selectedIds.size} registros seleccionados?`)) return
    setBulkLoading(true)
    try {
      const promises = Array.from(selectedIds).map((id) =>
        fetch(`/api/ad-spend/${id}`, { method: 'DELETE' })
      )
      await Promise.all(promises)
      setSelectedIds(new Set())
      fetchRecords()
    } finally {
      setBulkLoading(false)
    }
  }

  const inputCls = 'w-full rounded-lg border border-[var(--border-base)] bg-white px-3 py-2 text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--blue)]/30 focus:border-[var(--blue)]'
  const labelCls = 'block text-xs font-medium text-[var(--text-secondary)] mb-1'

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">Inversion en Ads</h1>
          <p className="text-sm text-[var(--text-muted)] mt-1">
            Seguimiento de gasto publicitario por cliente y plataforma
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => {
            const cols = [
              { key: 'plataforma', label: 'Plataforma' },
              { key: 'campana', label: 'Campana' },
              { key: 'cliente', label: 'Cliente' },
              { key: 'monto', label: 'Monto' },
              { key: 'roas', label: 'ROAS' },
              { key: 'clicks', label: 'Clicks' },
              { key: 'conversiones', label: 'Conversiones' },
              { key: 'periodo', label: 'Periodo' },
            ]
            const exportData = records.map((r: AdSpendRecord) => ({
              plataforma: r.platform,
              campana: r.campaign_name || '',
              cliente: r.clients?.name || r.client_id,
              monto: `${r.currency} ${r.amount}`,
              roas: r.roas?.toFixed(2) || '',
              clicks: r.clicks || '',
              conversiones: r.conversions || '',
              periodo: `${r.period_start} - ${r.period_end}`,
            }))
            downloadCSV(exportData, 'ad-spend', cols)
          }} disabled={records.length === 0} className="flex items-center gap-1.5 rounded-lg border border-[var(--border-base)] bg-white px-3 py-2 text-sm font-medium text-[var(--text-secondary)] hover:bg-slate-50 disabled:opacity-50">
            <Download size={14} /> CSV
          </button>
          <button onClick={() => {
            const cols = [
              { key: 'plataforma', label: 'Plataforma' },
              { key: 'campana', label: 'Campana' },
              { key: 'monto', label: 'Monto' },
              { key: 'roas', label: 'ROAS' },
              { key: 'clicks', label: 'Clicks' },
              { key: 'conversiones', label: 'Conversiones' },
            ]
            downloadPDF({
              title: 'Inversion en Ads',
              subtitle: `${records.length} registros`,
              filename: `ad-spend_${new Date().toISOString().slice(0, 10)}`,
              orientation: 'landscape',
              columns: cols,
              data: records.map((r: AdSpendRecord) => ({
                plataforma: r.platform,
                campana: r.campaign_name || '',
                monto: `${r.currency} ${r.amount}`,
                roas: r.roas?.toFixed(2) || '',
                clicks: String(r.clicks || ''),
                conversiones: String(r.conversions || ''),
              })),
            })
          }} disabled={records.length === 0} className="flex items-center gap-1.5 rounded-lg border border-[var(--border-base)] bg-white px-3 py-2 text-sm font-medium text-[var(--text-secondary)] hover:bg-slate-50 disabled:opacity-50">
            <Download size={14} /> PDF
          </button>
          <button
            onClick={openCreate}
            className="inline-flex items-center gap-2 rounded-lg bg-[var(--blue)] px-4 py-2.5 text-sm font-medium text-white hover:bg-[var(--blue-hover)] transition-colors"
          >
            <Plus size={16} /> Agregar registro
          </button>
        </div>
      </div>

      {/* Summary cards */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <CardSkeleton key={i} />)}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="rounded-xl border border-[var(--border-base)] bg-white p-5">
            <div className="flex items-center gap-2 mb-2">
              <div className="p-2 rounded-lg bg-blue-50"><DollarSign size={16} className="text-blue-600" /></div>
              <span className="text-xs font-medium text-[var(--text-muted)]">Gasto este mes</span>
            </div>
            <p className="text-2xl font-bold text-[var(--text-primary)]">{fmt(summary.totalSpend)}</p>
          </div>
          <div className="rounded-xl border border-[var(--border-base)] bg-white p-5">
            <div className="flex items-center gap-2 mb-2">
              <div className="p-2 rounded-lg bg-green-50"><TrendingUp size={16} className="text-green-600" /></div>
              <span className="text-xs font-medium text-[var(--text-muted)]">ROAS promedio</span>
            </div>
            <p className="text-2xl font-bold text-[var(--text-primary)]">{summary.avgRoas.toFixed(2)}x</p>
          </div>
          <div className="rounded-xl border border-[var(--border-base)] bg-white p-5">
            <div className="flex items-center gap-2 mb-2">
              <div className="p-2 rounded-lg bg-purple-50"><MousePointerClick size={16} className="text-purple-600" /></div>
              <span className="text-xs font-medium text-[var(--text-muted)]">Total clicks</span>
            </div>
            <p className="text-2xl font-bold text-[var(--text-primary)]">{fmtNum(summary.totalClicks)}</p>
          </div>
          <div className="rounded-xl border border-[var(--border-base)] bg-white p-5">
            <div className="flex items-center gap-2 mb-2">
              <div className="p-2 rounded-lg bg-amber-50"><Target size={16} className="text-amber-600" /></div>
              <span className="text-xs font-medium text-[var(--text-muted)]">Total conversiones</span>
            </div>
            <p className="text-2xl font-bold text-[var(--text-primary)]">{fmtNum(summary.totalConversions)}</p>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <select value={filterClient} onChange={e => setFilterClient(e.target.value)} className={cn(inputCls, 'w-48')}>
          <option value="">Todos los clientes</option>
          {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <select value={filterPlatform} onChange={e => setFilterPlatform(e.target.value)} className={cn(inputCls, 'w-40')}>
          <option value="">Todas las plataformas</option>
          {PLATFORMS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
        </select>
        <input type="date" value={filterFrom} onChange={e => setFilterFrom(e.target.value)} className={cn(inputCls, 'w-40')} placeholder="Desde" />
        <input type="date" value={filterTo} onChange={e => setFilterTo(e.target.value)} className={cn(inputCls, 'w-40')} placeholder="Hasta" />
        {(filterClient || filterPlatform || filterFrom || filterTo) && (
          <button
            onClick={() => { setFilterClient(''); setFilterPlatform(''); setFilterFrom(''); setFilterTo('') }}
            className="text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)] underline"
          >
            Limpiar filtros
          </button>
        )}
      </div>

      {/* Table */}
      <div className="rounded-xl border border-[var(--border-base)] bg-white overflow-hidden">
        {loading ? (
          <div className="p-6"><TableSkeleton /></div>
        ) : records.length === 0 ? (
          <div className="p-12 text-center">
            <BarChart3 size={48} className="mx-auto text-slate-300 mb-4" />
            <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-1">Sin registros de ads</h3>
            <p className="text-sm text-[var(--text-muted)] mb-4">Agrega tu primer registro de inversion publicitaria</p>
            <button onClick={openCreate} className="inline-flex items-center gap-2 rounded-lg bg-[var(--blue)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--blue-hover)]">
              <Plus size={16} /> Agregar registro
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--border-base)] bg-slate-50/50">
                  <th className="px-3 py-3 text-left w-10">
                    <input
                      type="checkbox"
                      checked={allSelected}
                      ref={(el) => { if (el) el.indeterminate = someSelected }}
                      onChange={toggleAll}
                      className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                    />
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-[var(--text-muted)] uppercase">Periodo</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-[var(--text-muted)] uppercase">Cliente</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-[var(--text-muted)] uppercase">Plataforma</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-[var(--text-muted)] uppercase">Campana</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-[var(--text-muted)] uppercase">Monto</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-[var(--text-muted)] uppercase">ROAS</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-[var(--text-muted)] uppercase">Clicks</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-[var(--text-muted)] uppercase">Conv.</th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-[var(--text-muted)] uppercase">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-base)]">
                {records.map(r => (
                  <tr key={r.id} className={cn("hover:bg-slate-50/50 transition-colors", selectedIds.has(r.id) && "bg-blue-50 hover:bg-blue-50")}>
                    <td className="px-3 py-3">
                      <input
                        type="checkbox"
                        checked={selectedIds.has(r.id)}
                        onChange={() => toggleRecord(r.id)}
                        className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                      />
                    </td>
                    <td className="px-4 py-3 text-[var(--text-secondary)] whitespace-nowrap">
                      {new Date(r.period_start).toLocaleDateString('es')} - {new Date(r.period_end).toLocaleDateString('es')}
                    </td>
                    <td className="px-4 py-3 font-medium text-[var(--text-primary)]">
                      {r.clients?.name || '-'}
                    </td>
                    <td className="px-4 py-3">
                      <span className={cn('inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium', PLATFORM_COLORS[r.platform] || PLATFORM_COLORS.other)}>
                        {PLATFORMS.find(p => p.value === r.platform)?.label || r.platform}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-[var(--text-secondary)] max-w-[200px] truncate">
                      {r.campaign_name || '-'}
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-[var(--text-primary)]">
                      {fmt(Number(r.amount), r.currency)}
                    </td>
                    <td className="px-4 py-3 text-right text-[var(--text-secondary)]">
                      {r.roas != null ? `${Number(r.roas).toFixed(2)}x` : '-'}
                    </td>
                    <td className="px-4 py-3 text-right text-[var(--text-secondary)]">
                      {r.clicks != null ? fmtNum(r.clicks) : '-'}
                    </td>
                    <td className="px-4 py-3 text-right text-[var(--text-secondary)]">
                      {r.conversions != null ? fmtNum(r.conversions) : '-'}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <DropdownMenu.Root>
                        <DropdownMenu.Trigger asChild>
                          <button className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors text-[var(--text-muted)]">
                            <MoreVertical size={16} />
                          </button>
                        </DropdownMenu.Trigger>
                        <DropdownMenu.Portal>
                          <DropdownMenu.Content
                            align="end"
                            sideOffset={4}
                            className="z-50 min-w-[140px] rounded-lg border border-[var(--border-base)] bg-white p-1 shadow-lg"
                          >
                            <DropdownMenu.Item
                              onSelect={() => openEdit(r)}
                              className="flex items-center gap-2 rounded-md px-3 py-2 text-sm text-[var(--text-secondary)] hover:bg-slate-50 cursor-pointer outline-none"
                            >
                              <Pencil size={14} /> Editar
                            </DropdownMenu.Item>
                            <DropdownMenu.Item
                              onSelect={() => handleDelete(r.id)}
                              className="flex items-center gap-2 rounded-md px-3 py-2 text-sm text-red-600 hover:bg-red-50 cursor-pointer outline-none"
                            >
                              <Trash2 size={14} /> Eliminar
                            </DropdownMenu.Item>
                          </DropdownMenu.Content>
                        </DropdownMenu.Portal>
                      </DropdownMenu.Root>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Bulk Actions Toolbar */}
      {selectedIds.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-slate-900 text-white px-6 py-3 rounded-full shadow-xl flex items-center gap-4 z-40">
          <span className="text-sm">{selectedIds.size} seleccionados</span>
          <button onClick={bulkDeleteRecords} disabled={bulkLoading} className="text-sm px-3 py-1 bg-red-600 rounded-full hover:bg-red-700 disabled:opacity-50">Eliminar</button>
          <button onClick={() => setSelectedIds(new Set())} className="text-sm text-slate-400 hover:text-white">Cancelar</button>
        </div>
      )}

      {/* Modal */}
      <Dialog.Root open={showModal} onOpenChange={v => { if (!v) { setShowModal(false); resetForm() } }}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/40 z-50" />
          <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white p-6 shadow-xl z-50">
            <div className="flex items-center justify-between mb-6">
              <Dialog.Title className="text-lg font-bold text-[var(--text-primary)]">
                {editingRecord ? 'Editar registro' : 'Agregar registro de ads'}
              </Dialog.Title>
              <Dialog.Close asChild>
                <button className="p-2 hover:bg-slate-100 rounded-lg"><X size={18} /></button>
              </Dialog.Close>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>Cliente *</label>
                  <select value={form.client_id} onChange={e => setForm(p => ({ ...p, client_id: e.target.value }))} className={inputCls} required>
                    <option value="">Seleccionar...</option>
                    {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className={labelCls}>Plataforma *</label>
                  <select value={form.platform} onChange={e => setForm(p => ({ ...p, platform: e.target.value }))} className={inputCls} required>
                    {PLATFORMS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label className={labelCls}>Nombre de campana</label>
                <input type="text" value={form.campaign_name} onChange={e => setForm(p => ({ ...p, campaign_name: e.target.value }))} className={inputCls} placeholder="Ej: Black Friday 2026" />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className={labelCls}>Monto *</label>
                  <input type="number" step="0.01" value={form.amount} onChange={e => setForm(p => ({ ...p, amount: e.target.value }))} className={inputCls} placeholder="0.00" required />
                </div>
                <div>
                  <label className={labelCls}>Moneda</label>
                  <select value={form.currency} onChange={e => setForm(p => ({ ...p, currency: e.target.value }))} className={inputCls}>
                    {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className={labelCls}>ROAS</label>
                  <input type="number" step="0.01" value={form.roas} onChange={e => setForm(p => ({ ...p, roas: e.target.value }))} className={inputCls} placeholder="Ej: 3.5" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>Inicio periodo *</label>
                  <input type="date" value={form.period_start} onChange={e => setForm(p => ({ ...p, period_start: e.target.value }))} className={inputCls} required />
                </div>
                <div>
                  <label className={labelCls}>Fin periodo *</label>
                  <input type="date" value={form.period_end} onChange={e => setForm(p => ({ ...p, period_end: e.target.value }))} className={inputCls} required />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className={labelCls}>Impresiones</label>
                  <input type="number" value={form.impressions} onChange={e => setForm(p => ({ ...p, impressions: e.target.value }))} className={inputCls} placeholder="0" />
                </div>
                <div>
                  <label className={labelCls}>Clicks</label>
                  <input type="number" value={form.clicks} onChange={e => setForm(p => ({ ...p, clicks: e.target.value }))} className={inputCls} placeholder="0" />
                </div>
                <div>
                  <label className={labelCls}>Conversiones</label>
                  <input type="number" value={form.conversions} onChange={e => setForm(p => ({ ...p, conversions: e.target.value }))} className={inputCls} placeholder="0" />
                </div>
              </div>

              <div>
                <label className={labelCls}>Notas</label>
                <textarea value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} className={cn(inputCls, 'resize-none')} rows={2} placeholder="Observaciones..." />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <Dialog.Close asChild>
                  <button type="button" className="px-4 py-2 rounded-lg text-sm font-medium text-[var(--text-secondary)] hover:bg-slate-100">Cancelar</button>
                </Dialog.Close>
                <button type="submit" disabled={saving} className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[var(--blue)] text-sm font-medium text-white hover:bg-[var(--blue-hover)] disabled:opacity-50">
                  {saving && <Loader2 size={16} className="animate-spin" />}
                  {editingRecord ? 'Guardar cambios' : 'Crear registro'}
                </button>
              </div>
            </form>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

    </div>
  )
}
