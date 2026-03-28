'use client'

import { useEffect, useState } from 'react'
import { toast } from '@/hooks/use-toast'
import { Avatar } from '@/components/shared/Avatar'
import { PageHeader } from '@/components/shared/PageHeader'
import { PLANS } from '@/lib/plans'
import { cn } from '@/lib/utils'
import {
  Building2, Users, Copy, Check, Plus, Crown, Shield, User as UserIcon,
  Mail, ExternalLink, RefreshCw
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

interface Invitation {
  id: string
  email: string
  role: string
  token: string
  expiresAt: string
  createdAt: string
}

const roleIcons = { admin: Crown, trafficker: Shield, client: UserIcon }
const roleColors = {
  admin: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20',
  trafficker: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/20',
  client: 'text-green-400 bg-green-500/10 border-green-500/20',
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

  useEffect(() => { loadOrg() }, [])

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
        <div className="h-48 rounded-xl border border-zinc-800 bg-zinc-900 animate-pulse" />
      </div>
    )
  }

  if (!org) {
    return (
      <div className="space-y-6">
        <PageHeader title="Workspace" description="Configuración de tu organización" />
        <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-8 text-center">
          <p className="text-zinc-400">No se encontró organización. <a href="/onboarding" className="text-indigo-400">Configurar workspace</a></p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Workspace" description="Configuración de tu organización" />

      {/* Org overview */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
        <div className="flex items-start gap-4">
          <div className="h-12 w-12 rounded-xl bg-indigo-600/10 border border-indigo-500/20 flex items-center justify-center flex-shrink-0">
            <Building2 className="h-6 w-6 text-indigo-400" />
          </div>
          <div className="flex-1">
            <h2 className="text-lg font-semibold text-white">{org.name}</h2>
            <p className="text-sm text-zinc-500">agencyai.com/{org.slug}</p>
            <div className="flex items-center gap-3 mt-2">
              <span className={cn(
                'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium capitalize',
                org.plan === 'free' ? 'border-zinc-700 text-zinc-400' : 'border-indigo-500/30 text-indigo-300 bg-indigo-500/10'
              )}>
                Plan {currentPlan.name}
              </span>
              <span className="text-xs text-zinc-500">
                {org.members.length}/{org.maxUsers} usuarios ·{' '}
                {org._count.clients}/{org.maxClients} clientes
              </span>
            </div>
          </div>
          <div className="text-right text-sm">
            <p className="text-zinc-400">{currentPlan.price === 0 ? 'Gratis' : `$${currentPlan.price}/mes`}</p>
            <a href="#plans" className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors">
              Cambiar plan →
            </a>
          </div>
        </div>
      </div>

      {/* Members */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-900 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-indigo-400" />
            <h3 className="font-semibold text-white">Equipo ({org.members.length}/{org.maxUsers})</h3>
          </div>
        </div>
        <div className="divide-y divide-zinc-800">
          {org.members.map((member) => {
            const RoleIcon = roleIcons[member.role as keyof typeof roleIcons] ?? UserIcon
            const roleColor = roleColors[member.role as keyof typeof roleColors] ?? ''
            const isOwner = member.user.id === org.ownerId
            return (
              <div key={member.id} className="flex items-center gap-4 px-5 py-3">
                <Avatar name={member.user?.fullName || 'Miembro'} avatarUrl={member.user?.avatarUrl} size="sm" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-white">{member.user?.fullName || 'Miembro'}</p>
                    {isOwner && <span className="text-[10px] text-yellow-400 bg-yellow-500/10 border border-yellow-500/20 px-1.5 py-0.5 rounded-full">Owner</span>}
                  </div>
                  <p className="text-xs text-zinc-500">{member.user.email}</p>
                </div>
                <span className={cn('flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium capitalize', roleColor)}>
                  <RoleIcon className="h-3 w-3" />
                  {member.role}
                </span>
              </div>
            )
          })}
        </div>
      </div>

      {/* Invite */}
      {org.members.length < org.maxUsers ? (
        <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
          <div className="flex items-center gap-2 mb-4">
            <Mail className="h-4 w-4 text-indigo-400" />
            <h3 className="font-semibold text-white">Invitar miembro</h3>
          </div>
          <form onSubmit={sendInvite} className="flex gap-3">
            <input
              type="email"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              required
              placeholder="email@ejemplo.com"
              className="flex-1 rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2.5 text-sm text-white placeholder-zinc-500 focus:border-indigo-500 focus:outline-none transition-colors"
            />
            <select
              value={inviteRole}
              onChange={(e) => setInviteRole(e.target.value as 'admin' | 'trafficker' | 'client')}
              className="rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2.5 text-sm text-white focus:border-indigo-500 focus:outline-none transition-colors"
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
              <p className="text-xs text-zinc-300 truncate flex-1">{newInviteUrl}</p>
              <button
                onClick={() => copyToClipboard(newInviteUrl, 'new')}
                className="text-zinc-400 hover:text-green-400 transition-colors flex-shrink-0"
              >
                {copiedToken === 'new' ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="rounded-xl border border-zinc-700 bg-zinc-900 p-5 text-center">
          <p className="text-sm text-zinc-400">
            Llegaste al límite de usuarios del plan <span className="text-white">{currentPlan.name}</span>.
          </p>
          <a href="#plans" className="text-sm text-indigo-400 hover:text-indigo-300 mt-1 block">
            Actualizar plan para agregar más miembros →
          </a>
        </div>
      )}

      {/* Pending invitations */}
      {invitations.length > 0 && (
        <div className="rounded-xl border border-zinc-800 bg-zinc-900 overflow-hidden">
          <div className="flex items-center gap-2 px-5 py-4 border-b border-zinc-800">
            <RefreshCw className="h-4 w-4 text-yellow-400" />
            <h3 className="font-semibold text-white">Invitaciones pendientes ({invitations.length})</h3>
          </div>
          <div className="divide-y divide-zinc-800">
            {invitations.map((inv) => {
              const inviteUrl = `${process.env.NEXT_PUBLIC_APP_URL || ''}/invite/${inv.token}`
              return (
                <div key={inv.id} className="flex items-center gap-4 px-5 py-3">
                  <div className="flex-1">
                    <p className="text-sm text-white">{inv.email}</p>
                    <p className="text-xs text-zinc-500 capitalize">{inv.role}</p>
                  </div>
                  <button
                    onClick={() => copyToClipboard(inviteUrl, inv.id)}
                    className="flex items-center gap-1.5 rounded-lg border border-zinc-700 px-3 py-1.5 text-xs text-zinc-400 hover:bg-zinc-800 transition-colors"
                  >
                    {copiedToken === inv.id ? (
                      <><Check className="h-3.5 w-3.5 text-green-400" /> Copiado</>
                    ) : (
                      <><Copy className="h-3.5 w-3.5" /> Copiar link</>
                    )}
                  </button>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Plans */}
      <div id="plans" className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
        <div className="flex items-center gap-2 mb-5">
          <Crown className="h-4 w-4 text-yellow-400" />
          <h3 className="font-semibold text-white">Planes disponibles</h3>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {PLANS.map((plan) => (
            <div
              key={plan.id}
              className={cn(
                'rounded-xl border p-4 text-center transition-all',
                plan.id === org.plan
                  ? 'border-indigo-500 bg-indigo-600/5'
                  : 'border-zinc-800 bg-zinc-900/50'
              )}
            >
              <p className="text-sm font-bold text-white mb-1">{plan.name}</p>
              <p className="text-xs text-zinc-500 mb-2">
                {plan.price === 0 ? 'Gratis' : `$${plan.price}/mes`}
              </p>
              <p className="text-[10px] text-zinc-600">
                {plan.maxUsers}u · {plan.maxClients}c
              </p>
              {plan.id === org.plan && (
                <span className="mt-2 inline-block text-[10px] text-indigo-400 font-medium">Plan actual</span>
              )}
            </div>
          ))}
        </div>
        <p className="text-xs text-zinc-600 mt-3 text-center">
          Para cambiar de plan, contactanos en soporte@agencyai.com
        </p>
      </div>
    </div>
  )
}
