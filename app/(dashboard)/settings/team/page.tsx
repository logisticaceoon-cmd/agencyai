'use client'

import { useState, useEffect } from 'react'
import { Users, Plus, X, Loader2, Shield, Trash2, Mail } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Member {
  id: string; user_id: string; email: string; name: string; role: string
  status: string; avatar_url: string | null; created_at: string
}

const ROLE_LABELS: Record<string, string> = { owner: 'Owner', admin: 'Admin', member: 'Miembro', viewer: 'Viewer' }
const ROLE_COLORS: Record<string, string> = {
  owner: 'bg-purple-50 text-purple-700 border-purple-200',
  admin: 'bg-blue-50 text-blue-700 border-blue-200',
  member: 'bg-slate-100 text-slate-600 border-slate-200',
  viewer: 'bg-slate-100 text-slate-500 border-slate-200',
}

export default function TeamPage() {
  const [members, setMembers] = useState<Member[]>([])
  const [loading, setLoading] = useState(true)
  const [showInvite, setShowInvite] = useState(false)
  const [saving, setSaving] = useState(false)
  const [editingRole, setEditingRole] = useState<string | null>(null)

  async function fetchMembers() {
    setLoading(true)
    const res = await fetch('/api/team')
    if (res.ok) { const j = await res.json(); setMembers(j.data || []) }
    setLoading(false)
  }

  useEffect(() => { fetchMembers() }, [])

  async function handleInvite(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setSaving(true)
    const fd = new FormData(e.currentTarget)
    const res = await fetch('/api/team', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: fd.get('email'), name: fd.get('name'), role: fd.get('role') }),
    })
    if (res.ok) { setShowInvite(false); fetchMembers() }
    else { const err = await res.json(); alert(err.error) }
    setSaving(false)
  }

  async function handleChangeRole(memberId: string, role: string) {
    await fetch(`/api/team/${memberId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role }),
    })
    setEditingRole(null); fetchMembers()
  }

  async function handleRemove(memberId: string, name: string) {
    if (!confirm(`Eliminar a ${name} del workspace?`)) return
    await fetch(`/api/team/${memberId}`, { method: 'DELETE' })
    fetchMembers()
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Equipo</h1>
          <p className="mt-1 text-sm text-slate-500">Gestion de miembros del workspace</p>
        </div>
        <button onClick={() => setShowInvite(true)} className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-blue-700">
          <Plus className="h-4 w-4" /> Invitar miembro
        </button>
      </div>

      {showInvite && (
        <form onSubmit={handleInvite} className="rounded-xl border border-slate-200 bg-white p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-900">Invitar nuevo miembro</h3>
            <button type="button" onClick={() => setShowInvite(false)}><X className="h-4 w-4 text-slate-400" /></button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div><label className="text-xs text-slate-500 mb-1 block font-medium">Email *</label><input name="email" type="email" required className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2.5 text-sm" placeholder="usuario@email.com" /></div>
            <div><label className="text-xs text-slate-500 mb-1 block font-medium">Nombre</label><input name="name" className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2.5 text-sm" placeholder="Nombre completo" /></div>
            <div><label className="text-xs text-slate-500 mb-1 block font-medium">Rol</label><select name="role" className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2.5 text-sm"><option value="member">Miembro</option><option value="admin">Admin</option><option value="viewer">Viewer</option></select></div>
          </div>
          <button type="submit" disabled={saving} className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-lg text-sm font-medium disabled:opacity-50">
            {saving ? <Loader2 className="h-4 w-4 animate-spin inline mr-2" /> : <Mail className="h-4 w-4 inline mr-2" />} Enviar invitacion
          </button>
        </form>
      )}

      <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
          <span className="text-sm font-semibold text-slate-900">Miembros ({members.length})</span>
        </div>
        {loading ? (
          <div className="p-4 space-y-3">{[1, 2, 3].map(i => <div key={i} className="h-14 bg-slate-100 rounded animate-pulse" />)}</div>
        ) : (
          <table className="w-full">
            <thead><tr className="bg-slate-50 border-b border-slate-200">
              <th className="text-left px-5 py-2.5 text-xs font-semibold text-slate-500 uppercase">Miembro</th>
              <th className="text-left px-5 py-2.5 text-xs font-semibold text-slate-500 uppercase">Rol</th>
              <th className="text-left px-5 py-2.5 text-xs font-semibold text-slate-500 uppercase">Estado</th>
              <th className="text-left px-5 py-2.5 text-xs font-semibold text-slate-500 uppercase">Fecha</th>
              <th className="text-center px-5 py-2.5 text-xs font-semibold text-slate-500 uppercase">Acciones</th>
            </tr></thead>
            <tbody className="divide-y divide-slate-100">
              {members.map(m => (
                <tr key={m.id} className="hover:bg-slate-50">
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center text-xs font-bold text-blue-600">
                        {(m.name || m.email)[0].toUpperCase()}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-slate-900">{m.name || 'Sin nombre'}</p>
                        <p className="text-xs text-slate-400">{m.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-3">
                    {editingRole === m.id ? (
                      <select defaultValue={m.role} onChange={e => handleChangeRole(m.id, e.target.value)} onBlur={() => setEditingRole(null)} autoFocus className="text-xs border border-slate-200 rounded px-2 py-1">
                        <option value="admin">Admin</option>
                        <option value="member">Miembro</option>
                        <option value="viewer">Viewer</option>
                      </select>
                    ) : (
                      <span className={cn('inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold', ROLE_COLORS[m.role] || ROLE_COLORS.member)}>{ROLE_LABELS[m.role] || m.role}</span>
                    )}
                  </td>
                  <td className="px-5 py-3">
                    <span className={cn('inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold',
                      m.status === 'active' ? 'bg-green-50 text-green-700' : 'bg-amber-50 text-amber-700'
                    )}>{m.status === 'active' ? 'Activo' : 'Invitado'}</span>
                  </td>
                  <td className="px-5 py-3 text-xs text-slate-500">{new Date(m.created_at).toLocaleDateString('es-ES')}</td>
                  <td className="px-5 py-3 text-center">
                    {m.role !== 'owner' && (
                      <div className="flex items-center justify-center gap-1">
                        <button onClick={() => setEditingRole(m.id)} className="p-1 text-slate-400 hover:text-blue-600"><Shield className="h-4 w-4" /></button>
                        <button onClick={() => handleRemove(m.id, m.name)} className="p-1 text-slate-400 hover:text-red-600"><Trash2 className="h-4 w-4" /></button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
