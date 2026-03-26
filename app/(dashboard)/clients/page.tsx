'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { PageHeader } from '@/components/shared/PageHeader'
import { TableSkeleton } from '@/components/shared/LoadingSkeleton'
import { EmptyState } from '@/components/shared/EmptyState'
import { Users, Plus } from 'lucide-react'

interface Client {
  id: string
  name: string
  email: string | null
  industry: string | null
  status: string
  monthlyBudget: string | null
  accountManager: { id: string; fullName: string } | null
  _count: { tasks: number; reports: number }
}

export default function ClientsPage() {
  const { user } = useCurrentUser()
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('')
  const [showNewForm, setShowNewForm] = useState(false)
  const [newClient, setNewClient] = useState({ name: '', email: '', industry: '', monthlyBudget: '' })
  const [creating, setCreating] = useState(false)

  const isCEO = user?.role === 'CEO' || user?.role === 'Manager'

  async function loadClients() {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (statusFilter) params.set('status', statusFilter)
      const res = await fetch(`/api/clients?${params}`)
      if (res.ok) {
        const data = await res.json()
        setClients(data.data || [])
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadClients() }, [statusFilter])

  async function createClient(e: React.FormEvent) {
    e.preventDefault()
    setCreating(true)
    try {
      const res = await fetch('/api/clients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...newClient,
          monthlyBudget: newClient.monthlyBudget ? parseFloat(newClient.monthlyBudget) : undefined,
        }),
      })
      if (res.ok) {
        setShowNewForm(false)
        setNewClient({ name: '', email: '', industry: '', monthlyBudget: '' })
        loadClients()
      }
    } finally {
      setCreating(false)
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Clientes"
        description="Gestión de clientes de la agencia"
        action={
          isCEO ? (
            <button
              onClick={() => setShowNewForm(!showNewForm)}
              className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500 transition-colors"
            >
              <Plus className="h-4 w-4" />
              Nuevo cliente
            </button>
          ) : null
        }
      />

      {showNewForm && isCEO && (
        <div className="rounded-xl border border-indigo-500/30 bg-indigo-600/5 p-5">
          <h3 className="text-sm font-semibold text-white mb-4">Nuevo cliente</h3>
          <form onSubmit={createClient} className="grid grid-cols-2 gap-4">
            <div className="col-span-2 md:col-span-1">
              <label className="block text-xs text-zinc-400 mb-1">Nombre *</label>
              <input required value={newClient.name} onChange={(e) => setNewClient((p) => ({ ...p, name: e.target.value }))} className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2 text-sm text-white focus:border-indigo-500 focus:outline-none" />
            </div>
            <div>
              <label className="block text-xs text-zinc-400 mb-1">Email</label>
              <input type="email" value={newClient.email} onChange={(e) => setNewClient((p) => ({ ...p, email: e.target.value }))} className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2 text-sm text-white focus:border-indigo-500 focus:outline-none" />
            </div>
            <div>
              <label className="block text-xs text-zinc-400 mb-1">Industria</label>
              <input value={newClient.industry} onChange={(e) => setNewClient((p) => ({ ...p, industry: e.target.value }))} className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2 text-sm text-white focus:border-indigo-500 focus:outline-none" />
            </div>
            <div>
              <label className="block text-xs text-zinc-400 mb-1">Presupuesto mensual (USD)</label>
              <input type="number" value={newClient.monthlyBudget} onChange={(e) => setNewClient((p) => ({ ...p, monthlyBudget: e.target.value }))} className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2 text-sm text-white focus:border-indigo-500 focus:outline-none" />
            </div>
            <div className="col-span-2 flex gap-2 justify-end">
              <button type="button" onClick={() => setShowNewForm(false)} className="rounded-lg border border-zinc-700 px-4 py-2 text-sm text-zinc-400 hover:bg-zinc-800 transition-colors">Cancelar</button>
              <button type="submit" disabled={creating} className="rounded-lg bg-indigo-600 px-4 py-2 text-sm text-white hover:bg-indigo-500 disabled:opacity-50 transition-colors">{creating ? 'Creando...' : 'Crear cliente'}</button>
            </div>
          </form>
        </div>
      )}

      <div className="flex gap-3">
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-white focus:border-indigo-500 focus:outline-none">
          <option value="">Todos</option>
          <option value="active">Activos</option>
          <option value="paused">Pausados</option>
          <option value="inactive">Inactivos</option>
        </select>
      </div>

      {loading ? (
        <TableSkeleton rows={5} />
      ) : clients.length === 0 ? (
        <EmptyState icon={Users} title="No hay clientes" description="Agregá el primer cliente de la agencia" />
      ) : (
        <div className="rounded-xl border border-zinc-800 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-zinc-800 bg-zinc-900/50">
                <th className="text-left text-xs font-medium text-zinc-500 px-4 py-3 uppercase tracking-wider">Cliente</th>
                <th className="text-left text-xs font-medium text-zinc-500 px-4 py-3 uppercase tracking-wider">Industria</th>
                <th className="text-left text-xs font-medium text-zinc-500 px-4 py-3 uppercase tracking-wider">Status</th>
                <th className="text-left text-xs font-medium text-zinc-500 px-4 py-3 uppercase tracking-wider">AM</th>
                <th className="text-left text-xs font-medium text-zinc-500 px-4 py-3 uppercase tracking-wider">Presupuesto</th>
                <th className="text-left text-xs font-medium text-zinc-500 px-4 py-3 uppercase tracking-wider">Tareas / Rep.</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800 bg-zinc-900">
              {clients.map((client) => (
                <tr key={client.id} className="hover:bg-zinc-800/50 transition-colors">
                  <td className="px-4 py-3">
                    <Link href={`/clients/${client.id}`} className="font-medium text-white hover:text-indigo-300 transition-colors">
                      {client.name}
                    </Link>
                    {client.email && <p className="text-xs text-zinc-500">{client.email}</p>}
                  </td>
                  <td className="px-4 py-3 text-sm text-zinc-400">{client.industry || '—'}</td>
                  <td className="px-4 py-3"><StatusBadge status={client.status} /></td>
                  <td className="px-4 py-3 text-sm text-zinc-400">{client.accountManager?.fullName || '—'}</td>
                  <td className="px-4 py-3 text-sm text-zinc-300">{client.monthlyBudget ? `$${Number(client.monthlyBudget).toLocaleString()}` : '—'}</td>
                  <td className="px-4 py-3 text-sm text-zinc-400">{client._count.tasks} / {client._count.reports}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
