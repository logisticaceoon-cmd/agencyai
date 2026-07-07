'use client'

import { useEffect, useState, useCallback, useMemo } from 'react'
import Link from 'next/link'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import { toast } from '@/hooks/use-toast'
import { cn } from '@/lib/utils'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import * as Dialog from '@radix-ui/react-dialog'
import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import {
  Users,
  Plus,
  Search,
  MoreVertical,
  Pencil,
  Eye,
  Trash2,
  X,
  DollarSign,
  Mail,
  Building2,
  Loader2,
  Percent,
  Download,
} from 'lucide-react'
import { downloadCSV } from '@/lib/export'
import { InfoBanner } from '@/components/shared/InfoBanner'
import { usePlanLimits } from '@/hooks/usePlanLimits'
import { getInitials } from '@/lib/utils'
import { Zap } from 'lucide-react'

// -- Helpers ------------------------------------------------------------------

function getColor(name: string) {
  const colors = [
    'bg-blue-500',
    'bg-green-500',
    'bg-purple-500',
    'bg-amber-500',
    'bg-rose-500',
    'bg-cyan-500',
  ]
  return colors[name.length % colors.length]
}

// -- Types --------------------------------------------------------------------

interface Client {
  id: string
  name: string
  brand: string | null
  email: string | null
  phone: string | null
  website: string | null
  industry: string | null
  status: string
  notes: string | null
  monthlyFee: string | null
  pays_percentage: boolean
  percentage_value: number | null
  accountManager: { id: string; fullName: string } | null
  _count: { tasks: number; reports: number; projects: number }
}

// -- Validation ---------------------------------------------------------------

const clientSchema = z.object({
  name: z.string().min(1, 'El nombre es obligatorio'),
  brand: z.string().optional(),
  email: z.string().email('Email no valido').or(z.literal('')).optional(),
  phone: z.string().optional(),
  website: z.string().optional(),
  industry: z.string().optional(),
  status: z.enum(['active', 'inactive', 'onboarding', 'paused']).optional(),
  monthlyFee: z.union([z.number().min(0), z.nan()]).optional(),
  notes: z.string().optional(),
  pays_percentage: z.boolean(),
  percentage_value: z.number().min(0).max(100).optional().nullable(),
  contract: z.string().optional(),
  contractStart: z.string().optional(),
})

type ClientFormData = z.infer<typeof clientSchema>

// -- Status helpers -----------------------------------------------------------

const statusLabel: Record<string, string> = {
  active: 'Activo',
  inactive: 'Inactivo',
  onboarding: 'Onboarding',
  paused: 'Pausado',
  risk: 'En riesgo',
  scaling: 'Escalando',
}

const statusColor: Record<string, string> = {
  active: 'bg-green-50 text-green-700 border-green-200',
  inactive: 'bg-slate-50 text-slate-500 border-slate-200',
  onboarding: 'bg-blue-50 text-blue-700 border-blue-200',
  paused: 'bg-amber-50 text-amber-700 border-amber-200',
  risk: 'bg-red-50 text-red-700 border-red-200',
  scaling: 'bg-purple-50 text-purple-700 border-purple-200',
}

const industries = [
  'E-commerce',
  'SaaS',
  'Retail',
  'Salud',
  'Educacion',
  'Finanzas',
  'Inmobiliaria',
  'Restaurantes',
  'Moda',
  'Tecnologia',
  'Servicios profesionales',
  'Otro',
]

// -- Component ----------------------------------------------------------------

export default function ClientsPage() {
  const { user } = useCurrentUser()
  const { maxClients, isFounder } = usePlanLimits()
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingClient, setEditingClient] = useState<Client | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)
  const [deleteInput, setDeleteInput] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [upgradeModal, setUpgradeModal] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [bulkLoading, setBulkLoading] = useState(false)

  const canManage = !user ? false : ['CEO', 'Manager', 'owner', 'admin'].includes(user.role)

  // -- Form -------------------------------------------------------------------

  const {
    register,
    handleSubmit,
    reset,
    control,
    watch,
    formState: { errors },
  } = useForm<ClientFormData>({
    resolver: zodResolver(clientSchema),
    defaultValues: {
      status: 'active',
      pays_percentage: false,
      percentage_value: null,
      contract: '',
      contractStart: '',
    },
  })

  const watchPaysPercentage = watch('pays_percentage')

  // -- Data fetching ----------------------------------------------------------

  const loadClients = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (statusFilter) params.set('status', statusFilter)
      if (searchQuery) params.set('search', searchQuery)
      const res = await fetch(`/api/clients?${params}`)
      if (res.ok) {
        const json = await res.json()
        // Handle both { data: [...] } and direct array response
        setClients(Array.isArray(json) ? json : (json.data || []))
      }
    } catch {
      toast({ title: 'Error al cargar clientes', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }, [statusFilter, searchQuery])

  useEffect(() => {
    loadClients()
  }, [loadClients])

  // -- Group clients by industry ----------------------------------------------

  const groupedClients = useMemo(() => {
    const groups: Record<string, Client[]> = {}
    for (const client of clients) {
      const key = client.industry || 'Sin categoria'
      if (!groups[key]) groups[key] = []
      groups[key].push(client)
    }
    // Sort: known industries first alphabetically, "Sin categoria" last
    const sortedKeys = Object.keys(groups).sort((a, b) => {
      if (a === 'Sin categoria') return 1
      if (b === 'Sin categoria') return -1
      return a.localeCompare(b)
    })
    return sortedKeys.map((key) => ({ industry: key, clients: groups[key] }))
  }, [clients])

  // -- Handlers ---------------------------------------------------------------

  function openCreateDialog() {
    setEditingClient(null)
    reset({
      name: '',
      brand: '',
      email: '',
      phone: '',
      website: '',
      industry: '',
      status: 'active',
      monthlyFee: undefined,
      notes: '',
      pays_percentage: false,
      percentage_value: null,
      contract: '',
      contractStart: '',
    })
    setDialogOpen(true)
  }

  function openEditDialog(client: Client) {
    setEditingClient(client)
    reset({
      name: client.name,
      brand: client.brand || '',
      email: client.email || '',
      phone: client.phone || '',
      website: client.website || '',
      industry: client.industry || '',
      status: (client.status as ClientFormData['status']) || 'active',
      monthlyFee: client.monthlyFee ? Number(client.monthlyFee) : undefined,
      notes: client.notes || '',
      pays_percentage: client.pays_percentage || false,
      percentage_value: client.percentage_value ?? null,
      contract: (client as any).contract || '',
      contractStart: (client as any).contractStart || '',
    })
    setDialogOpen(true)
  }

  async function onSubmit(formData: ClientFormData) {
    setSubmitting(true)
    try {
      const payload = {
        name: formData.name,
        brand: formData.brand,
        email: formData.email || undefined,
        phone: formData.phone,
        website: formData.website,
        industry: formData.industry,
        status: formData.status,
        monthlyFee:
          formData.monthlyFee !== undefined && !isNaN(formData.monthlyFee)
            ? formData.monthlyFee
            : undefined,
        notes: formData.notes,
        pays_percentage: formData.pays_percentage,
        percentage_value: formData.pays_percentage ? formData.percentage_value : null,
        contract: formData.contract,
        contractStart: formData.contractStart || undefined,
      }

      if (editingClient) {
        const res = await fetch(`/api/clients/${editingClient.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
        if (res.ok) {
          setDialogOpen(false)
          loadClients()
        }
      } else {
        const res = await fetch('/api/clients', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
        if (res.ok) {
          setDialogOpen(false)
          loadClients()
        } else {
          const err = await res.json()
          if (err.limitReached) {
            setDialogOpen(false)
            setUpgradeModal(true)
          }
        }
      }
    } finally {
      setSubmitting(false)
    }
  }

  async function handleDelete(id: string) {
    try {
      const res = await fetch(`/api/clients/${id}`, { method: 'DELETE' })
      if (res.ok) {
        setDeleteConfirm(null)
        setDeleteInput('')
        loadClients()
      }
    } catch {
      // silently fail
    }
  }

  // -- Bulk actions -----------------------------------------------------------

  const allSelected = clients.length > 0 && selectedIds.size === clients.length
  const someSelected = selectedIds.size > 0 && selectedIds.size < clients.length

  function toggleClient(id: string) {
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
      setSelectedIds(new Set(clients.map((c) => c.id)))
    }
  }

  async function bulkStatusChange(newStatus: string) {
    setBulkLoading(true)
    try {
      const promises = Array.from(selectedIds).map((id) =>
        fetch(`/api/clients/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: newStatus }),
        })
      )
      await Promise.all(promises)
      setSelectedIds(new Set())
      loadClients()
    } finally {
      setBulkLoading(false)
    }
  }

  async function bulkDelete() {
    if (!confirm(`Eliminar ${selectedIds.size} clientes seleccionados?`)) return
    setBulkLoading(true)
    try {
      const promises = Array.from(selectedIds).map((id) =>
        fetch(`/api/clients/${id}`, { method: 'DELETE' })
      )
      await Promise.all(promises)
      setSelectedIds(new Set())
      loadClients()
    } finally {
      setBulkLoading(false)
    }
  }

  // -- Get client name for delete dialog --------------------------------------

  const deleteClientName = useMemo(() => {
    if (!deleteConfirm) return ''
    const c = clients.find((cl) => cl.id === deleteConfirm)
    return c ? c.name : ''
  }, [deleteConfirm, clients])

  // -- Filtered clients -------------------------------------------------------

  const filteredClients = clients

  // -- Render -----------------------------------------------------------------

  // Indicador de uso
  const clientCount = clients.length
  const atLimit = !isFounder && maxClients !== Infinity && clientCount >= maxClients
  const usagePercent = maxClients !== Infinity ? Math.min((clientCount / maxClients) * 100, 100) : 0

  return (
    <div className="space-y-6">
      {/* Modal upgrade */}
      {upgradeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="h-10 w-10 rounded-full bg-amber-100 flex items-center justify-center">
                <Zap className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900">Límite de clientes alcanzado</h3>
                <p className="text-sm text-slate-500">Tu plan actual permite máximo {maxClients} clientes</p>
              </div>
            </div>
            <p className="text-sm text-slate-600 mb-6">
              Para agregar más clientes, actualizá tu plan. Los planes Pro, Agency y Scale ofrecen más capacidad para hacer crecer tu agencia.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setUpgradeModal(false)}
                className="flex-1 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Cancelar
              </button>
              <a
                href="/settings/billing"
                className="flex-1 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-medium text-white text-center hover:bg-blue-700"
              >
                Ver planes →
              </a>
            </div>
          </div>
        </div>
      )}

      <InfoBanner id="clients" title="Gestion de Clientes" description="Aqui podes administrar todos los clientes de tu agencia. Crea, edita y organiza tu cartera de clientes por industria." />
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Clientes</h1>
          <p className="mt-1 text-sm text-slate-500">
            Gestion de clientes de la agencia
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* Indicador de uso */}
          {!isFounder && maxClients !== Infinity && (
            <div className="flex items-center gap-2">
              <span className={`text-sm font-medium ${atLimit ? 'text-red-600' : 'text-slate-500'}`}>
                {clientCount}/{maxClients} clientes
              </span>
              <div className="w-20 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${atLimit ? 'bg-red-500' : usagePercent > 75 ? 'bg-amber-500' : 'bg-blue-500'}`}
                  style={{ width: `${usagePercent}%` }}
                />
              </div>
            </div>
          )}
          {canManage && (
            <button
              onClick={atLimit ? () => setUpgradeModal(true) : openCreateDialog}
              className={`flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium text-white shadow-sm transition-colors ${atLimit ? 'bg-amber-500 hover:bg-amber-600' : 'bg-blue-600 hover:bg-blue-700'}`}
            >
              {atLimit ? <Zap className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
              {atLimit ? 'Límite alcanzado' : 'Nuevo cliente'}
            </button>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar por nombre, empresa o email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-lg border border-slate-200 bg-white pl-10 pr-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-700 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        >
          <option value="">Todos los estados</option>
          <option value="active">Activos</option>
          <option value="inactive">Inactivos</option>
          <option value="onboarding">Onboarding</option>
          <option value="paused">Pausados</option>
          <option value="risk">En riesgo</option>
          <option value="scaling">Escalando</option>
        </select>
        <button
          onClick={() => downloadCSV(clients as unknown as Record<string, unknown>[], 'clientes', [
            { key: 'name', label: 'Nombre' },
            { key: 'brand', label: 'Marca' },
            { key: 'email', label: 'Email' },
            { key: 'phone', label: 'Teléfono' },
            { key: 'status', label: 'Estado' },
            { key: 'industry', label: 'Industria' },
            { key: 'monthlyFee', label: 'Fee Mensual' },
          ])}
          className="px-3 py-2 text-sm border border-slate-200 rounded-lg hover:bg-slate-50 flex items-center gap-2"
        >
          <Download className="w-4 h-4" />
          Exportar
        </button>
      </div>

      {/* Content */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div
              key={i}
              className="animate-pulse rounded-xl border border-slate-200 bg-white p-4 flex items-center gap-4"
            >
              <div className="h-10 w-10 rounded-full bg-slate-200 shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-1/3 rounded bg-slate-200" />
                <div className="h-3 w-1/4 rounded bg-slate-100" />
              </div>
              <div className="h-6 w-16 rounded-full bg-slate-100" />
              <div className="h-4 w-20 rounded bg-slate-100" />
            </div>
          ))}
        </div>
      ) : filteredClients.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="mb-4 rounded-full bg-slate-100 p-4">
            <Users className="h-8 w-8 text-slate-400" />
          </div>
          <h3 className="text-lg font-medium text-slate-700">
            No hay clientes
          </h3>
          <p className="mt-2 max-w-sm text-sm text-slate-500">
            Agrega el primer cliente de la agencia para comenzar
          </p>
        </div>
      ) : (
        <div className="space-y-8">
          {/* Select all */}
          <div className="flex items-center gap-3 px-2">
            <input
              type="checkbox"
              checked={allSelected}
              ref={(el) => { if (el) el.indeterminate = someSelected }}
              onChange={toggleAll}
              className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
            />
            <span className="text-sm text-slate-500">Seleccionar todos</span>
          </div>

          {groupedClients.map((group) => (
            <div key={group.industry}>
              {/* Industry section header */}
              <div className="flex items-center gap-3 mb-3">
                <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider">
                  {group.industry}
                </h2>
                <span className="text-xs text-slate-400 font-medium">
                  ({group.clients.length})
                </span>
                <div className="flex-1 h-px bg-slate-200" />
              </div>

              {/* Client rows */}
              <div className="space-y-2">
                {group.clients.map((client) => (
                  <div
                    key={client.id}
                    className={cn(
                      "group relative flex items-center gap-4 rounded-xl border border-slate-200 bg-white px-5 py-4 shadow-sm hover:shadow-md hover:border-slate-300 transition-all",
                      selectedIds.has(client.id) && "bg-blue-50 border-blue-200 hover:bg-blue-50"
                    )}
                  >
                    {/* Checkbox */}
                    <input
                      type="checkbox"
                      checked={selectedIds.has(client.id)}
                      onChange={() => toggleClient(client.id)}
                      className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer shrink-0"
                      onClick={(e) => e.stopPropagation()}
                    />

                    {/* Avatar */}
                    <Link href={`/clients/${client.id}`} className="shrink-0">
                      <div
                        className={`flex h-10 w-10 items-center justify-center rounded-full text-sm font-semibold text-white ${getColor(client.name)}`}
                      >
                        {getInitials(client.name)}
                      </div>
                    </Link>

                    {/* Name / Brand / Email */}
                    <Link href={`/clients/${client.id}`} className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-semibold text-slate-900 truncate">
                          {client.name}
                        </h3>
                        {client.brand && (
                          <span className="text-xs text-slate-500 truncate flex items-center gap-1">
                            <Building2 className="h-3 w-3 shrink-0" />
                            {client.brand}
                          </span>
                        )}
                      </div>
                      {client.email && (
                        <p className="text-xs text-slate-500 truncate flex items-center gap-1 mt-0.5">
                          <Mail className="h-3 w-3 shrink-0" />
                          {client.email}
                        </p>
                      )}
                    </Link>

                    {/* Percentage badge */}
                    {client.pays_percentage && client.percentage_value != null && (
                      <span className="hidden sm:inline-flex items-center gap-1 rounded-full border border-purple-200 bg-purple-50 px-2.5 py-0.5 text-xs font-medium text-purple-700 shrink-0">
                        <Percent className="h-3 w-3" />
                        {client.percentage_value}%
                      </span>
                    )}

                    {/* Status badge */}
                    <span
                      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium shrink-0 ${statusColor[client.status] || statusColor.inactive}`}
                    >
                      {statusLabel[client.status] || client.status}
                    </span>

                    {/* Monthly fee */}
                    <div className="w-28 text-right shrink-0">
                      {client.monthlyFee ? (
                        <span className="text-sm font-semibold text-slate-700 flex items-center justify-end gap-1">
                          <DollarSign className="h-3.5 w-3.5 text-slate-400" />
                          {Number(client.monthlyFee).toLocaleString()}/mes
                        </span>
                      ) : (
                        <span className="text-xs text-slate-400">--</span>
                      )}
                    </div>

                    {/* Context menu */}
                    {canManage && (
                      <div className="shrink-0">
                        <DropdownMenu.Root>
                          <DropdownMenu.Trigger asChild>
                            <button className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors focus:outline-none">
                              <MoreVertical className="h-4 w-4" />
                            </button>
                          </DropdownMenu.Trigger>
                          <DropdownMenu.Portal>
                            <DropdownMenu.Content
                              className="min-w-[160px] rounded-lg border border-slate-200 bg-white p-1 shadow-lg z-50"
                              sideOffset={5}
                              align="end"
                            >
                              <DropdownMenu.Item
                                className="flex items-center gap-2 rounded-md px-3 py-2 text-sm text-slate-700 hover:bg-slate-100 cursor-pointer outline-none"
                                onSelect={() => openEditDialog(client)}
                              >
                                <Pencil className="h-3.5 w-3.5" />
                                Editar
                              </DropdownMenu.Item>
                              <DropdownMenu.Item asChild>
                                <Link
                                  href={`/clients/${client.id}`}
                                  className="flex items-center gap-2 rounded-md px-3 py-2 text-sm text-slate-700 hover:bg-slate-100 cursor-pointer outline-none"
                                >
                                  <Eye className="h-3.5 w-3.5" />
                                  Ver detalle
                                </Link>
                              </DropdownMenu.Item>
                              <DropdownMenu.Separator className="my-1 h-px bg-slate-200" />
                              <DropdownMenu.Item
                                className="flex items-center gap-2 rounded-md px-3 py-2 text-sm text-red-600 hover:bg-red-50 cursor-pointer outline-none"
                                onSelect={() => {
                                  setDeleteInput('')
                                  setDeleteConfirm(client.id)
                                }}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                                Eliminar
                              </DropdownMenu.Item>
                            </DropdownMenu.Content>
                          </DropdownMenu.Portal>
                        </DropdownMenu.Root>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Bulk Actions Toolbar */}
      {selectedIds.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-slate-900 text-white px-6 py-3 rounded-full shadow-xl flex items-center gap-4 z-40">
          <span className="text-sm">{selectedIds.size} seleccionados</span>
          <button onClick={() => bulkStatusChange('active')} disabled={bulkLoading} className="text-sm px-3 py-1 bg-green-600 rounded-full hover:bg-green-700 disabled:opacity-50">Activar</button>
          <button onClick={() => bulkStatusChange('inactive')} disabled={bulkLoading} className="text-sm px-3 py-1 bg-slate-600 rounded-full hover:bg-slate-700 disabled:opacity-50">Desactivar</button>
          <button onClick={bulkDelete} disabled={bulkLoading} className="text-sm px-3 py-1 bg-red-600 rounded-full hover:bg-red-700 disabled:opacity-50">Eliminar</button>
          <button onClick={() => setSelectedIds(new Set())} className="text-sm text-slate-400 hover:text-white">Cancelar</button>
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog.Root open={dialogOpen} onOpenChange={setDialogOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/40 z-50" />
          <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-full max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-xl border border-slate-200 bg-white p-6 shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <Dialog.Title className="text-lg font-semibold text-slate-900">
                {editingClient ? 'Editar cliente' : 'Nuevo cliente'}
              </Dialog.Title>
              <Dialog.Close asChild>
                <button className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors">
                  <X className="h-4 w-4" />
                </button>
              </Dialog.Close>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              {/* Nombre */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Nombre <span className="text-red-500">*</span>
                </label>
                <input
                  {...register('name')}
                  className="w-full rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  placeholder="Nombre del cliente"
                />
                {errors.name && (
                  <p className="mt-1 text-xs text-red-500">
                    {errors.name.message}
                  </p>
                )}
              </div>

              {/* Empresa */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Empresa
                </label>
                <input
                  {...register('brand')}
                  className="w-full rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  placeholder="Nombre de la empresa"
                />
              </div>

              {/* Email */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Email <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  {...register('email')}
                  className="w-full rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  placeholder="email@ejemplo.com"
                />
                {errors.email && (
                  <p className="mt-1 text-xs text-red-500">
                    {errors.email.message}
                  </p>
                )}
              </div>

              {/* Phone & Website */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Telefono
                  </label>
                  <input
                    {...register('phone')}
                    className="w-full rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    placeholder="+1 234 567 890"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Sitio web
                  </label>
                  <input
                    {...register('website')}
                    className="w-full rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    placeholder="https://ejemplo.com"
                  />
                </div>
              </div>

              {/* Industry & Status */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Industria
                  </label>
                  <select
                    {...register('industry')}
                    className="w-full rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    <option value="">Seleccionar...</option>
                    {industries.map((ind) => (
                      <option key={ind} value={ind}>
                        {ind}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Estado
                  </label>
                  <select
                    {...register('status')}
                    className="w-full rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    <option value="active">Activo</option>
                    <option value="inactive">Inactivo</option>
                    <option value="onboarding">Onboarding</option>
                    <option value="paused">Pausado</option>
                  </select>
                </div>
              </div>

              {/* Monthly value */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Valor mensual
                </label>
                <input
                  type="number"
                  step="0.01"
                  {...register('monthlyFee', { valueAsNumber: true })}
                  className="w-full rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  placeholder="0.00"
                />
              </div>

              {/* Pays percentage toggle */}
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium text-slate-700">
                    Este cliente paga por porcentaje?
                  </label>
                  <Controller
                    name="pays_percentage"
                    control={control}
                    render={({ field }) => (
                      <button
                        type="button"
                        role="switch"
                        aria-checked={field.value}
                        onClick={() => field.onChange(!field.value)}
                        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                          field.value ? 'bg-blue-600' : 'bg-slate-300'
                        }`}
                      >
                        <span
                          className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                            field.value ? 'translate-x-5' : 'translate-x-0'
                          }`}
                        />
                      </button>
                    )}
                  />
                </div>

                {watchPaysPercentage && (
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Porcentaje acordado (%)
                    </label>
                    <input
                      type="number"
                      min={0}
                      max={100}
                      step="0.1"
                      {...register('percentage_value', { valueAsNumber: true })}
                      className="w-full rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      placeholder="15"
                    />
                    {errors.percentage_value && (
                      <p className="mt-1 text-xs text-red-500">
                        {errors.percentage_value.message}
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Notas
                </label>
                <textarea
                  {...register('notes')}
                  rows={3}
                  className="w-full rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none"
                  placeholder="Notas internas sobre el cliente..."
                />
              </div>

              {/* Contrato */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Contrato
                </label>
                <textarea
                  {...register('contract')}
                  rows={2}
                  className="w-full rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none"
                  placeholder="Detalles del contrato..."
                />
              </div>

              {/* Fecha inicio */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Fecha inicio
                </label>
                <input
                  type="date"
                  {...register('contractStart')}
                  className="w-full rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-3 pt-2">
                <Dialog.Close asChild>
                  <button
                    type="button"
                    className="rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
                  >
                    Cancelar
                  </button>
                </Dialog.Close>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-blue-700 disabled:opacity-50 transition-colors"
                >
                  {submitting && (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  )}
                  {editingClient ? 'Guardar cambios' : 'Crear cliente'}
                </button>
              </div>
            </form>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      {/* Delete confirmation dialog */}
      <Dialog.Root
        open={deleteConfirm !== null}
        onOpenChange={(open) => {
          if (!open) {
            setDeleteConfirm(null)
            setDeleteInput('')
          }
        }}
      >
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/40 z-50" />
          <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-full max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-xl border border-slate-200 bg-white p-6 shadow-xl">
            <Dialog.Title className="text-lg font-semibold text-slate-900">
              Eliminar cliente
            </Dialog.Title>
            <Dialog.Description className="mt-2 text-sm text-slate-500">
              Para confirmar la eliminacion de <span className="font-semibold text-slate-700">{deleteClientName}</span>, escribi <span className="font-mono font-bold text-red-600">ELIMINAR</span>
            </Dialog.Description>
            <div className="mt-4">
              <input
                type="text"
                value={deleteInput}
                onChange={(e) => setDeleteInput(e.target.value)}
                placeholder="Escribi ELIMINAR para confirmar"
                className="w-full rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
                autoFocus
              />
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => {
                  setDeleteConfirm(null)
                  setDeleteInput('')
                }}
                className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={() => deleteConfirm && handleDelete(deleteConfirm)}
                disabled={deleteInput !== 'ELIMINAR'}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Eliminar
              </button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  )
}
