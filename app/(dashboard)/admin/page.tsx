'use client'

import { useEffect, useState } from 'react'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import { useRouter } from 'next/navigation'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { Avatar } from '@/components/shared/Avatar'
import { PageHeader } from '@/components/shared/PageHeader'
import { TableSkeleton } from '@/components/shared/LoadingSkeleton'
import { toast } from '@/hooks/use-toast'
import { formatDateTime } from '@/lib/utils'
import { Users, Activity } from 'lucide-react'

interface User {
  id: string
  email: string
  fullName: string
  role: string
  department: string | null
  status: string
  isFreelancer: boolean
  createdAt: string
  lastLogin: string | null
}

export default function AdminPage() {
  const { user } = useCurrentUser()
  const router = useRouter()
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'users' | 'activity'>('users')
  const [showNewUser, setShowNewUser] = useState(false)
  const [newUser, setNewUser] = useState({ email: '', fullName: '', role: 'Team', department: '', isFreelancer: false })

  useEffect(() => {
    if (user && user.role === 'Team') {
      router.push('/')
    }
  }, [user, router])

  async function loadUsers() {
    setLoading(true)
    try {
      const res = await fetch('/api/users')
      if (res.ok) {
        const data = await res.json()
        setUsers(data.data || [])
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadUsers() }, [])

  async function updateUserStatus(id: string, status: 'active' | 'inactive') {
    const res = await fetch(`/api/users/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    })
    if (res.ok) {
      toast({ title: `Usuario ${status === 'active' ? 'activado' : 'desactivado'}` })
      loadUsers()
    }
  }

  async function updateUserRole(id: string, role: string) {
    const res = await fetch(`/api/users/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role }),
    })
    if (res.ok) {
      toast({ title: 'Rol actualizado' })
      loadUsers()
    }
  }

  if (!user || user.role === 'Team') return null

  return (
    <div className="space-y-6">
      <PageHeader title="Administración" description="Gestión de usuarios y configuración del sistema" />

      <div className="flex border-b border-zinc-800">
        <button onClick={() => setTab('users')} className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium transition-colors ${tab === 'users' ? 'border-b-2 border-indigo-500 text-white' : 'text-zinc-500 hover:text-zinc-300'}`}>
          <Users className="h-4 w-4" /> Usuarios
        </button>
        <button onClick={() => setTab('activity')} className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium transition-colors ${tab === 'activity' ? 'border-b-2 border-indigo-500 text-white' : 'text-zinc-500 hover:text-zinc-300'}`}>
          <Activity className="h-4 w-4" /> Actividad
        </button>
      </div>

      {tab === 'users' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button onClick={() => setShowNewUser(!showNewUser)} className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500 transition-colors">
              + Agregar usuario
            </button>
          </div>

          {showNewUser && (
            <div className="rounded-xl border border-indigo-500/30 bg-indigo-600/5 p-5 space-y-4">
              <h3 className="text-sm font-semibold text-white">Nuevo usuario</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-zinc-400 mb-1">Email *</label>
                  <input type="email" value={newUser.email} onChange={(e) => setNewUser((p) => ({ ...p, email: e.target.value }))} className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2 text-sm text-white focus:border-indigo-500 focus:outline-none" />
                </div>
                <div>
                  <label className="block text-xs text-zinc-400 mb-1">Nombre completo *</label>
                  <input value={newUser.fullName} onChange={(e) => setNewUser((p) => ({ ...p, fullName: e.target.value }))} className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2 text-sm text-white focus:border-indigo-500 focus:outline-none" />
                </div>
                <div>
                  <label className="block text-xs text-zinc-400 mb-1">Rol</label>
                  <select value={newUser.role} onChange={(e) => setNewUser((p) => ({ ...p, role: e.target.value }))} className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2 text-sm text-white focus:border-indigo-500 focus:outline-none">
                    <option value="Team">Team</option>
                    <option value="Manager">Manager</option>
                    {user.role === 'CEO' && <option value="CEO">CEO</option>}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-zinc-400 mb-1">Departamento</label>
                  <input value={newUser.department} onChange={(e) => setNewUser((p) => ({ ...p, department: e.target.value }))} placeholder="Ads, Diseño, Contenido..." className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2 text-sm text-white placeholder-zinc-500 focus:border-indigo-500 focus:outline-none" />
                </div>
              </div>
              <p className="text-xs text-zinc-500">El usuario debe registrarse manualmente en /register con este email.</p>
              <div className="flex gap-2 justify-end">
                <button onClick={() => setShowNewUser(false)} className="rounded-lg border border-zinc-700 px-4 py-2 text-sm text-zinc-400 hover:bg-zinc-800 transition-colors">Cancelar</button>
              </div>
            </div>
          )}

          {loading ? <TableSkeleton rows={6} /> : (
            <div className="rounded-xl border border-zinc-800 overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-zinc-800 bg-zinc-900/50">
                    <th className="text-left text-xs font-medium text-zinc-500 px-4 py-3 uppercase tracking-wider">Usuario</th>
                    <th className="text-left text-xs font-medium text-zinc-500 px-4 py-3 uppercase tracking-wider">Rol</th>
                    <th className="text-left text-xs font-medium text-zinc-500 px-4 py-3 uppercase tracking-wider">Departamento</th>
                    <th className="text-left text-xs font-medium text-zinc-500 px-4 py-3 uppercase tracking-wider">Estado</th>
                    <th className="text-left text-xs font-medium text-zinc-500 px-4 py-3 uppercase tracking-wider">Último login</th>
                    <th className="text-left text-xs font-medium text-zinc-500 px-4 py-3 uppercase tracking-wider">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800 bg-zinc-900">
                  {users.map((u) => (
                    <tr key={u.id} className="hover:bg-zinc-800/50 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <Avatar name={u.fullName} size="sm" />
                          <div>
                            <p className="text-sm font-medium text-white">{u.fullName}</p>
                            <p className="text-xs text-zinc-500">{u.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {user.role === 'CEO' ? (
                          <select value={u.role} onChange={(e) => updateUserRole(u.id, e.target.value)} className="rounded-lg border border-zinc-700 bg-zinc-800 px-2 py-1 text-xs text-white focus:border-indigo-500 focus:outline-none">
                            <option value="Team">Team</option>
                            <option value="Manager">Manager</option>
                            <option value="CEO">CEO</option>
                          </select>
                        ) : (
                          <StatusBadge status={u.role} />
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-zinc-400">{u.department || '—'}</td>
                      <td className="px-4 py-3"><StatusBadge status={u.status} /></td>
                      <td className="px-4 py-3 text-xs text-zinc-500">{u.lastLogin ? formatDateTime(u.lastLogin) : 'Nunca'}</td>
                      <td className="px-4 py-3">
                        {u.id !== user.id && (
                          <button
                            onClick={() => updateUserStatus(u.id, u.status === 'active' ? 'inactive' : 'active')}
                            className={`text-xs rounded-lg border px-3 py-1 transition-colors ${u.status === 'active' ? 'border-red-500/30 text-red-400 hover:bg-red-500/10' : 'border-green-500/30 text-green-400 hover:bg-green-500/10'}`}
                          >
                            {u.status === 'active' ? 'Desactivar' : 'Activar'}
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {tab === 'activity' && (
        <div className="text-center py-16 text-zinc-500">
          <Activity className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>Log de actividad disponible próximamente</p>
        </div>
      )}
    </div>
  )
}
