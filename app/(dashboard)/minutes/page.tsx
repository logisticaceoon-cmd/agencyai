'use client'

import { useState, useEffect, useCallback } from 'react'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import {
  FileText,
  Plus,
  Search,
  Calendar,
  Users,
  Filter,
  X,
  Check,
} from 'lucide-react'
import { cn, formatDate, getInitials } from '@/lib/utils'
import * as Dialog from '@radix-ui/react-dialog'
import Link from 'next/link'
import { InfoBanner } from '@/components/shared/InfoBanner'

interface Minute {
  id: string
  title: string
  meeting_date: string | null
  participants: string[]
  meeting_type: string
  status: string
  client_id: string | null
  client_name?: string | null
  project_id: string | null
  created_at: string
}

interface ClientOption {
  id: string
  name: string
}

interface ProjectOption {
  id: string
  name: string
}

interface TeamMember {
  id: string
  name: string
  email: string
  role: string
  status: string
}

const MEETING_TYPES = [
  { value: 'kickoff', label: 'Kickoff' },
  { value: 'followup', label: 'Seguimiento' },
  { value: 'review', label: 'Revisión' },
  { value: 'closure', label: 'Cierre' },
  { value: 'other', label: 'Otro' },
]

const STATUS_OPTIONS = [
  { value: '', label: 'Todos' },
  { value: 'draft', label: 'Borrador' },
  { value: 'final', label: 'Finalizada' },
]


export default function MinutesPage() {
  const { org } = useCurrentUser()
  const [minutes, setMinutes] = useState<Minute[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [clients, setClients] = useState<ClientOption[]>([])
  const [projects, setProjects] = useState<ProjectOption[]>([])
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([])
  const [saving, setSaving] = useState(false)

  // Form state
  const [form, setForm] = useState({
    title: '',
    client_id: '',
    project_id: '',
    meeting_date: '',
    participants: [] as string[],
    meeting_type: 'followup',
  })
  const [customParticipant, setCustomParticipant] = useState('')

  const fetchMinutes = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (search) params.set('search', search)
      if (statusFilter) params.set('status', statusFilter)
      const res = await fetch(`/api/minutes?${params.toString()}`)
      const data = await res.json()
      setMinutes(data.data || [])
    } catch {
      setMinutes([])
    } finally {
      setLoading(false)
    }
  }, [search, statusFilter])

  useEffect(() => {
    if (org) fetchMinutes()
  }, [org, fetchMinutes])

  useEffect(() => {
    if (org) {
      fetch('/api/clients?limit=200')
        .then((r) => r.json())
        .then((d) => setClients(d.data || []))
        .catch(() => {})
      fetch('/api/projects?limit=200')
        .then((r) => r.json())
        .then((d) => setProjects(d.data || []))
        .catch(() => {})
      fetch('/api/team')
        .then((r) => r.json())
        .then((d) => setTeamMembers((d.data || []).filter((m: TeamMember) => m.status === 'active')))
        .catch(() => {})
    }
  }, [org])

  const handleCreate = async () => {
    if (!form.title.trim()) return
    setSaving(true)
    try {
      const body = {
        title: form.title.trim(),
        client_id: form.client_id || null,
        project_id: form.project_id || null,
        meeting_date: form.meeting_date || null,
        participants: form.participants,
        meeting_type: form.meeting_type,
      }
      const res = await fetch('/api/minutes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (res.ok) {
        setModalOpen(false)
        setForm({
          title: '',
          client_id: '',
          project_id: '',
          meeting_date: '',
          participants: [],
          meeting_type: 'followup',
        })
        setCustomParticipant('')
        fetchMinutes()
      }
    } catch {
      // ignore
    } finally {
      setSaving(false)
    }
  }

  const filteredMinutes = minutes

  if (!org) return null

  return (
    <div className="space-y-6">
      <InfoBanner id="minutes" title="Minutas de Reuniones" description="Registra las minutas de tus reuniones con clientes. Cada minuta se vincula a un cliente para llevar historial." />
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Minutas</h1>
          <p className="mt-1 text-sm text-slate-500">
            Minutas de reuniones con clientes y equipo
          </p>
        </div>
        <Dialog.Root open={modalOpen} onOpenChange={setModalOpen}>
          <Dialog.Trigger asChild>
            <button className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium shadow-sm">
              <Plus className="h-4 w-4" />
              Nueva minuta
            </button>
          </Dialog.Trigger>

          <Dialog.Portal>
            <Dialog.Overlay className="fixed inset-0 bg-black/30 z-50" />
            <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white rounded-xl shadow-xl p-6 w-full max-w-lg z-50 max-h-[90vh] overflow-y-auto">
              <Dialog.Title className="text-lg font-semibold text-slate-900 mb-5">
                Nueva Minuta
              </Dialog.Title>

              <div className="space-y-4">
                {/* Title */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Título *
                  </label>
                  <input
                    type="text"
                    value={form.title}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, title: e.target.value }))
                    }
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-slate-900"
                    placeholder="Ej: Reunión kickoff - Proyecto X"
                  />
                </div>

                {/* Client */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Cliente
                  </label>
                  <select
                    value={form.client_id}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, client_id: e.target.value }))
                    }
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-slate-900 bg-white"
                  >
                    <option value="">Sin cliente</option>
                    {clients.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Project */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Proyecto (opcional)
                  </label>
                  <select
                    value={form.project_id}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, project_id: e.target.value }))
                    }
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-slate-900 bg-white"
                  >
                    <option value="">Sin proyecto</option>
                    {projects.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Date & Time */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Fecha y hora
                  </label>
                  <input
                    type="datetime-local"
                    value={form.meeting_date}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, meeting_date: e.target.value }))
                    }
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-slate-900"
                  />
                </div>

                {/* Participants */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">
                    Participantes
                  </label>
                  {/* Team member chips */}
                  {teamMembers.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mb-2">
                      {teamMembers.map((tm) => {
                        const label = tm.name || tm.email.split('@')[0]
                        const selected = form.participants.includes(label)
                        return (
                          <button
                            key={tm.id}
                            type="button"
                            onClick={() =>
                              setForm((f) => ({
                                ...f,
                                participants: selected
                                  ? f.participants.filter((p) => p !== label)
                                  : [...f.participants, label],
                              }))
                            }
                            className={cn(
                              'inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border transition-all',
                              selected
                                ? 'bg-blue-100 text-blue-700 border-blue-300'
                                : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
                            )}
                          >
                            {selected && <Check className="h-3 w-3" />}
                            {label}
                          </button>
                        )
                      })}
                    </div>
                  )}
                  {/* Custom participant input */}
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={customParticipant}
                      onChange={(e) => setCustomParticipant(e.target.value)}
                      onKeyDown={(e) => {
                        if ((e.key === 'Enter' || e.key === ',') && customParticipant.trim()) {
                          e.preventDefault()
                          const val = customParticipant.trim().replace(/,$/, '')
                          if (val && !form.participants.includes(val)) {
                            setForm((f) => ({ ...f, participants: [...f.participants, val] }))
                          }
                          setCustomParticipant('')
                        }
                      }}
                      placeholder="Agregar otro participante (Enter para confirmar)"
                      className="flex-1 px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-slate-900"
                    />
                  </div>
                  {/* Selected participants tags */}
                  {form.participants.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {form.participants.map((p) => (
                        <span
                          key={p}
                          className="inline-flex items-center gap-1 bg-slate-100 text-slate-700 text-xs px-2 py-0.5 rounded-full"
                        >
                          {p}
                          <button
                            type="button"
                            onClick={() =>
                              setForm((f) => ({
                                ...f,
                                participants: f.participants.filter((x) => x !== p),
                              }))
                            }
                            className="text-slate-400 hover:text-slate-600"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Meeting Type */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Tipo de reunión
                  </label>
                  <select
                    value={form.meeting_type}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        meeting_type: e.target.value,
                      }))
                    }
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-slate-900 bg-white"
                  >
                    {MEETING_TYPES.map((t) => (
                      <option key={t.value} value={t.value}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-slate-200">
                <Dialog.Close asChild>
                  <button className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">
                    Cancelar
                  </button>
                </Dialog.Close>
                <button
                  onClick={handleCreate}
                  disabled={!form.title.trim() || saving}
                  className="px-4 py-2 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {saving ? 'Creando...' : 'Crear minuta'}
                </button>
              </div>
            </Dialog.Content>
          </Dialog.Portal>
        </Dialog.Root>
      </div>

      {/* Search & Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar minutas..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-slate-900 bg-white"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-slate-400" />
          {STATUS_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setStatusFilter(opt.value)}
              className={cn(
                'px-3 py-1.5 text-xs font-medium rounded-full border transition-colors',
                statusFilter === opt.value
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Minutes List */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="h-8 w-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filteredMinutes.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <FileText className="h-12 w-12 text-slate-300 mb-3" />
          <p className="text-slate-500 text-sm">No hay minutas registradas</p>
          <p className="text-slate-400 text-xs mt-1">
            Crea una nueva minuta para empezar
          </p>
        </div>
      ) : (
        <div className="grid gap-4">
          {filteredMinutes.map((minute) => (
            <Link
              key={minute.id}
              href={`/minutes/${minute.id}`}
              className="block rounded-xl border border-slate-200 bg-white p-5 hover:shadow-md transition-shadow group"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-base font-semibold text-slate-900 truncate group-hover:text-blue-600 transition-colors">
                      {minute.title}
                    </h3>
                    <span
                      className={cn(
                        'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium whitespace-nowrap',
                        minute.status === 'final'
                          ? 'bg-green-100 text-green-700'
                          : 'bg-slate-100 text-slate-600'
                      )}
                    >
                      {minute.status === 'final'
                        ? 'Finalizada'
                        : 'Borrador'}
                    </span>
                  </div>

                  <div className="flex items-center gap-4 text-xs text-slate-500">
                    {minute.client_name && (
                      <span className="flex items-center gap-1">
                        <Users className="h-3.5 w-3.5" />
                        {minute.client_name}
                      </span>
                    )}
                    {minute.meeting_date && (
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3.5 w-3.5" />
                        {formatDate(minute.meeting_date)}
                      </span>
                    )}
                    <span className="capitalize px-2 py-0.5 bg-blue-50 text-blue-600 rounded-md text-xs font-medium">
                      {MEETING_TYPES.find(
                        (t) => t.value === minute.meeting_type
                      )?.label || minute.meeting_type}
                    </span>
                  </div>
                </div>

                {/* Participant Avatars */}
                {minute.participants && minute.participants.length > 0 && (
                  <div className="flex -space-x-2 ml-4 flex-shrink-0">
                    {minute.participants.slice(0, 4).map((p, i) => (
                      <div
                        key={i}
                        className="w-8 h-8 rounded-full bg-blue-100 border-2 border-white flex items-center justify-center"
                        title={p}
                      >
                        <span className="text-[10px] font-semibold text-blue-700">
                          {getInitials(p)}
                        </span>
                      </div>
                    ))}
                    {minute.participants.length > 4 && (
                      <div className="w-8 h-8 rounded-full bg-slate-100 border-2 border-white flex items-center justify-center">
                        <span className="text-[10px] font-semibold text-slate-500">
                          +{minute.participants.length - 4}
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
