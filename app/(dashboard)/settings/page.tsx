'use client'

import { useEffect, useState, useCallback } from 'react'
import { toast } from '@/hooks/use-toast'
import { Avatar } from '@/components/shared/Avatar'
import { PageHeader } from '@/components/shared/PageHeader'
import { PLANS } from '@/lib/plans'
import { cn } from '@/lib/utils'
import {
  Building2, Users, Copy, Check, Plus, Crown, Shield, User as UserIcon,
  Mail, ExternalLink, RefreshCw, Clock, CheckCircle2, Target, Eye, Zap,
  Loader2, Link as LinkIcon
} from 'lucide-react'

interface OrgData {
  id: string
  name: string
  slug: string
  plan: string
  maxUsers: number
  maxClients: number
  ownerId: string
  members: Array<{
    id: string
    role: string
    status: string
    user: {
      id: string
      fullName: string
      email: string
      avatarUrl: string | null
      role: string
      department: string | null
    }
  }>
  _count: { clients: number; tasks: number; reports: number }
}

interface TeamMember {
  id: string
  user_id: string
  email: string
  name: string
  role: string
  status: string
  avatar_url: string | null
  created_at: string
}

interface Invitation {
  id: string
  email: string
  role: string
  token: string
  expiresAt: string
  createdAt: string
}

const ROLE_COLORS: Record<string, string> = {
  owner:      'bg-amber-50 text-amber-700 border-amber-200',
  admin:      'bg-purple-50 text-purple-700 border-purple-200',
  trafficker: 'bg-blue-50 text-blue-700 border-blue-200',
  viewer:     'bg-slate-100 text-slate-600 border-slate-200',
  client:     'bg-green-50 text-green-700 border-green-200',
}

const ROLE_LABELS: Record<string, string> = {
  owner: 'Owner', admin: 'Admin', trafficker: 'Trafficker',
  viewer: 'Viewer', client: 'Cliente',
}

const ROLE_ICONS: Record<string, React.ReactNode> = {
  owner:      <Crown className="h-3.5 w-3.5" />,
  admin:      <Zap className="h-3.5 w-3.5" />,
  trafficker: <Target className="h-3.5 w-3.5" />,
  viewer:     <Eye className="h-3.5 w-3.5" />,
  client:     <UserIcon className="h-3.5 w-3.5" />,
}

const roleIcons = { admin: Crown, trafficker: Shield, client: UserIcon }
const roleColors = {
  admin: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20',
  trafficker: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/20',
  client: 'text-green-400 bg-green-500/10 border-green-500/20',
}

function MemberAvatar({ name }: { name: string }) {
  const colors = ['bg-blue-500', 'bg-purple-500', 'bg-green-500', 'bg-amber-500', 'bg-rose-500', 'bg-cyan-500']
  const color = colors[(name.charCodeAt(0) || 0) % colors.length]
  return (
    <div className={cn('h-9 w-9 rounded-full flex items-center justify-center font-bold text-white text-sm flex-shrink-0', color)}>
      {name[0]?.toUpperCase() || '?'}
    </div>
  )
}

export default function SettingsPage() {
  const [org, setOrg] = useState<OrgData | null>(null)
  const [invitations, setInvitations] = useState<Invitation[]>([])
  const [loading, setLoading] = useState(true)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState<'admin' | 'trafficker' | 'client'>('trafficker')
  const [inviting, setInviting] = useState(false)
  const [copiedToken, setCopiedToken] = useState<string | null>(null)
  const [newInviteUrl, setNewInviteUrl] = useState<string | null>(null)
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([])
  const [teamLoading, setTeamLoading] = useState(true)
  const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date())
  const [refreshing, setRefreshing] = useState(false)

  async function loadOrg() {
    try {
      const orgsRes = await fetch('/api/organizations')
      if (!orgsRes.ok) return
      const { data: orgs } = await orgsRes.json()
      if (!orgs?.length) return

      const orgId = orgs[0].id
      const [orgRes, invRes] = await Promise.all([
        fetch(`/api/organizations/${orgId}`),
        fetch(`/api/organizations/${orgId}/invite`),
      ])
      if (orgRes.ok) setOrg((await orgRes.json()).data)
      if (invRes.ok) setInvitations((await invRes.json()).data || [])
    } finally {
      setLoading(false)
    }
  }

  const loadTeam = useCallback(async (showRefreshing = false) => {
    if (showRefreshing) setRefreshing(true)
    try {
      const res = await fetch('/api/team')
      if (res.ok) {
        const j = await res.json()
        setTeamMembers(j.data || [])
        setLastRefreshed(new Date())
      }
    } finally {
      setTeamLoading(false)
      if (showRefreshing) setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    loadOrg()
    loadTeam()
  }, [loadTeam])

  async function sendInvite(e: React.FormEvent) {
    e.preventDefault()
    if (!org) return
    setInviting(true)
    try {
      const res = await fetch(`/api/organizations/${org.id}/invite`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: inviteEmail, role: inviteRole }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast({ title: 'Error', description: data.error, variant: 'destructive' })
        return
      }
      setNewInviteUrl(data.inviteUrl)
      setInviteEmail('')
      toast({ title: 'Invitación creada', description: 'Compartí el link con el usuario' })
      loadOrg()
    } finally {
      setInviting(false)
    }
  }

  function copyToClipboard(text: string, id: string) {
    navigator.clipboard.writeText(text)
    setCopiedToken(id)
    setTimeout(() => setCopiedToken(null), 2000)
    toast({ title: 'Link copiado al portapapeles' })
  }

  const currentPlan = PLANS.find((p) => p.id === org?.plan) ?? PLANS[0]

  if (loading) {
    return (
      <div className="space-y-6">
        <PageHeader title="Workspace" description="Configuración de tu organización" />
        <div className="h-48 rounded-xl border border-[var(--border-base)] bg-white animate-pulse" />
      </div>
    )
  }

  if (!org) {
    return (
      <div className="space-y-6">
        <PageHeader title="Workspace" description="Configuración de tu organización" />
        <div className="rounded-xl border border-[var(--border-base)] bg-white p-8 text-center">
          <p className="text-[var(--text-muted)]">No se encontró organización. <a href="/onboarding" className="text-indigo-400">Configurar workspace</a></p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Workspace" description="Configuración de tu organización" />

      {/* Org overview */}
      <div className="rounded-xl border border-[var(--border-base)] bg-white p-5">
        <div className="flex items-start gap-4">
          <div className="h-12 w-12 rounded-xl bg-indigo-600/10 border border-indigo-500/20 flex items-center justify-center flex-shrink-0">
            <Building2 className="h-6 w-6 text-indigo-400" />
          </div>
          <div className="flex-1">
            <h2 className="text-lg font-semibold text-slate-900">{org.name}</h2>
            <p className="text-sm text-[var(--text-secondary)]">agencyai.com/{org.slug}</p>
            <div className="flex items-center gap-3 mt-2">
              <span className={cn(
                'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium capitalize',
                org.plan === 'free' ? 'border-[var(--border-base)] text-[var(--text-muted)]' : 'border-indigo-500/30 text-indigo-300 bg-indigo-500/10'
              )}>
                Plan {currentPlan.name}
              </span>
              <span className="text-xs text-[var(--text-secondary)]">
                {org.members?.length ?? teamMembers.length}/{org.maxUsers ?? '∞'} usuarios ·{' '}
                {org._count?.clients ?? 0}/{org.maxClients ?? '∞'} clientes
              </span>
            </div>
          </div>
          <div className="text-right text-sm">
            <p className="text-[var(--text-muted)]">{currentPlan.price === 0 ? 'Gratis' : `$${currentPlan.price}/mes`}</p>
            <a href="#plans" className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors">
              Cambiar plan →
            </a>
          </div>
        </div>
      </div>

      {/* Members — datos reales desde /api/team con auto-refresh */}
      <div className="rounded-xl border border-[var(--border-base)] bg-white overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-blue-500" />
            <h3 className="font-semibold text-slate-900">
              Equipo ({teamMembers.filter(m => m.status === 'active').length}/{org.maxUsers ?? '∞'})
            </h3>
            <span className="text-xs text-slate-400 font-normal">
              · {teamMembers.filter(m => m.status === 'invited').length} pendiente(s)
            </span>
          </div>
          <button
            onClick={() => loadTeam(true)}
            title="Actualizar lista"
            className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-blue-600 transition-colors px-2 py-1 rounded-lg hover:bg-blue-50"
          >
            {refreshing ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <RefreshCw className="h-3.5 w-3.5" />
            )}
            <span className="hidden sm:inline">
              {lastRefreshed.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}
            </span>
          </button>
        </div>

        {teamLoading ? (
          <div className="divide-y divide-slate-100">
            {[1, 2].map(i => <div key={i} className="h-[60px] bg-slate-50 animate-pulse mx-5 my-3 rounded-lg" />)}
          </div>
        ) : teamMembers.length === 0 ? (
          <div className="py-10 text-center">
            <Users className="h-8 w-8 text-slate-200 mx-auto mb-2" />
            <p className="text-sm text-slate-400">No hay miembros aún</p>
          </div>
        ) : (
          <>
            {/* Activos */}
            {teamMembers.filter(m => m.status === 'active').length > 0 && (
              <>
                <div className="px-5 py-2 bg-slate-50 border-b border-slate-100">
                  <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Activos</span>
                </div>
                <div className="divide-y divide-slate-100">
                  {teamMembers.filter(m => m.status === 'active').map(m => {
                    const displayName = m.name && m.name !== m.email.split('@')[0] ? m.name : m.email.split('@')[0]
                    return (
                      <div key={m.id} className="flex items-center gap-3 px-5 py-3.5 hover:bg-slate-50 transition-colors">
                        <MemberAvatar name={displayName} />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-slate-900 truncate">{displayName}</p>
                          <p className="text-xs text-slate-400 truncate">{m.email}</p>
                        </div>
                        <span className={cn(
                          'inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[10px] font-semibold',
                          ROLE_COLORS[m.role] || ROLE_COLORS.viewer
                        )}>
                          {ROLE_ICONS[m.role]}
                          {ROLE_LABELS[m.role] || m.role}
                        </span>
                        <span className="flex items-center gap-1 text-[10px] font-semibold text-green-700 bg-green-50 px-2 py-0.5 rounded-full border border-green-200">
                          <CheckCircle2 className="h-3 w-3" />
                          Activo
                        </span>
                      </div>
                    )
                  })}
                </div>
              </>
            )}

            {/* Pendientes */}
            {teamMembers.filter(m => m.status === 'invited').length > 0 && (
              <>
                <div className="px-5 py-2 bg-amber-50 border-t border-b border-amber-100">
                  <span className="text-[10px] font-semibold text-amber-600 uppercase tracking-wider">Invitación pendiente</span>
                </div>
                <div className="divide-y divide-slate-100">
                  {teamMembers.filter(m => m.status === 'invited').map(m => {
                    const displayName = m.name && m.name !== m.email.split('@')[0] ? m.name : m.email.split('@')[0]
                    const origin = typeof window !== 'undefined' ? window.location.origin : ''
                    const inviteUrl = `${origin}/invite/${m.user_id.replace('invited_', '')}`
                    return (
                      <div key={m.id} className="flex items-center gap-3 px-5 py-3.5 opacity-80 hover:opacity-100 hover:bg-amber-50/40 transition-all">
                        <MemberAvatar name={displayName} />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-slate-900 truncate">{displayName}</p>
                          <p className="text-xs text-slate-400 truncate">{m.email}</p>
                        </div>
                        <span className={cn(
                          'inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[10px] font-semibold',
                          ROLE_COLORS[m.role] || ROLE_COLORS.viewer
                        )}>
                          {ROLE_ICONS[m.role]}
                          {ROLE_LABELS[m.role] || m.role}
                        </span>
                        <span className="flex items-center gap-1 text-[10px] font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                          <Clock className="h-3 w-3" />
                          Pendiente
                        </span>
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(inviteUrl)
                            setCopiedToken(m.id)
                            setTimeout(() => setCopiedToken(null), 2000)
                          }}
                          title="Copiar link de invitación"
                          className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        >
                          {copiedToken === m.id ? <Check className="h-3.5 w-3.5 text-green-500" /> : <LinkIcon className="h-3.5 w-3.5" />}
                        </button>
                      </div>
                    )
                  })}
                </div>
              </>
            )}
          </>
        )}
      </div>

      {/* Invite */}
      {org.members.length < org.maxUsers ? (
        <div className="rounded-xl border border-[var(--border-base)] bg-white p-5">
          <div className="flex items-center gap-2 mb-4">
            <Mail className="h-4 w-4 text-indigo-400" />
            <h3 className="font-semibold text-slate-900">Invitar miembro</h3>
          </div>
          <form onSubmit={sendInvite} className="flex gap-3">
            <input
              type="email"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              required
              placeholder="email@ejemplo.com"
              className="flex-1 rounded-lg border border-[var(--border-base)] bg-slate-100 px-4 py-2.5 text-sm text-slate-900 placeholder-[var(--text-muted)] focus:border-indigo-500 focus:outline-none transition-colors"
            />
            <select
              value={inviteRole}
              onChange={(e) => setInviteRole(e.target.value as 'admin' | 'trafficker' | 'client')}
              className="rounded-lg border border-[var(--border-base)] bg-slate-100 px-3 py-2.5 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none transition-colors"
            >
              <option value="trafficker">Trafficker</option>
              <option value="admin">Admin</option>
              <option value="client">Cliente</option>
            </select>
            <button
              type="submit"
              disabled={inviting}
              className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-50 transition-colors"
            >
              <Plus className="h-4 w-4" />
              {inviting ? 'Invitando...' : 'Invitar'}
            </button>
          </form>

          {newInviteUrl && (
            <div className="mt-3 flex items-center gap-2 rounded-lg border border-green-500/20 bg-green-500/5 px-4 py-2.5">
              <ExternalLink className="h-4 w-4 text-green-400 flex-shrink-0" />
              <p className="text-xs text-slate-700 truncate flex-1">{newInviteUrl}</p>
              <button
                onClick={() => copyToClipboard(newInviteUrl, 'new')}
                className="text-[var(--text-muted)] hover:text-green-400 transition-colors flex-shrink-0"
              >
                {copiedToken === 'new' ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="rounded-xl border border-[var(--border-base)] bg-white p-5 text-center">
          <p className="text-sm text-[var(--text-muted)]">
            Llegaste al límite de usuarios del plan <span className="text-slate-900">{currentPlan.name}</span>.
          </p>
          <a href="#plans" className="text-sm text-indigo-400 hover:text-indigo-300 mt-1 block">
            Actualizar plan para agregar más miembros →
          </a>
        </div>
      )}

      {/* Las invitaciones pendientes ya se muestran integradas en la sección Equipo */}

      {/* Plans */}
      <div id="plans" className="rounded-xl border border-[var(--border-base)] bg-white p-5">
        <div className="flex items-center gap-2 mb-5">
          <Crown className="h-4 w-4 text-yellow-400" />
          <h3 className="font-semibold text-slate-900">Planes disponibles</h3>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {PLANS.map((plan) => (
            <div
              key={plan.id}
              className={cn(
                'rounded-xl border p-4 text-center transition-all',
                plan.id === org.plan
                  ? 'border-indigo-500 bg-indigo-600/5'
                  : 'border-[var(--border-base)] bg-slate-50'
              )}
            >
              <p className="text-sm font-bold text-slate-900 mb-1">{plan.name}</p>
              <p className="text-xs text-[var(--text-secondary)] mb-2">
                {plan.price === 0 ? 'Gratis' : `$${plan.price}/mes`}
              </p>
              <p className="text-[10px] text-[var(--text-secondary)]">
                {plan.maxUsers}u · {plan.maxClients}c
              </p>
              {plan.id === org.plan && (
                <span className="mt-2 inline-block text-[10px] text-indigo-400 font-medium">Plan actual</span>
              )}
            </div>
          ))}
        </div>
        <p className="text-xs text-[var(--text-secondary)] mt-3 text-center">
          Para cambiar de plan, contactanos en soporte@agencyai.com
        </p>
      </div>
    </div>
  )
}
