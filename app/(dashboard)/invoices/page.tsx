'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import {
  Receipt, Plus, X, DollarSign, AlertTriangle, CheckCircle2, Send,
  MoreVertical, Pencil, Trash2, Loader2, Clock, FileText, Download,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { downloadInvoicePDF, downloadPDF } from '@/lib/pdf'
import { downloadCSV } from '@/lib/export'
import * as Dialog from '@radix-ui/react-dialog'
import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import { toast } from '@/hooks/use-toast'

// ═══════════════════════════════════════
// TYPES
// ═══════════════════════════════════════

interface InvoiceItem {
  description: string
  quantity: number
  unit_price: number
  amount: number
}

interface Invoice {
  id: string
  number: string
  invoice_number: string | null
  client_id: string
  status: string
  subtotal: number
  tax_rate: number
  tax_amount: number
  total: number
  currency: string
  issue_date: string
  due_date: string | null
  paid_at: string | null
  sent_at: string | null
  payment_method: string | null
  items: string | InvoiceItem[]
  notes: string | null
  created_at: string
  clients?: { id: string; name: string; email: string | null } | null
}

interface Client {
  id: string
  name: string
  email: string | null
}

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  draft: { label: 'Borrador', color: 'bg-slate-100 text-slate-600', icon: FileText },
  sent: { label: 'Enviada', color: 'bg-blue-100 text-blue-700', icon: Send },
  paid: { label: 'Pagada', color: 'bg-green-100 text-green-700', icon: CheckCircle2 },
  overdue: { label: 'Vencida', color: 'bg-red-100 text-red-700', icon: AlertTriangle },
}

const CURRENCIES = ['USD', 'ARS', 'CLP', 'MXN', 'EUR']

function fmt(n: number, currency = 'USD') {
  return new Intl.NumberFormat('es', { style: 'currency', currency, maximumFractionDigits: 2 }).format(n)
}

function parseItems(raw: string | InvoiceItem[]): InvoiceItem[] {
  if (Array.isArray(raw)) return raw
  try { return JSON.parse(raw) } catch { return [] }
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

const EMPTY_ITEM: InvoiceItem = { description: '', quantity: 1, unit_price: 0, amount: 0 }

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [bulkLoading, setBulkLoading] = useState(false)

  // Filters
  const [filterStatus, setFilterStatus] = useState('')
  const [filterClient, setFilterClient] = useState('')

  // Modal
  const [showModal, setShowModal] = useState(false)
  const [editingInvoice, setEditingInvoice] = useState<Invoice | null>(null)

  // Form state
  const [formClientId, setFormClientId] = useState('')
  const [formCurrency, setFormCurrency] = useState('USD')
  const [formIssueDate, setFormIssueDate] = useState(new Date().toISOString().split('T')[0])
  const [formDueDate, setFormDueDate] = useState('')
  const [formTaxRate, setFormTaxRate] = useState('0')
  const [formNotes, setFormNotes] = useState('')
  const [formItems, setFormItems] = useState<InvoiceItem[]>([{ ...EMPTY_ITEM }])

  const fetchInvoices = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (filterStatus) params.set('status', filterStatus)

      const res = await fetch(`/api/finances/invoices?${params}`)
      const json = await res.json()
      let data: Invoice[] = json.data || []

      // Client filter is done client-side since API may not support it
      if (filterClient) {
        data = data.filter(inv => inv.client_id === filterClient)
      }

      setInvoices(data)
    } catch {
      toast({ title: 'Error al cargar facturas', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }, [filterStatus, filterClient])

  const fetchClients = useCallback(async () => {
    try {
      const res = await fetch('/api/clients')
      const json = await res.json()
      setClients((json.data || []).map((c: Client) => ({ id: c.id, name: c.name, email: c.email })))
    } catch { /* ignore */ }
  }, [])

  useEffect(() => { fetchInvoices() }, [fetchInvoices])
  useEffect(() => { fetchClients() }, [fetchClients])

  // Summary calculations
  const summary = useMemo(() => {
    const now = new Date()
    const outstanding = invoices
      .filter(i => i.status === 'sent' || i.status === 'overdue')
      .reduce((s, i) => s + Number(i.total), 0)

    const paidThisMonth = invoices
      .filter(i => {
        if (i.status !== 'paid' || !i.paid_at) return false
        const d = new Date(i.paid_at)
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
      })
      .reduce((s, i) => s + Number(i.total), 0)

    const overdueCount = invoices.filter(i => {
      if (i.status === 'overdue') return true
      if (i.status === 'sent' && i.due_date && new Date(i.due_date) < now) return true
      return false
    }).length

    const totalInvoices = invoices.length

    return { outstanding, paidThisMonth, overdueCount, totalInvoices }
  }, [invoices])

  // Line items calculations
  const subtotal = useMemo(() => formItems.reduce((s, item) => s + item.quantity * item.unit_price, 0), [formItems])
  const taxAmount = useMemo(() => subtotal * (parseFloat(formTaxRate) || 0) / 100, [subtotal, formTaxRate])
  const total = subtotal + taxAmount

  function resetForm() {
    setFormClientId('')
    setFormCurrency('USD')
    setFormIssueDate(new Date().toISOString().split('T')[0])
    setFormDueDate('')
    setFormTaxRate('0')
    setFormNotes('')
    setFormItems([{ ...EMPTY_ITEM }])
    setEditingInvoice(null)
  }

  function openCreate() {
    resetForm()
    setShowModal(true)
  }

  function openEdit(invoice: Invoice) {
    setEditingInvoice(invoice)
    setFormClientId(invoice.client_id)
    setFormCurrency(invoice.currency)
    setFormIssueDate(invoice.issue_date)
    setFormDueDate(invoice.due_date || '')
    setFormTaxRate(String(invoice.tax_rate || 0))
    setFormNotes(invoice.notes || '')
    const items = parseItems(invoice.items)
    setFormItems(items.length > 0 ? items : [{ ...EMPTY_ITEM }])
    setShowModal(true)
  }

  function updateItem(index: number, field: keyof InvoiceItem, value: string | number) {
    setFormItems(prev => {
      const next = [...prev]
      const item = { ...next[index] }
      if (field === 'description') item.description = value as string
      else if (field === 'quantity') item.quantity = Number(value) || 0
      else if (field === 'unit_price') item.unit_price = Number(value) || 0
      item.amount = item.quantity * item.unit_price
      next[index] = item
      return next
    })
  }

  function addItem() {
    setFormItems(prev => [...prev, { ...EMPTY_ITEM }])
  }

  function removeItem(index: number) {
    setFormItems(prev => prev.length > 1 ? prev.filter((_, i) => i !== index) : prev)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!formClientId) {
      toast({ title: 'Selecciona un cliente', variant: 'destructive' })
      return
    }
    if (formItems.every(i => !i.description)) {
      toast({ title: 'Agrega al menos un item', variant: 'destructive' })
      return
    }

    setSaving(true)
    try {
      const payload = {
        client_id: formClientId,
        currency: formCurrency,
        issue_date: formIssueDate,
        due_date: formDueDate || null,
        tax_rate: parseFloat(formTaxRate) || 0,
        notes: formNotes || null,
        items: formItems.filter(i => i.description).map(i => ({
          description: i.description,
          quantity: i.quantity,
          unit_price: i.unit_price,
          amount: i.quantity * i.unit_price,
        })),
      }

      const url = editingInvoice ? `/api/finances/invoices/${editingInvoice.id}` : '/api/finances/invoices'
      const method = editingInvoice ? 'PATCH' : 'POST'

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!res.ok) throw new Error()

      toast({ title: editingInvoice ? 'Factura actualizada' : 'Factura creada' })
      setShowModal(false)
      resetForm()
      fetchInvoices()
    } catch {
      toast({ title: 'Error al guardar factura', variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  async function handleSend(id: string) {
    try {
      const res = await fetch(`/api/finances/invoices/${id}/send`, { method: 'POST' })
      if (!res.ok) throw new Error()
      toast({ title: 'Factura marcada como enviada' })
      fetchInvoices()
    } catch {
      toast({ title: 'Error al enviar factura', variant: 'destructive' })
    }
  }

  async function handleMarkPaid(id: string) {
    try {
      const res = await fetch(`/api/finances/invoices/${id}/mark-paid`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })
      if (!res.ok) throw new Error()
      toast({ title: 'Factura marcada como pagada' })
      fetchInvoices()
    } catch {
      toast({ title: 'Error al marcar como pagada', variant: 'destructive' })
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Eliminar esta factura?')) return
    try {
      const res = await fetch(`/api/finances/invoices/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error()
      toast({ title: 'Factura eliminada' })
      fetchInvoices()
    } catch {
      toast({ title: 'Error al eliminar', variant: 'destructive' })
    }
  }

  // ── Bulk actions ──

  const allSelected = invoices.length > 0 && selectedIds.size === invoices.length
  const someSelected = selectedIds.size > 0 && selectedIds.size < invoices.length

  function toggleInvoice(id: string) {
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
      setSelectedIds(new Set(invoices.map((i) => i.id)))
    }
  }

  async function bulkStatusChange(newStatus: string) {
    setBulkLoading(true)
    try {
      const promises = Array.from(selectedIds).map((id) => {
        if (newStatus === 'sent') {
          return fetch(`/api/finances/invoices/${id}/send`, { method: 'POST' })
        } else if (newStatus === 'paid') {
          return fetch(`/api/finances/invoices/${id}/mark-paid`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({}),
          })
        } else {
          return fetch(`/api/finances/invoices/${id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: newStatus }),
          })
        }
      })
      await Promise.all(promises)
      setSelectedIds(new Set())
      fetchInvoices()
    } finally {
      setBulkLoading(false)
    }
  }

  async function bulkDeleteInvoices() {
    if (!confirm(`Eliminar ${selectedIds.size} facturas seleccionadas?`)) return
    setBulkLoading(true)
    try {
      const promises = Array.from(selectedIds).map((id) =>
        fetch(`/api/finances/invoices/${id}`, { method: 'DELETE' })
      )
      await Promise.all(promises)
      setSelectedIds(new Set())
      fetchInvoices()
    } finally {
      setBulkLoading(false)
    }
  }

  // ── Export helpers ──
  function getExportColumns() {
    return [
      { key: 'number', label: 'Numero' },
      { key: 'client_name', label: 'Cliente' },
      { key: 'status', label: 'Estado' },
      { key: 'issue_date', label: 'Emision' },
      { key: 'due_date', label: 'Vencimiento' },
      { key: 'subtotal', label: 'Subtotal' },
      { key: 'tax_rate', label: 'Impuesto %' },
      { key: 'total', label: 'Total' },
      { key: 'currency', label: 'Moneda' },
    ]
  }

  function getExportData() {
    return invoices.map(inv => ({
      number: inv.number || inv.invoice_number || '-',
      client_name: inv.clients?.name || '-',
      status: STATUS_CONFIG[inv.status]?.label || inv.status,
      issue_date: inv.issue_date ? new Date(inv.issue_date).toLocaleDateString('es') : '-',
      due_date: inv.due_date ? new Date(inv.due_date).toLocaleDateString('es') : '-',
      subtotal: Number(inv.subtotal).toFixed(2),
      tax_rate: inv.tax_rate,
      total: Number(inv.total).toFixed(2),
      currency: inv.currency,
    }))
  }

  function handleExportCSV() {
    downloadCSV(getExportData(), 'facturas', getExportColumns())
  }

  function handleExportPDF() {
    downloadPDF({
      title: 'Listado de Facturas',
      subtitle: [filterStatus && `Estado: ${STATUS_CONFIG[filterStatus]?.label}`, filterClient && `Cliente: ${clients.find(c => c.id === filterClient)?.name}`].filter(Boolean).join(' | ') || undefined,
      filename: 'facturas',
      columns: getExportColumns(),
      data: getExportData(),
      orientation: 'landscape',
    })
  }

  function handleExportInvoicePDF(inv: Invoice) {
    const items = parseItems(inv.items)
    downloadInvoicePDF({
      number: inv.number || inv.invoice_number || '-',
      client_name: inv.clients?.name || '-',
      date: inv.issue_date ? new Date(inv.issue_date).toLocaleDateString('es') : '-',
      due_date: inv.due_date ? new Date(inv.due_date).toLocaleDateString('es') : '-',
      status: STATUS_CONFIG[inv.status]?.label || inv.status,
      items: items.map(i => ({
        description: i.description,
        quantity: i.quantity,
        unit_price: i.unit_price,
        total: i.quantity * i.unit_price,
      })),
      subtotal: Number(inv.subtotal),
      tax_rate: Number(inv.tax_rate),
      tax_amount: Number(inv.tax_amount),
      total: Number(inv.total),
      currency: inv.currency,
      notes: inv.notes || undefined,
    })
  }

  const inputCls = 'w-full rounded-lg border border-[var(--border-base)] bg-white px-3 py-2 text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--blue)]/30 focus:border-[var(--blue)]'
  const labelCls = 'block text-xs font-medium text-[var(--text-secondary)] mb-1'

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">Facturas</h1>
          <p className="text-sm text-[var(--text-muted)] mt-1">
            Gestion completa de facturacion y cobros
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleExportCSV}
            disabled={loading || invoices.length === 0}
            className="inline-flex items-center gap-2 rounded-lg border border-[var(--border-base)] bg-white px-3 py-2.5 text-sm font-medium text-[var(--text-secondary)] hover:bg-slate-50 transition-colors disabled:opacity-50"
          >
            <Download size={16} /> CSV
          </button>
          <button
            onClick={handleExportPDF}
            disabled={loading || invoices.length === 0}
            className="inline-flex items-center gap-2 rounded-lg border border-[var(--border-base)] bg-white px-3 py-2.5 text-sm font-medium text-[var(--text-secondary)] hover:bg-slate-50 transition-colors disabled:opacity-50"
          >
            <Download size={16} /> PDF
          </button>
          <button
            onClick={openCreate}
            className="inline-flex items-center gap-2 rounded-lg bg-[var(--blue)] px-4 py-2.5 text-sm font-medium text-white hover:bg-[var(--blue-hover)] transition-colors"
          >
            <Plus size={16} /> Crear factura
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
              <div className="p-2 rounded-lg bg-amber-50"><Clock size={16} className="text-amber-600" /></div>
              <span className="text-xs font-medium text-[var(--text-muted)]">Pendiente de cobro</span>
            </div>
            <p className="text-2xl font-bold text-[var(--text-primary)]">{fmt(summary.outstanding)}</p>
          </div>
          <div className="rounded-xl border border-[var(--border-base)] bg-white p-5">
            <div className="flex items-center gap-2 mb-2">
              <div className="p-2 rounded-lg bg-green-50"><CheckCircle2 size={16} className="text-green-600" /></div>
              <span className="text-xs font-medium text-[var(--text-muted)]">Cobrado este mes</span>
            </div>
            <p className="text-2xl font-bold text-[var(--text-primary)]">{fmt(summary.paidThisMonth)}</p>
          </div>
          <div className="rounded-xl border border-[var(--border-base)] bg-white p-5">
            <div className="flex items-center gap-2 mb-2">
              <div className="p-2 rounded-lg bg-red-50"><AlertTriangle size={16} className="text-red-600" /></div>
              <span className="text-xs font-medium text-[var(--text-muted)]">Facturas vencidas</span>
            </div>
            <p className="text-2xl font-bold text-[var(--text-primary)]">{summary.overdueCount}</p>
          </div>
          <div className="rounded-xl border border-[var(--border-base)] bg-white p-5">
            <div className="flex items-center gap-2 mb-2">
              <div className="p-2 rounded-lg bg-blue-50"><Receipt size={16} className="text-blue-600" /></div>
              <span className="text-xs font-medium text-[var(--text-muted)]">Total facturas</span>
            </div>
            <p className="text-2xl font-bold text-[var(--text-primary)]">{summary.totalInvoices}</p>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className={cn(inputCls, 'w-44')}>
          <option value="">Todos los estados</option>
          {Object.entries(STATUS_CONFIG).map(([k, v]) => (
            <option key={k} value={k}>{v.label}</option>
          ))}
        </select>
        <select value={filterClient} onChange={e => setFilterClient(e.target.value)} className={cn(inputCls, 'w-48')}>
          <option value="">Todos los clientes</option>
          {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        {(filterStatus || filterClient) && (
          <button
            onClick={() => { setFilterStatus(''); setFilterClient('') }}
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
        ) : invoices.length === 0 ? (
          <div className="p-12 text-center">
            <Receipt size={48} className="mx-auto text-slate-300 mb-4" />
            <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-1">Sin facturas</h3>
            <p className="text-sm text-[var(--text-muted)] mb-4">Crea tu primera factura para comenzar</p>
            <button onClick={openCreate} className="inline-flex items-center gap-2 rounded-lg bg-[var(--blue)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--blue-hover)]">
              <Plus size={16} /> Crear factura
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
                  <th className="text-left px-4 py-3 text-xs font-semibold text-[var(--text-muted)] uppercase">No.</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-[var(--text-muted)] uppercase">Cliente</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-[var(--text-muted)] uppercase">Estado</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-[var(--text-muted)] uppercase">Emision</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-[var(--text-muted)] uppercase">Vencimiento</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-[var(--text-muted)] uppercase">Total</th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-[var(--text-muted)] uppercase">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-base)]">
                {invoices.map(inv => {
                  const cfg = STATUS_CONFIG[inv.status] || STATUS_CONFIG.draft
                  const StatusIcon = cfg.icon
                  return (
                    <tr key={inv.id} className={cn("hover:bg-slate-50/50 transition-colors", selectedIds.has(inv.id) && "bg-blue-50 hover:bg-blue-50")}>
                      <td className="px-3 py-3">
                        <input
                          type="checkbox"
                          checked={selectedIds.has(inv.id)}
                          onChange={() => toggleInvoice(inv.id)}
                          className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                        />
                      </td>
                      <td className="px-4 py-3 font-mono text-[var(--text-secondary)] text-xs">
                        {inv.number || inv.invoice_number || '-'}
                      </td>
                      <td className="px-4 py-3 font-medium text-[var(--text-primary)]">
                        {inv.clients?.name || '-'}
                      </td>
                      <td className="px-4 py-3">
                        <span className={cn('inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium', cfg.color)}>
                          <StatusIcon size={12} /> {cfg.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-[var(--text-secondary)]">
                        {inv.issue_date ? new Date(inv.issue_date).toLocaleDateString('es') : '-'}
                      </td>
                      <td className="px-4 py-3 text-[var(--text-secondary)]">
                        {inv.due_date ? new Date(inv.due_date).toLocaleDateString('es') : '-'}
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-[var(--text-primary)]">
                        {fmt(Number(inv.total), inv.currency)}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="inline-flex items-center gap-1">
                        <button
                          onClick={() => handleExportInvoicePDF(inv)}
                          title="Descargar PDF"
                          className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors text-[var(--text-muted)]"
                        >
                          <Download size={16} />
                        </button>
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
                              className="z-50 min-w-[160px] rounded-lg border border-[var(--border-base)] bg-white p-1 shadow-lg"
                            >
                              {inv.status === 'draft' && (
                                <>
                                  <DropdownMenu.Item
                                    onSelect={() => openEdit(inv)}
                                    className="flex items-center gap-2 rounded-md px-3 py-2 text-sm text-[var(--text-secondary)] hover:bg-slate-50 cursor-pointer outline-none"
                                  >
                                    <Pencil size={14} /> Editar
                                  </DropdownMenu.Item>
                                  <DropdownMenu.Item
                                    onSelect={() => handleSend(inv.id)}
                                    className="flex items-center gap-2 rounded-md px-3 py-2 text-sm text-blue-600 hover:bg-blue-50 cursor-pointer outline-none"
                                  >
                                    <Send size={14} /> Marcar enviada
                                  </DropdownMenu.Item>
                                </>
                              )}
                              {(inv.status === 'sent' || inv.status === 'overdue') && (
                                <DropdownMenu.Item
                                  onSelect={() => handleMarkPaid(inv.id)}
                                  className="flex items-center gap-2 rounded-md px-3 py-2 text-sm text-green-600 hover:bg-green-50 cursor-pointer outline-none"
                                >
                                  <CheckCircle2 size={14} /> Marcar pagada
                                </DropdownMenu.Item>
                              )}
                              <DropdownMenu.Item
                                onSelect={() => handleDelete(inv.id)}
                                className="flex items-center gap-2 rounded-md px-3 py-2 text-sm text-red-600 hover:bg-red-50 cursor-pointer outline-none"
                              >
                                <Trash2 size={14} /> Eliminar
                              </DropdownMenu.Item>
                            </DropdownMenu.Content>
                          </DropdownMenu.Portal>
                        </DropdownMenu.Root>
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

      {/* Bulk Actions Toolbar */}
      {selectedIds.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-slate-900 text-white px-6 py-3 rounded-full shadow-xl flex items-center gap-4 z-40">
          <span className="text-sm">{selectedIds.size} seleccionadas</span>
          <button onClick={() => bulkStatusChange('draft')} disabled={bulkLoading} className="text-sm px-3 py-1 bg-slate-600 rounded-full hover:bg-slate-700 disabled:opacity-50">Borrador</button>
          <button onClick={() => bulkStatusChange('sent')} disabled={bulkLoading} className="text-sm px-3 py-1 bg-blue-600 rounded-full hover:bg-blue-700 disabled:opacity-50">Enviada</button>
          <button onClick={() => bulkStatusChange('paid')} disabled={bulkLoading} className="text-sm px-3 py-1 bg-green-600 rounded-full hover:bg-green-700 disabled:opacity-50">Pagada</button>
          <button onClick={bulkDeleteInvoices} disabled={bulkLoading} className="text-sm px-3 py-1 bg-red-600 rounded-full hover:bg-red-700 disabled:opacity-50">Eliminar</button>
          <button onClick={() => setSelectedIds(new Set())} className="text-sm text-slate-400 hover:text-white">Cancelar</button>
        </div>
      )}

      {/* Create/Edit Modal */}
      <Dialog.Root open={showModal} onOpenChange={v => { if (!v) { setShowModal(false); resetForm() } }}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/40 z-50" />
          <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white p-6 shadow-xl z-50">
            <div className="flex items-center justify-between mb-6">
              <Dialog.Title className="text-lg font-bold text-[var(--text-primary)]">
                {editingInvoice ? 'Editar factura' : 'Crear factura'}
              </Dialog.Title>
              <Dialog.Close asChild>
                <button className="p-2 hover:bg-slate-100 rounded-lg"><X size={18} /></button>
              </Dialog.Close>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Client + dates */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>Cliente *</label>
                  <select value={formClientId} onChange={e => setFormClientId(e.target.value)} className={inputCls} required>
                    <option value="">Seleccionar...</option>
                    {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className={labelCls}>Moneda</label>
                  <select value={formCurrency} onChange={e => setFormCurrency(e.target.value)} className={inputCls}>
                    {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>Fecha de emision</label>
                  <input type="date" value={formIssueDate} onChange={e => setFormIssueDate(e.target.value)} className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>Fecha de vencimiento</label>
                  <input type="date" value={formDueDate} onChange={e => setFormDueDate(e.target.value)} className={inputCls} />
                </div>
              </div>

              {/* Line items */}
              <div>
                <label className={labelCls}>Items</label>
                <div className="rounded-lg border border-[var(--border-base)] overflow-hidden">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-slate-50 border-b border-[var(--border-base)]">
                        <th className="text-left px-3 py-2 text-xs font-medium text-[var(--text-muted)]">Descripcion</th>
                        <th className="text-center px-3 py-2 text-xs font-medium text-[var(--text-muted)] w-20">Cant.</th>
                        <th className="text-center px-3 py-2 text-xs font-medium text-[var(--text-muted)] w-28">Precio unit.</th>
                        <th className="text-right px-3 py-2 text-xs font-medium text-[var(--text-muted)] w-28">Subtotal</th>
                        <th className="w-10" />
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--border-base)]">
                      {formItems.map((item, idx) => (
                        <tr key={idx}>
                          <td className="px-2 py-1.5">
                            <input
                              type="text"
                              value={item.description}
                              onChange={e => updateItem(idx, 'description', e.target.value)}
                              className="w-full rounded border-0 bg-transparent px-1 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-[var(--blue)]/30"
                              placeholder="Descripcion del servicio..."
                            />
                          </td>
                          <td className="px-2 py-1.5">
                            <input
                              type="number"
                              min="1"
                              value={item.quantity}
                              onChange={e => updateItem(idx, 'quantity', e.target.value)}
                              className="w-full rounded border-0 bg-transparent px-1 py-1 text-sm text-center focus:outline-none focus:ring-1 focus:ring-[var(--blue)]/30"
                            />
                          </td>
                          <td className="px-2 py-1.5">
                            <input
                              type="number"
                              step="0.01"
                              value={item.unit_price}
                              onChange={e => updateItem(idx, 'unit_price', e.target.value)}
                              className="w-full rounded border-0 bg-transparent px-1 py-1 text-sm text-center focus:outline-none focus:ring-1 focus:ring-[var(--blue)]/30"
                            />
                          </td>
                          <td className="px-3 py-1.5 text-right text-sm font-medium text-[var(--text-primary)]">
                            {fmt(item.quantity * item.unit_price, formCurrency)}
                          </td>
                          <td className="px-1 py-1.5">
                            <button type="button" onClick={() => removeItem(idx)} className="p-1 text-slate-400 hover:text-red-500">
                              <X size={14} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <div className="px-3 py-2 border-t border-[var(--border-base)]">
                    <button type="button" onClick={addItem} className="text-xs text-[var(--blue)] hover:underline font-medium">
                      + Agregar item
                    </button>
                  </div>
                </div>
              </div>

              {/* Totals */}
              <div className="flex justify-end">
                <div className="w-64 space-y-2 text-sm">
                  <div className="flex justify-between text-[var(--text-secondary)]">
                    <span>Subtotal</span>
                    <span className="font-medium">{fmt(subtotal, formCurrency)}</span>
                  </div>
                  <div className="flex justify-between items-center text-[var(--text-secondary)]">
                    <span className="flex items-center gap-1">
                      Impuesto
                      <input
                        type="number"
                        step="0.1"
                        value={formTaxRate}
                        onChange={e => setFormTaxRate(e.target.value)}
                        className="w-14 rounded border border-[var(--border-base)] px-1.5 py-0.5 text-xs text-center"
                      />
                      %
                    </span>
                    <span className="font-medium">{fmt(taxAmount, formCurrency)}</span>
                  </div>
                  <div className="flex justify-between text-[var(--text-primary)] font-bold text-base border-t border-[var(--border-base)] pt-2">
                    <span>Total</span>
                    <span>{fmt(total, formCurrency)}</span>
                  </div>
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className={labelCls}>Notas / Terminos</label>
                <textarea
                  value={formNotes}
                  onChange={e => setFormNotes(e.target.value)}
                  className={cn(inputCls, 'resize-none')}
                  rows={2}
                  placeholder="Condiciones de pago, observaciones..."
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <Dialog.Close asChild>
                  <button type="button" className="px-4 py-2 rounded-lg text-sm font-medium text-[var(--text-secondary)] hover:bg-slate-100">Cancelar</button>
                </Dialog.Close>
                <button type="submit" disabled={saving} className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[var(--blue)] text-sm font-medium text-white hover:bg-[var(--blue-hover)] disabled:opacity-50">
                  {saving && <Loader2 size={16} className="animate-spin" />}
                  {editingInvoice ? 'Guardar cambios' : 'Crear factura'}
                </button>
              </div>
            </form>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

    </div>
  )
}
