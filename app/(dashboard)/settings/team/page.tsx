'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  Users, Plus, X, Loader2, Shield, Trash2, Mail, Copy, Check,
  Link as LinkIcon, RefreshCw, Crown, Zap, Target, Eye, Briefcase,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { ROLE_LABELS, type AppRole } from '@/lib/roles'
import { usePlanLimits } from '@/hooks/usePlanLimits'

interface Member {
  id: string
  user_id: string
  email: string
  name: string
  role: string
  status: string
  avatar_url: string | null
  created_at: string
}

interface WorkspaceRole {
  id: string
  key: string
  label: string
  description: string | null
  color: string
  base_role: string
  is_system: boolean
}

interface ClientOption {
  id: string
  name: string
  brand?: string | null
  status: string
}

const ROLE_COLORS: Record<string, string> = {
  owner:      'bg-amber-50 text-amber-700 border-amber-200',
  admin:      'bg-purple-50 text-purple-700 border-purple-200',
  trafficker: 'bg-blue-50 text-blue-700 border-blue-200',
  viewer:     'bg-slate-100 text-slate-600 border-slate-200',
}

const ROLE_ICONS: Record<string, React.ReactNode> = {
  owner:      <Crown className="h-3.5 w-3.5" />,
  admin:      <Zap className="h-3.5 w-3.5" />,
  trafficker: <Target className="h-3.5 w-3.5" />,
  viewer:     <Eye className="h-3.5 w-3.5" />,
}

const FALLBACK_ROLES: WorkspaceRole[] = [
  { id: 'admin', key: 'admin', label: 'Admin', description: 'Acceso operativo completo. Sin acceso a billing.', color: '#7c3aed', base_role: 'admin', is_system: true },
  { id: 'trafficker', key: 'trafficker', label: 'Trafficker', description: 'Ve sus clientes, campañas, tareas y KPIs asignados.', color: '#2563eb', base_role: 'trafficker', is_system: true },
  { id: 'viewer', key: 'viewer', label: 'Solo lectura', description: 'Solo puede ver reportes y KPIs. Sin edición.', color: '#64748b', base_role: 'viewer', is_system: true },
]

function getRoleColor(baseRole: string): string {
  return ROLE_COLORS[baseRole] || ROLE_COLORS.viewer
}

function getRoleIcon(baseRole: string): React.ReactNode {
  return ROLE_ICONS[baseRole] || ROLE_ICONS.viewer
}

function Avatar({ name, size = 'md' }: { name: string; size?: 'sm' | 'md' }) {
  const colors = ['bg-blue-500', 'bg-purple-500', 'bg-green-500', 'bg-amber-500', 'bg-rose-500', 'bg-cyan-500']
  const color = colors[name.charCodeAt(0) % colors.length]
  const dim = size === 'sm' ? 'h-7 w-7 text-xs' : 'h-9 w-9 text-sm'
  return (
    <div className={cn('rounded-full flex items-center justify-center font-bold text-white flex-shrink-0', color, dim)}>
      {name[0]?.toUpperCase()}
    </div>
  )
}

export default function TeamPage() {
  const { maxUsers, isFounder } = usePlanLimits()
  const [members, setMembers] = useState<Member[]>([])
  const [workspaceRoles, setWorkspaceRoles] = useState<WorkspaceRole[]>(FALLBACK_ROLES)
  const [loading, setLoading] = useState(true)
  const [rolesLoading, setRolesLoading] = useState(true)
  const [showInvite, setShowInvite] = useState(false)
  const [saving, setSaving] = useState(false)
  const [editingRole, setEditingRole] = useState<string | null>(null)
  const [copiedLink, setCopiedLink] = useState<string | null>(null)
  const [upgradeModal, setUpgradeModal] = useState(false)

  // Asignar clientes modal
  const [assignModal, setAssignModal] = useState<{ member: Member } | null>(null)
  const [allClients, setAllClients] = useState<ClientOption[]>([])
  const [selectedClientIds, setSelectedClientIds] = useState<string[]>([])
  const [assignLoading, setAssignLoading] = useState(false)
  const [assignSaving, setAssignSaving] = useState(false)

  // Form state
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteName, setInviteName] = useState('')
  const [inviteRole, setInviteRole] = useState('trafficker')
  const [inviteResult, setInviteResult] = useState<{ link?: string; error?: string } | null>(null)

  async function fetchMembers() {
    setLoading(true)
    const res = await fetch('/api/team')
    if (res.ok) {
      const j = await res.json()
      setMembers(j.data || [])
    }
    setLoading(false)
  }

  async function fetchRoles() {
    setRolesLoading(true)
    try {
      const res = await fetch('/api/roles')
      if (res.ok) {
        const j = await res.json()
        const invitable = (j.data || []).filter((r: WorkspaceRole) => r.key !== 'owner')
        if (invitable.length > 0) {
          setWorkspaceRoles(invitable)
          setInviteRole(invitable[0]?.key || 'trafficker')
        }
      }
    } catch {
      // Keep fallback roles
    }
    setRolesLoading(false)
  }

  useEffect(() => {
    fetchMembers()
    fetchRoles()
  }, [])

  // Open assign-clients modal
  const openAssignModal = useCallback(async (member: Member) => {
    setAssignModal({ member })
    setAssignLoading(true)
    setSelectedClientIds([])

    // Fetch all clients + existing assignments in parallel
    const [clientsRes, assignedRes] = await Promise.all([
      fetch('/api/clients?limit=200'),
      fetch(`/api/team/assign-clients?member_user_id=${member.user_id}`),
    ])

    const clientsData = await clientsRes.json()
    const assignedData = await assignedRes.json()

    setAllClients(clientsData.data || [])

    // Pre-check the already assigned clients
    const assignedIds = (assignedData.data || []).map(
      (a: { client_id: string }) => a.client_id
    )
    setSelectedClientIds(assignedIds)
    setAssignLoading(false)
  }, [])

  function toggleClientId(id: string) {
    setSelectedClientIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    )
  }

  async function handleAssignSave() {
    if (!assignModal) return
    setAssignSaving(true)
    try {
      await fetch('/api/team/assign-clients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          member_user_id: assignModal.member.user_id,
          client_ids: selectedClientIds,
        }),
      })
      setAssignModal(null)
    } catch {
      // ignore
    }
    setAssignSaving(false)
  }

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setInviteResult(null)
    try {
      const res = await fetch('/api/team', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: inviteEmail, name: inviteName, role: inviteRole }),
      })
      const data = await res.json()
      if (res.ok) {
        setInviteResult({ link: data.inviteLink })
        fetchMembers()
        setInviteEmail('')
        setInviteName('')
      } else {
        if (data.limitReached) {
          setShowInvite(false)
          setUpgradeModal(true)
        } else {
          setInviteResult({ error: data.error })
        }
      }
    } catch {
      setInviteResult({ error: 'Error de conexión' })
    }
    setSaving(false)
  }

  async function handleChangeRole(memberId: string, role: string) {
    await fetch(`/api/team/${memberId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role }),
    })
    setEditingRole(null)
    fetchMembers()
  }

  async function handleRemove(memberId: string, name: string) {
    if (!confirm(`¿Eliminar a ${name} del workspace?`)) return
    await fetch(`/api/team/${memberId}`, { method: 'DELETE' })
    fetchMembers()
  }

  async function copyInviteLink(link: string) {
    await navigator.clipboard.writeText(link)
    setCopiedLink(link)
    setTimeout(() => setCopiedLink(null), 2500)
  }

  function resetInviteForm() {
    setShowInvite(false)
    setInviteResult(null)
    setInviteEmail('')
    setInviteName('')
    setInviteRole(workspaceRoles[0]?.key || 'trafficker')
  }

  const active = members.filter(m => m.status === 'active')
  const pending = members.filter(m => m.status === 'invited')
  const roleCols = workspaceRoles.length <= 2 ? 'grid-cols-2' : workspaceRoles.length <= 4 ? 'grid-cols-2 md:grid-cols-4' : 'grid-cols-2 md:grid-cols-3'
  const activeCount = members.filter(m => m.status === 'active').length
  const atLimit = !isFounder && maxUsers !== Infinity && activeCount >= maxUsers
  const usagePercent = maxUsers !== Infinity ? Math.min((activeCount / maxUsers) * 100, 100) : 0

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Modal upgrade */}
      {upgradeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="h-10 w-10 rounded-full bg-amber-100 flex items-center justify-center">
                <Zap className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900">Límite de equipo alcanzado</h3>
                <p className="text-sm text-slate-500">Tu plan actual permite máximo {maxUsers} miembros</p>
              </div>
            </div>
            <p className="text-sm text-slate-600 mb-6">
              Para agregar más miembros al equipo, actualizá tu plan. Con Agency podés tener hasta 11 personas y con Scale es ilimitado.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setUpgradeModal(false)} className="flex-1 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50">
                Cancelar
              </button>
              <a href="/settings/billing" className="flex-1 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-medium text-white text-center hover:bg-blue-700">
                Ver planes →
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Modal asignar clientes */}
      {assignModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
              <div>
                <h3 className="font-bold text-slate-900">Asignar clientes</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  {assignModal.member.name || assignModal.member.email.split('@')[0]} tendrá acceso a los clientes seleccionados
                </p>
              </div>
              <button onClick={() => setAssignModal(null)} className="text-slate-400 hover:text-slate-600 p-1">
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Client list */}
            <div className="px-5 py-4 max-h-72 overflow-y-auto">
              {assignLoading ? (
                <div className="space-y-2">
                  {[1, 2, 3, 4].map(i => (
                    <div key={i} className="h-10 bg-slate-100 rounded-lg animate-pulse" />
                  ))}
                </div>
              ) : allClients.length === 0 ? (
                <p className="text-sm text-slate-500 text-center py-4">No hay clientes activos</p>
              ) : (
                <div className="space-y-1.5">
                  {allClients.filter(c => c.status !== 'inactive').map(client => {
                    const checked = selectedClientIds.includes(client.id)
                    return (
                      <label
                        key={client.id}
                        className={cn(
                          'flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all',
                          checked
                            ? 'border-blue-300 bg-blue-50'
                            : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
                        )}
                      >
                        <input
                          type="checkbox"
                          className="h-4 w-4 rounded border-slate-300 text-blue-600 accent-blue-600"
                          checked={checked}
                          onChange={() => toggleClientId(client.id)}
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-slate-900 truncate">{client.name}</p>
                          {client.brand && client.brand !== client.name && (
                            <p className="text-xs text-slate-400 truncate">{client.brand}</p>
                          )}
                        </div>
                        {checked && <Check className="h-4 w-4 text-blue-600 flex-shrink-0" />}
                      </label>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-5 py-4 border-t border-slate-100 flex items-center justify-between">
              <p className="text-xs text-slate-500">
                {selectedClientIds.length} cliente{selectedClientIds.length !== 1 ? 's' : ''} seleccionado{selectedClientIds.length !== 1 ? 's' : ''}
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setAssignModal(null)}
                  className="px-4 py-2 rounded-lg border border-slate-200 text-sm text-slate-700 hover:bg-slate-50"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleAssignSave}
                  disabled={assignSaving}
                  className="px-4 py-2 rounded-lg bg-blue-600 text-sm text-white font-medium hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
                >
                  {assignSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                  {assignSaving ? 'Guardando...' : 'Guardar'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Equipo</h1>
          <p className="mt-1 text-sm text-slate-500">
            {active.length} activos · {pending.length} con invitación pendiente
          </p>
        </div>
        <div className="flex items-center gap-3">
          {!isFounder && maxUsers !== Infinity && (
            <div className="flex items-center gap-2">
              <span className={`text-sm font-medium ${atLimit ? 'text-red-600' : 'text-slate-500'}`}>
                {activeCount}/{maxUsers} miembros
              </span>
              <div className="w-20 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${atLimit ? 'bg-red-500' : usagePercent > 75 ? 'bg-amber-500' : 'bg-blue-500'}`}
                  style={{ width: `${usagePercent}%` }}
                />
              </div>
            </div>
          )}
          <button
            onClick={atLimit ? () => setUpgradeModal(true) : () => { setShowInvite(true); setInviteResult(null) }}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium text-white transition-colors shadow-sm ${atLimit ? 'bg-amber-500 hover:bg-amber-600 shadow-amber-500/20' : 'bg-blue-600 hover:bg-blue-700 shadow-blue-600/20'}`}
          >
            {atLimit ? <Zap className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
            {atLimit ? 'Límite alcanzado' : 'Invitar miembro'}
          </button>
        </div>
      </div>

      {/* Invite form */}
      {showInvite && (
        <div className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-sm">
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-slate-50">
            <h3 className="text-sm font-semibold text-slate-900">Invitar nuevo miembro</h3>
            <button type="button" onClick={resetInviteForm} className="text-slate-400 hover:text-slate-600">
              <X className="h-4 w-4" />
            </button>
          </div>

          {inviteResult?.link && (
            <div className="p-5">
              <div className="rounded-xl bg-green-50 border border-green-200 p-4 mb-4">
                <div className="flex items-center gap-2 mb-2">
                  <Check className="h-4 w-4 text-green-600" />
                  <span className="text-sm font-semibold text-green-800">Invitación creada</span>
                </div>
                <p className="text-xs text-green-700 mb-3">
                  Enviamos el email a <strong>{inviteEmail}</strong>. También podés copiar el link de invitación:
                </p>
                <div className="flex items-center gap-2 bg-white rounded-lg border border-green-200 px-3 py-2">
                  <LinkIcon className="h-3.5 w-3.5 text-slate-400 flex-shrink-0" />
                  <span className="text-xs text-slate-600 flex-1 truncate">{inviteResult.link}</span>
                  <button
                    onClick={() => copyInviteLink(inviteResult.link!)}
                    className="flex-shrink-0 text-xs font-medium text-blue-600 hover:text-blue-700 flex items-center gap-1"
                  >
                    {copiedLink === inviteResult.link ? (
                      <><Check className="h-3 w-3" /> Copiado</>
                    ) : (
                      <><Copy className="h-3 w-3" /> Copiar</>
                    )}
                  </button>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => { setInviteResult(null); setInviteEmail(''); setInviteName('') }}
                  className="flex items-center gap-2 text-sm font-medium text-blue-600 hover:text-blue-700"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  Invitar otra persona
                </button>
                <button onClick={resetInviteForm} className="ml-auto text-sm text-slate-500 hover:text-slate-700">
                  Cerrar
                </button>
              </div>
            </div>
          )}

          {inviteResult?.error && (
            <div className="px-5 pt-4">
              <div className="rounded-lg bg-red-50 border border-red-200 p-3">
                <p className="text-sm text-red-700">{inviteResult.error}</p>
              </div>
            </div>
          )}

          {!inviteResult?.link && (
            <form onSubmit={handleInvite} className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Rol del miembro
                </label>
                {rolesLoading ? (
                  <div className="grid grid-cols-3 gap-2">
                    {[1, 2, 3].map(i => (
                      <div key={i} className="h-20 rounded-xl bg-slate-100 animate-pulse" />
                    ))}
                  </div>
                ) : (
                  <div className={cn('grid gap-2', roleCols)}>
                    {workspaceRoles.map((r) => (
                      <button
                        key={r.key}
                        type="button"
                        onClick={() => setInviteRole(r.key)}
                        className={cn(
                          'flex flex-col items-start gap-1 rounded-xl border p-3 text-left transition-all',
                          inviteRole === r.key
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-slate-200 bg-white hover:border-slate-300'
                        )}
                      >
                        <div className="flex items-center gap-1.5">
                          <span className={cn('flex-shrink-0', inviteRole === r.key ? 'text-blue-600' : 'text-slate-400')}>
                            {getRoleIcon(r.base_role)}
                          </span>
                          <span className={cn('text-xs font-bold', inviteRole === r.key ? 'text-blue-700' : 'text-slate-700')}>
                            {r.label}
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-500 leading-tight line-clamp-2">
                          {r.description || `Permisos de ${r.base_role}`}
                        </p>
                        {!r.is_system && (
                          <span className="text-[9px] font-medium text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded-full">
                            Personalizado
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1.5">
                    Email <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    required
                    value={inviteEmail}
                    onChange={e => setInviteEmail(e.target.value)}
                    placeholder="stephany@email.com"
                    className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2.5 text-sm text-slate-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1.5">
                    Nombre (opcional)
                  </label>
                  <input
                    type="text"
                    value={inviteName}
                    onChange={e => setInviteName(e.target.value)}
                    placeholder="Nombre completo"
                    className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2.5 text-sm text-slate-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-colors"
                  />
                </div>
              </div>

              <div className="flex items-center gap-3 pt-1">
                <button
                  type="submit"
                  disabled={saving || !inviteEmail}
                  className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-lg text-sm font-medium disabled:opacity-50 transition-colors"
                >
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
                  {saving ? 'Enviando...' : 'Enviar invitación'}
                </button>
                <button type="button" onClick={resetInviteForm} className="text-sm text-slate-500 hover:text-slate-700">
                  Cancelar
                </button>
              </div>
            </form>
          )}
        </div>
      )}

      {/* Members table */}
      {loading ? (
        <div className="rounded-xl border border-slate-200 bg-white p-6 space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-14 bg-slate-100 rounded-lg animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
          {active.length > 0 && (
            <>
              <div className="px-5 py-3 border-b border-slate-100 bg-slate-50">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  Activos ({active.length})
                </span>
              </div>
              <div className="divide-y divide-slate-100">
                {active.map(m => (
                  <MemberRow
                    key={m.id}
                    member={m}
                    workspaceRoles={workspaceRoles}
                    editingRole={editingRole}
                    onEditRole={setEditingRole}
                    onChangeRole={handleChangeRole}
                    onRemove={handleRemove}
                    onAssignClients={openAssignModal}
                  />
                ))}
              </div>
            </>
          )}

          {pending.length > 0 && (
            <>
              <div className="px-5 py-3 border-t border-b border-slate-100 bg-amber-50">
                <span className="text-xs font-semibold text-amber-700 uppercase tracking-wide">
                  Invitaciones pendientes ({pending.length})
                </span>
              </div>
              <div className="divide-y divide-slate-100">
                {pending.map(m => (
                  <MemberRow
                    key={m.id}
                    member={m}
                    workspaceRoles={workspaceRoles}
                    editingRole={editingRole}
                    onEditRole={setEditingRole}
                    onChangeRole={handleChangeRole}
                    onRemove={handleRemove}
                    onAssignClients={openAssignModal}
                    isPending
                  />
                ))}
              </div>
            </>
          )}

          {members.length === 0 && (
            <div className="py-12 text-center">
              <Users className="h-8 w-8 text-slate-300 mx-auto mb-3" />
              <p className="text-sm text-slate-500">No hay miembros aún</p>
              <p className="text-xs text-slate-400 mt-1">Invitá a tu equipo para empezar</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function MemberRow({
  member: m,
  workspaceRoles,
  editingRole,
  onEditRole,
  onChangeRole,
  onRemove,
  onAssignClients,
  isPending = false,
}: {
  member: Member
  workspaceRoles: WorkspaceRole[]
  editingRole: string | null
  onEditRole: (id: string | null) => void
  onChangeRole: (id: string, role: string) => void
  onRemove: (id: string, name: string) => void
  onAssignClients: (member: Member) => void
  isPending?: boolean
}) {
  const displayName = m.name || m.email.split('@')[0]
  const wsRole = workspaceRoles.find(r => r.key === m.role)
  const canAssign = m.role !== 'owner' && m.user_id

  return (
    <div className={cn('flex items-center gap-3 px-5 py-3.5 hover:bg-slate-50 transition-colors', isPending && 'opacity-75')}>
      <Avatar name={displayName} />

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium text-slate-900 truncate">{displayName}</p>
          {m.role === 'owner' && <Crown className="h-3.5 w-3.5 text-amber-500 flex-shrink-0" />}
        </div>
        <p className="text-xs text-slate-400 truncate">{m.email}</p>
      </div>

      {/* Role badge */}
      <div className="flex-shrink-0">
        {editingRole === m.id ? (
          <select
            defaultValue={m.role}
            onChange={e => onChangeRole(m.id, e.target.value)}
            onBlur={() => onEditRole(null)}
            autoFocus
            className="text-xs border border-blue-300 rounded-lg px-2 py-1.5 bg-white text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            {workspaceRoles.map(r => (
              <option key={r.key} value={r.key}>{r.label}</option>
            ))}
          </select>
        ) : (
          <span className={cn(
            'inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10px] font-semibold gap-1',
            ROLE_COLORS[m.role] || ROLE_COLORS.viewer
          )}>
            {ROLE_ICONS[m.role] && <span className="flex-shrink-0">{ROLE_ICONS[m.role]}</span>}
            {wsRole?.label || ROLE_LABELS[m.role as AppRole] || m.role}
          </span>
        )}
      </div>

      {/* Status */}
      <span className={cn(
        'flex-shrink-0 text-[10px] font-semibold px-2 py-0.5 rounded-full',
        m.status === 'active' ? 'bg-green-50 text-green-700' : 'bg-amber-50 text-amber-700'
      )}>
        {m.status === 'active' ? 'Activo' : 'Pendiente'}
      </span>

      {/* Actions */}
      {m.role !== 'owner' && (
        <div className="flex items-center gap-0.5 flex-shrink-0">
          {/* Asignar clientes */}
          {canAssign && (
            <button
              onClick={() => onAssignClients(m)}
              title="Asignar clientes"
              className="p-1.5 text-slate-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
            >
              <Briefcase className="h-3.5 w-3.5" />
            </button>
          )}
          {/* Cambiar rol */}
          <button
            onClick={() => onEditRole(editingRole === m.id ? null : m.id)}
            title="Cambiar rol"
            className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
          >
            <Shield className="h-3.5 w-3.5" />
          </button>
          {/* Eliminar */}
          <button
            onClick={() => onRemove(m.id, displayName)}
            title="Eliminar del workspace"
            className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      )}
    </div>
  )
}
