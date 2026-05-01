'use client'

import { useState, useEffect } from 'react'
import { Users, Plus, X, Loader2, Shield, Trash2, Mail, Copy, Check, Link as LinkIcon, RefreshCw, Crown, Zap, Target, Eye } from 'lucide-react'
import { cn } from '@/lib/utils'
import { ROLE_LABELS, ROLE_DESCRIPTIONS, type AppRole } from '@/lib/roles'

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

const INVITE_ROLES: AppRole[] = ['admin', 'trafficker', 'viewer']

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
  const [members, setMembers] = useState<Member[]>([])
  const [loading, setLoading] = useState(true)
  const [showInvite, setShowInvite] = useState(false)
  const [saving, setSaving] = useState(false)
  const [editingRole, setEditingRole] = useState<string | null>(null)
  const [copiedLink, setCopiedLink] = useState<string | null>(null)

  // Form state
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteName, setInviteName] = useState('')
  const [inviteRole, setInviteRole] = useState<AppRole>('trafficker')
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

  useEffect(() => { fetchMembers() }, [])

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
        setInviteResult({ error: data.error })
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
    setInviteRole('trafficker')
  }

  const active = members.filter(m => m.status === 'active')
  const pending = members.filter(m => m.status === 'invited')

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Equipo</h1>
          <p className="mt-1 text-sm text-slate-500">
            {active.length} activos · {pending.length} con invitación pendiente
          </p>
        </div>
        <button
          onClick={() => { setShowInvite(true); setInviteResult(null) }}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors shadow-sm shadow-blue-600/20"
        >
          <Plus className="h-4 w-4" />
          Invitar miembro
        </button>
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

          {/* Resultado de invitación exitosa */}
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

          {/* Error */}
          {inviteResult?.error && (
            <div className="px-5 pt-4">
              <div className="rounded-lg bg-red-50 border border-red-200 p-3">
                <p className="text-sm text-red-700">{inviteResult.error}</p>
              </div>
            </div>
          )}

          {/* Form (hidden after success) */}
          {!inviteResult?.link && (
            <form onSubmit={handleInvite} className="p-5 space-y-4">
              {/* Role selector first — lo más importante */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Rol del miembro
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {INVITE_ROLES.map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setInviteRole(r)}
                      className={cn(
                        'flex flex-col items-start gap-1 rounded-xl border p-3 text-left transition-all',
                        inviteRole === r
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-slate-200 bg-white hover:border-slate-300'
                      )}
                    >
                      <div className="flex items-center gap-1.5">
                        <span className={cn('flex-shrink-0', inviteRole === r ? 'text-blue-600' : 'text-slate-400')}>{ROLE_ICONS[r]}</span>
                        <span className={cn(
                          'text-xs font-bold',
                          inviteRole === r ? 'text-blue-700' : 'text-slate-700'
                        )}>
                          {ROLE_LABELS[r]}
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-500 leading-tight line-clamp-2">
                        {ROLE_DESCRIPTIONS[r]}
                      </p>
                    </button>
                  ))}
                </div>
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
          {/* Active members */}
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
                    editingRole={editingRole}
                    onEditRole={setEditingRole}
                    onChangeRole={handleChangeRole}
                    onRemove={handleRemove}
                  />
                ))}
              </div>
            </>
          )}

          {/* Pending invitations */}
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
                    editingRole={editingRole}
                    onEditRole={setEditingRole}
                    onChangeRole={handleChangeRole}
                    onRemove={handleRemove}
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
  editingRole,
  onEditRole,
  onChangeRole,
  onRemove,
  isPending = false,
}: {
  member: Member
  editingRole: string | null
  onEditRole: (id: string | null) => void
  onChangeRole: (id: string, role: string) => void
  onRemove: (id: string, name: string) => void
  isPending?: boolean
}) {
  const displayName = m.name || m.email.split('@')[0]

  return (
    <div className={cn('flex items-center gap-3 px-5 py-3.5 hover:bg-slate-50 transition-colors', isPending && 'opacity-75')}>
      {/* Avatar */}
      <Avatar name={displayName} />

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium text-slate-900 truncate">{displayName}</p>
          {m.role === 'owner' && <Crown className="h-3.5 w-3.5 text-amber-500 flex-shrink-0" />}
        </div>
        <p className="text-xs text-slate-400 truncate">{m.email}</p>
      </div>

      {/* Role */}
      <div className="flex-shrink-0">
        {editingRole === m.id ? (
          <select
            defaultValue={m.role}
            onChange={e => onChangeRole(m.id, e.target.value)}
            onBlur={() => onEditRole(null)}
            autoFocus
            className="text-xs border border-blue-300 rounded-lg px-2 py-1.5 bg-white text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="admin">Admin</option>
            <option value="trafficker">Trafficker</option>
            <option value="viewer">Viewer</option>
          </select>
        ) : (
          <span className={cn(
            'inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10px] font-semibold gap-1',
            ROLE_COLORS[m.role] || ROLE_COLORS.viewer
          )}>
            {ROLE_ICONS[m.role] && <span className="flex-shrink-0">{ROLE_ICONS[m.role]}</span>}
            {ROLE_LABELS[m.role as AppRole] || m.role}
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
          <button
            onClick={() => onEditRole(editingRole === m.id ? null : m.id)}
            title="Cambiar rol"
            className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
          >
            <Shield className="h-3.5 w-3.5" />
          </button>
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
