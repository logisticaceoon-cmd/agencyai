'use client'

import React, { useState, useEffect } from 'react'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import {
  ChevronLeft, ChevronRight, Plus, X, Loader2, Trash2,
} from 'lucide-react'
import {
  format, startOfMonth, endOfMonth, startOfWeek, endOfWeek,
  eachDayOfInterval, isSameMonth, isToday, addMonths, subMonths,
} from 'date-fns'
import { es } from 'date-fns/locale'

interface ContentItem {
  id: string
  title: string
  platform: string
  post_type: string
  scheduled_date: string | null
  status: string
  description: string | null
  client_id: string | null
  client_name?: string | null
}

interface Client {
  id: string
  name: string
}

const PLATFORMS = ['instagram', 'facebook', 'tiktok', 'whatsapp']
const POST_TYPES = ['imagen', 'video', 'reel', 'historia', 'carrusel']
const STATUSES = ['borrador', 'programado', 'publicado', 'pausado']

const PLATFORM_COLORS: Record<string, string> = {
  instagram: 'bg-pink-500 text-white',
  facebook: 'bg-blue-600 text-white',
  tiktok: 'bg-gray-800 text-white',
  whatsapp: 'bg-green-500 text-white',
}

const PLATFORM_LABELS: Record<string, string> = {
  instagram: 'Instagram',
  facebook: 'Facebook',
  tiktok: 'TikTok',
  whatsapp: 'WhatsApp',
}

const STATUS_OPACITY: Record<string, string> = {
  borrador: 'opacity-50',
  programado: '',
  publicado: 'opacity-40',
  pausado: 'opacity-30 grayscale',
}

const STATUS_LABELS: Record<string, string> = {
  borrador: 'Borrador',
  programado: 'Programado',
  publicado: 'Publicado',
  pausado: 'Pausado',
}

const emptyForm = {
  title: '',
  platform: 'instagram',
  post_type: 'imagen',
  scheduled_date: '',
  status: 'borrador',
  description: '',
  client_id: '',
}

export default function ContentCalendarPage() {
  const { org, isLoading: authLoading } = useCurrentUser()
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [items, setItems] = useState<ContentItem[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [filterPlatform, setFilterPlatform] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [filterClient, setFilterClient] = useState('')

  const [modalOpen, setModalOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<ContentItem | null>(null)
  const [form, setForm] = useState({ ...emptyForm })
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    if (!org) return
    fetchData()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [org, currentMonth])

  async function fetchData() {
    setLoading(true)
    const monthStr = format(currentMonth, 'yyyy-MM')
    try {
      const [itemsRes, clientsRes] = await Promise.all([
        fetch(`/api/content?month=${monthStr}`),
        fetch('/api/cowork/clients'),
      ])
      const itemsJson = itemsRes.ok ? await itemsRes.json() : { data: [] }
      const clientsJson = clientsRes.ok ? await clientsRes.json() : { data: [] }

      const clientList: Client[] = (clientsJson.data || clientsJson || [])
        .filter((c: { status?: string }) => c.status !== 'inactive')
        .map((c: { id: string; name: string }) => ({ id: c.id, name: c.name }))
      setClients(clientList)

      const clientMap: Record<string, string> = {}
      clientList.forEach((c: Client) => { clientMap[c.id] = c.name })

      const enriched = (itemsJson.data || []).map((item: ContentItem) => ({
        ...item,
        client_name: item.client_id ? (clientMap[item.client_id] || null) : null,
      }))
      setItems(enriched)
    } catch (e) {
      console.error('fetchData error:', e)
      setItems([])
    } finally {
      setLoading(false)
    }
  }

  const monthStart = startOfMonth(currentMonth)
  const monthEnd = endOfMonth(currentMonth)
  const calStart = startOfWeek(monthStart, { weekStartsOn: 1 })
  const calEnd = endOfWeek(monthEnd, { weekStartsOn: 1 })
  const days = eachDayOfInterval({ start: calStart, end: calEnd })

  function getItemsForDay(day: Date): ContentItem[] {
    const dateStr = format(day, 'yyyy-MM-dd')
    return items.filter(item => {
      if (!item.scheduled_date) return false
      if (item.scheduled_date.slice(0, 10) !== dateStr) return false
      if (filterPlatform && item.platform !== filterPlatform) return false
      if (filterStatus && item.status !== filterStatus) return false
      if (filterClient && item.client_id !== filterClient) return false
      return true
    })
  }

  function openCreate(dateStr?: string) {
    setEditingItem(null)
    setForm({ ...emptyForm, scheduled_date: dateStr || format(new Date(), 'yyyy-MM-dd') })
    setModalOpen(true)
  }

  function openEdit(item: ContentItem) {
    setEditingItem(item)
    setForm({
      title: item.title,
      platform: item.platform,
      post_type: item.post_type,
      scheduled_date: item.scheduled_date?.slice(0, 10) || '',
      status: item.status,
      description: item.description || '',
      client_id: item.client_id || '',
    })
    setModalOpen(true)
  }

  async function handleSave() {
    if (!form.title.trim()) return
    setSaving(true)
    try {
      const payload = {
        title: form.title.trim(),
        platform: form.platform,
        post_type: form.post_type,
        scheduled_date: form.scheduled_date || null,
        status: form.status,
        description: form.description.trim() || null,
        client_id: form.client_id || null,
      }
      let res: Response
      if (editingItem) {
        res = await fetch(`/api/content/${editingItem.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
      } else {
        res = await fetch('/api/content', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
      }
      if (res.ok) {
        setModalOpen(false)
        await fetchData()
      }
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!editingItem) return
    setDeleting(true)
    try {
      await fetch(`/api/content/${editingItem.id}`, { method: 'DELETE' })
      setModalOpen(false)
      await fetchData()
    } finally {
      setDeleting(false)
    }
  }

  if (authLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="animate-spin w-8 h-8 text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="p-4 space-y-4 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-bold">Calendario de Contenido</h1>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setCurrentMonth(m => subMonths(m, 1))}
              className="p-1.5 rounded hover:bg-muted transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-sm font-medium min-w-[140px] text-center capitalize">
              {format(currentMonth, 'MMMM yyyy', { locale: es })}
            </span>
            <button
              onClick={() => setCurrentMonth(m => addMonths(m, 1))}
              className="p-1.5 rounded hover:bg-muted transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            value={filterClient}
            onChange={e => setFilterClient(e.target.value)}
            className="text-xs border rounded px-2 py-1.5 bg-background"
          >
            <option value="">Todos los clientes</option>
            {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <select
            value={filterPlatform}
            onChange={e => setFilterPlatform(e.target.value)}
            className="text-xs border rounded px-2 py-1.5 bg-background"
          >
            <option value="">Todas las plataformas</option>
            {PLATFORMS.map(p => <option key={p} value={p}>{PLATFORM_LABELS[p]}</option>)}
          </select>
          <select
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value)}
            className="text-xs border rounded px-2 py-1.5 bg-background"
          >
            <option value="">Todos los estados</option>
            {STATUSES.map(s => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
          </select>
          <button
            onClick={() => openCreate()}
            className="flex items-center gap-1.5 bg-primary text-primary-foreground text-xs px-3 py-1.5 rounded-md font-medium hover:bg-primary/90 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            Nuevo
          </button>
        </div>
      </div>

      {/* Calendar */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="animate-spin w-6 h-6 text-muted-foreground" />
        </div>
      ) : (
        <div className="rounded-lg border overflow-hidden">
          {/* Day headers */}
          <div className="grid grid-cols-7 bg-muted/30 border-b">
            {['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'].map(d => (
              <div key={d} className="text-xs font-medium text-muted-foreground text-center py-2">
                {d}
              </div>
            ))}
          </div>
          {/* Day cells */}
          <div className="grid grid-cols-7 divide-x divide-y">
            {days.map((day, i) => {
              const dayItems = getItemsForDay(day)
              const inMonth = isSameMonth(day, currentMonth)
              const today = isToday(day)
              return (
                <div
                  key={i}
                  className={`min-h-[90px] p-1 cursor-pointer hover:bg-muted/20 transition-colors ${!inMonth ? 'bg-muted/5' : ''}`}
                  onClick={() => openCreate(format(day, 'yyyy-MM-dd'))}
                >
                  <div className={`text-xs font-medium w-6 h-6 flex items-center justify-center rounded-full mb-1 ${
                    today
                      ? 'bg-primary text-primary-foreground'
                      : inMonth ? 'text-foreground' : 'text-muted-foreground/40'
                  }`}>
                    {format(day, 'd')}
                  </div>
                  <div className="space-y-0.5">
                    {dayItems.slice(0, 4).map(item => (
                      <div
                        key={item.id}
                        onClick={e => { e.stopPropagation(); openEdit(item) }}
                        className={`text-[10px] leading-tight px-1.5 py-0.5 rounded cursor-pointer truncate ${
                          PLATFORM_COLORS[item.platform] || 'bg-gray-400 text-white'
                        } ${STATUS_OPACITY[item.status] || ''}`}
                        title={`${item.title}${item.client_name ? ` — ${item.client_name}` : ''} (${STATUS_LABELS[item.status]})`}
                      >
                        {item.client_name ? `${item.client_name.split(' ')[0]}: ` : ''}{item.title}
                      </div>
                    ))}
                    {dayItems.length > 4 && (
                      <div className="text-[10px] text-muted-foreground px-1">
                        +{dayItems.length - 4} más
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <span className="text-muted-foreground font-medium">Plataformas:</span>
        {PLATFORMS.map(p => (
          <span key={p} className={`px-2 py-0.5 rounded ${PLATFORM_COLORS[p]}`}>
            {PLATFORM_LABELS[p]}
          </span>
        ))}
        <span className="text-muted-foreground ml-3">Estado: opaco=borrador/publicado · sólido=programado</span>
      </div>

      {/* Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-background rounded-xl shadow-2xl w-full max-w-md p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-base">
                {editingItem ? 'Editar contenido' : 'Nuevo contenido'}
              </h2>
              <button onClick={() => setModalOpen(false)} className="p-1 rounded hover:bg-muted">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              {/* Title */}
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Título *</label>
                <input
                  value={form.title}
                  onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                  placeholder="Ej: Post lanzamiento nueva línea"
                  className="w-full border rounded px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              {/* Platform + Post type */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">Plataforma</label>
                  <select
                    value={form.platform}
                    onChange={e => setForm(f => ({ ...f, platform: e.target.value }))}
                    className="w-full border rounded px-3 py-2 text-sm bg-background"
                  >
                    {PLATFORMS.map(p => <option key={p} value={p}>{PLATFORM_LABELS[p]}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">Tipo</label>
                  <select
                    value={form.post_type}
                    onChange={e => setForm(f => ({ ...f, post_type: e.target.value }))}
                    className="w-full border rounded px-3 py-2 text-sm bg-background"
                  >
                    {POST_TYPES.map(t => (
                      <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Date + Status */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">Fecha</label>
                  <input
                    type="date"
                    value={form.scheduled_date}
                    onChange={e => setForm(f => ({ ...f, scheduled_date: e.target.value }))}
                    className="w-full border rounded px-3 py-2 text-sm bg-background"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">Estado</label>
                  <select
                    value={form.status}
                    onChange={e => setForm(f => ({ ...f, status: e.target.value }))}
                    className="w-full border rounded px-3 py-2 text-sm bg-background"
                  >
                    {STATUSES.map(s => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
                  </select>
                </div>
              </div>

              {/* Client */}
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Cliente</label>
                <select
                  value={form.client_id}
                  onChange={e => setForm(f => ({ ...f, client_id: e.target.value }))}
                  className="w-full border rounded px-3 py-2 text-sm bg-background"
                >
                  <option value="">Sin cliente</option>
                  {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>

              {/* Description */}
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">
                  Descripción / Caption
                </label>
                <textarea
                  value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  placeholder="Texto del post, notas, referencia visual..."
                  rows={3}
                  className="w-full border rounded px-3 py-2 text-sm bg-background resize-none focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between pt-2">
              {editingItem ? (
                <button
                  onClick={handleDelete}
                  disabled={deleting}
                  className="flex items-center gap-1.5 text-xs text-destructive hover:text-destructive/80 px-3 py-2 rounded hover:bg-destructive/10 transition-colors"
                >
                  {deleting
                    ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    : <Trash2 className="w-3.5 h-3.5" />
                  }
                  Eliminar
                </button>
              ) : <div />}
              <div className="flex gap-2">
                <button
                  onClick={() => setModalOpen(false)}
                  className="text-xs px-4 py-2 rounded border hover:bg-muted transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving || !form.title.trim()}
                  className="text-xs px-4 py-2 rounded bg-primary text-primary-foreground font-medium disabled:opacity-50 hover:bg-primary/90 transition-colors"
                >
                  {saving
                    ? <Loader2 className="w-3.5 h-3.5 animate-spin inline" />
                    : (editingItem ? 'Guardar' : 'Crear')
                  }
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
