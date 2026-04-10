'use client'

import { useState, useEffect, useCallback } from 'react'
import { PageHeader } from '@/components/shared/PageHeader'
import { EmptyState } from '@/components/shared/EmptyState'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import { toast } from '@/hooks/use-toast'
import {
  Video, Plus, ExternalLink, Clock, X, Play,
  HardDrive, MonitorPlay, Link2, Calendar, Users
} from 'lucide-react'
import { cn, formatDate } from '@/lib/utils'
import * as Dialog from '@radix-ui/react-dialog'

interface Recording {
  id: string
  title: string
  url: string | null
  platform: string | null
  duration: number | null
  participants: string | null
  notes: string | null
  client: { id: string; name: string } | null
  client_id: string | null
  client_name?: string
  created_at: string
}

const PLATFORMS = [
  { value: 'google_meet', label: 'Google Meet' },
  { value: 'zoom', label: 'Zoom' },
  { value: 'loom', label: 'Loom' },
  { value: 'drive', label: 'Google Drive' },
  { value: 'youtube', label: 'YouTube' },
  { value: 'other', label: 'Otro' },
]

const PLATFORM_LABELS: Record<string, string> = {
  google_meet: 'Google Meet',
  zoom: 'Zoom',
  loom: 'Loom',
  drive: 'Drive',
  youtube: 'YouTube',
  other: 'Otro',
}

const PLATFORM_STYLES: Record<string, string> = {
  google_meet: 'bg-green-50 text-green-600',
  zoom: 'bg-blue-50 text-blue-600',
  loom: 'bg-purple-50 text-purple-600',
  drive: 'bg-amber-50 text-amber-600',
  youtube: 'bg-red-50 text-red-600',
  other: 'bg-slate-100 text-slate-500',
}

const emptyForm = {
  title: '',
  platform: 'google_meet',
  url: '',
  client_id: '',
  date: '',
  duration: '',
  participants: '',
  notes: '',
}

export default function RecordingsPage() {
  const { org } = useCurrentUser()
  const [recordings, setRecordings] = useState<Recording[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [clients, setClients] = useState<{ id: string; name: string }[]>([])
  const [form, setForm] = useState({ ...emptyForm })
  const [submitting, setSubmitting] = useState(false)

  const fetchRecordings = useCallback(async () => {
    const res = await fetch('/api/recordings')
    if (res.ok) {
      const json = await res.json()
      setRecordings(json.data || [])
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchRecordings()
    fetch('/api/clients').then(r => r.json()).then(j => setClients(j.data || [])).catch(() => {})
  }, [fetchRecordings])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.title.trim()) return
    setSubmitting(true)
    try {
      const res = await fetch('/api/recordings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: form.title,
          platform: form.platform || undefined,
          url: form.url || undefined,
          client_id: form.client_id || undefined,
          duration: form.duration ? parseInt(form.duration) : undefined,
          participants: form.participants || undefined,
          notes: form.notes || undefined,
          recorded_at: form.date || undefined,
        }),
      })
      if (res.ok) {
        toast({ title: 'Grabacion agregada' })
        setModalOpen(false)
        setForm({ ...emptyForm })
        fetchRecordings()
      } else {
        toast({ title: 'Error al crear grabacion', variant: 'destructive' })
      }
    } finally {
      setSubmitting(false)
    }
  }

  function getClientName(rec: Recording) {
    return rec.client?.name || rec.client_name || null
  }

  if (!org) return null

  return (
    <div className="space-y-6">
      <PageHeader
        title="Grabaciones"
        description="Reuniones grabadas y recursos multimedia"
        action={
          <button
            onClick={() => setModalOpen(true)}
            className="flex items-center gap-2 rounded-lg bg-[var(--blue)] px-4 py-2 text-sm font-medium text-white hover:opacity-90 transition-colors"
          >
            <Plus size={16} strokeWidth={1.5} />
            Agregar grabacion
          </button>
        }
      />

      {/* Integration Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="rounded-xl border border-[var(--border-base)] bg-white p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="rounded-lg bg-amber-50 p-2.5">
              <HardDrive size={16} strokeWidth={1.5} className="text-amber-600" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-[var(--text-primary)]">Google Drive</h3>
              <p className="text-xs text-[var(--text-muted)]">Almacenamiento</p>
            </div>
          </div>
          <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
            Conecta tu Google Drive para acceder a grabaciones almacenadas automaticamente desde Google Meet u otras herramientas.
          </p>
        </div>

        <div className="rounded-xl border border-[var(--border-base)] bg-white p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="rounded-lg bg-green-50 p-2.5">
              <MonitorPlay size={16} strokeWidth={1.5} className="text-green-600" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-[var(--text-primary)]">Google Meet</h3>
              <p className="text-xs text-[var(--text-muted)]">Videoconferencias</p>
            </div>
          </div>
          <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
            Las grabaciones de Google Meet se guardan automaticamente en tu Google Drive. Agrega el link desde ahi.
          </p>
        </div>

        <div className="rounded-xl border border-[var(--border-base)] bg-white p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="rounded-lg bg-indigo-50 p-2.5">
              <Link2 size={16} strokeWidth={1.5} className="text-indigo-600" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-[var(--text-primary)]">Link manual</h3>
              <p className="text-xs text-[var(--text-muted)]">Cualquier plataforma</p>
            </div>
          </div>
          <p className="text-xs text-[var(--text-secondary)] leading-relaxed mb-3">
            Agrega grabaciones de Zoom, Loom, YouTube o cualquier otra plataforma pegando el enlace.
          </p>
          <button
            onClick={() => setModalOpen(true)}
            className="flex items-center gap-1.5 text-xs font-medium text-[var(--blue)] hover:opacity-80 transition-colors"
          >
            <Plus size={14} strokeWidth={1.5} /> Agregar manualmente
          </button>
        </div>
      </div>

      {/* Recordings Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-48 bg-slate-100 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : recordings.length === 0 ? (
        <EmptyState
          icon={Video}
          title="No hay grabaciones"
          description="Agrega grabaciones de reuniones para tener todo centralizado"
          action={
            <button
              onClick={() => setModalOpen(true)}
              className="flex items-center gap-2 rounded-lg bg-[var(--blue)] px-4 py-2 text-sm font-medium text-white hover:opacity-90 transition-colors"
            >
              <Plus size={16} strokeWidth={1.5} /> Agregar grabacion
            </button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {recordings.map(rec => {
            const clientName = getClientName(rec)
            return (
              <div key={rec.id} className="rounded-xl border border-[var(--border-base)] bg-white overflow-hidden">
                {/* Thumbnail placeholder */}
                <div className="h-32 bg-gradient-to-br from-slate-100 to-slate-50 flex items-center justify-center relative">
                  <div className="rounded-full bg-white/80 p-3 shadow-sm">
                    <Play size={24} strokeWidth={1.5} className="text-[var(--text-muted)] ml-0.5" />
                  </div>
                  {rec.platform && (
                    <span className={`absolute top-3 right-3 inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${PLATFORM_STYLES[rec.platform] || PLATFORM_STYLES.other}`}>
                      {PLATFORM_LABELS[rec.platform] || rec.platform}
                    </span>
                  )}
                </div>

                <div className="p-4 space-y-2.5">
                  <h3 className="text-sm font-medium text-[var(--text-primary)] line-clamp-1">{rec.title}</h3>

                  <div className="flex flex-wrap items-center gap-3 text-xs text-[var(--text-muted)]">
                    {clientName && (
                      <span className="flex items-center gap-1">
                        <Users size={12} strokeWidth={1.5} /> {clientName}
                      </span>
                    )}
                    <span className="flex items-center gap-1">
                      <Calendar size={12} strokeWidth={1.5} /> {formatDate(rec.created_at)}
                    </span>
                    {rec.duration && (
                      <span className="flex items-center gap-1">
                        <Clock size={12} strokeWidth={1.5} /> {rec.duration} min
                      </span>
                    )}
                  </div>

                  {rec.url && (
                    <a
                      href={rec.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--border-base)] px-3 py-1.5 text-xs font-medium text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)] hover:text-[var(--blue)] transition-colors"
                    >
                      <ExternalLink size={12} strokeWidth={1.5} /> Ver grabacion
                    </a>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Create Modal */}
      <Dialog.Root open={modalOpen} onOpenChange={setModalOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/40 z-50" />
          <Dialog.Content className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-xl bg-white p-6 shadow-lg">
            <div className="flex items-center justify-between mb-6">
              <Dialog.Title className="text-lg font-semibold text-[var(--text-primary)]">
                Agregar grabacion
              </Dialog.Title>
              <Dialog.Close className="rounded-lg p-1.5 text-[var(--text-muted)] hover:bg-[var(--bg-subtle)] transition-colors">
                <X size={16} strokeWidth={1.5} />
              </Dialog.Close>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">Titulo *</label>
                <input
                  required
                  value={form.title}
                  onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
                  placeholder="Reunion con cliente, demo de producto..."
                  className="w-full rounded-[var(--radius-md)] border border-[var(--border-base)] bg-white px-3 py-2 text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:border-[var(--blue)] focus:outline-none focus:ring-1 focus:ring-[var(--blue)]"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">Tipo</label>
                  <select
                    value={form.platform}
                    onChange={(e) => setForm((p) => ({ ...p, platform: e.target.value }))}
                    className="w-full rounded-[var(--radius-md)] border border-[var(--border-base)] bg-white px-3 py-2 text-sm text-[var(--text-primary)] focus:border-[var(--blue)] focus:outline-none focus:ring-1 focus:ring-[var(--blue)]"
                  >
                    {PLATFORMS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">Cliente</label>
                  <select
                    value={form.client_id}
                    onChange={(e) => setForm((p) => ({ ...p, client_id: e.target.value }))}
                    className="w-full rounded-[var(--radius-md)] border border-[var(--border-base)] bg-white px-3 py-2 text-sm text-[var(--text-primary)] focus:border-[var(--blue)] focus:outline-none focus:ring-1 focus:ring-[var(--blue)]"
                  >
                    <option value="">Sin cliente</option>
                    {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">URL</label>
                <input
                  type="url"
                  value={form.url}
                  onChange={(e) => setForm((p) => ({ ...p, url: e.target.value }))}
                  placeholder="https://meet.google.com/..."
                  className="w-full rounded-[var(--radius-md)] border border-[var(--border-base)] bg-white px-3 py-2 text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:border-[var(--blue)] focus:outline-none focus:ring-1 focus:ring-[var(--blue)]"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">Fecha</label>
                  <input
                    type="date"
                    value={form.date}
                    onChange={(e) => setForm((p) => ({ ...p, date: e.target.value }))}
                    className="w-full rounded-[var(--radius-md)] border border-[var(--border-base)] bg-white px-3 py-2 text-sm text-[var(--text-primary)] focus:border-[var(--blue)] focus:outline-none focus:ring-1 focus:ring-[var(--blue)]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">Duracion (min)</label>
                  <input
                    type="number"
                    min={0}
                    value={form.duration}
                    onChange={(e) => setForm((p) => ({ ...p, duration: e.target.value }))}
                    placeholder="60"
                    className="w-full rounded-[var(--radius-md)] border border-[var(--border-base)] bg-white px-3 py-2 text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:border-[var(--blue)] focus:outline-none focus:ring-1 focus:ring-[var(--blue)]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">Participantes</label>
                <input
                  value={form.participants}
                  onChange={(e) => setForm((p) => ({ ...p, participants: e.target.value }))}
                  placeholder="Juan, Maria, Pedro..."
                  className="w-full rounded-[var(--radius-md)] border border-[var(--border-base)] bg-white px-3 py-2 text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:border-[var(--blue)] focus:outline-none focus:ring-1 focus:ring-[var(--blue)]"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">Notas</label>
                <textarea
                  rows={3}
                  value={form.notes}
                  onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
                  placeholder="Notas o resumen de la reunion..."
                  className="w-full rounded-[var(--radius-md)] border border-[var(--border-base)] bg-white px-3 py-2 text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:border-[var(--blue)] focus:outline-none focus:ring-1 focus:ring-[var(--blue)] resize-none"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <Dialog.Close className="rounded-lg border border-[var(--border-base)] px-4 py-2 text-sm font-medium text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)] transition-colors">
                  Cancelar
                </Dialog.Close>
                <button
                  type="submit"
                  disabled={submitting}
                  className="rounded-lg bg-[var(--blue)] px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50 transition-colors"
                >
                  {submitting ? 'Guardando...' : 'Guardar grabacion'}
                </button>
              </div>
            </form>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  )
}
