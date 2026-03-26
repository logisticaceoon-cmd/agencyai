'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import { toast } from '@/hooks/use-toast'
import { ArrowLeft } from 'lucide-react'

interface User {
  id: string
  fullName: string
  department: string | null
}

interface Client {
  id: string
  name: string
}

export default function NewTaskPage() {
  const router = useRouter()
  const { user } = useCurrentUser()
  const [users, setUsers] = useState<User[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(false)

  const [form, setForm] = useState({
    title: '',
    description: '',
    assignedTo: [] as string[],
    deadline: '',
    clientId: '',
    priority: 'medium',
    estimatedHours: '',
    sopLink: '',
    isRecurring: false,
    recurrencePattern: '',
  })

  useEffect(() => {
    async function load() {
      const [usersRes, clientsRes] = await Promise.all([
        fetch('/api/users'),
        fetch('/api/clients'),
      ])
      if (usersRes.ok) {
        const data = await usersRes.json()
        setUsers(data.data || [])
      }
      if (clientsRes.ok) {
        const data = await clientsRes.json()
        setClients(data.data || [])
      }
    }
    load()
  }, [])

  function toggleAssignee(userId: string) {
    setForm((prev) => ({
      ...prev,
      assignedTo: prev.assignedTo.includes(userId)
        ? prev.assignedTo.filter((id) => id !== userId)
        : [...prev.assignedTo, userId],
    }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (form.assignedTo.length === 0) {
      toast({ title: 'Seleccioná al menos un asignado', variant: 'destructive' })
      return
    }
    setLoading(true)
    try {
      const res = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          estimatedHours: form.estimatedHours ? parseInt(form.estimatedHours) : undefined,
          clientId: form.clientId || undefined,
          deadline: form.deadline || undefined,
        }),
      })
      if (res.ok) {
        toast({ title: 'Tarea creada exitosamente' })
        router.push('/tasks')
      } else {
        const err = await res.json()
        toast({ title: 'Error al crear tarea', description: JSON.stringify(err.error), variant: 'destructive' })
      }
    } finally {
      setLoading(false)
    }
  }

  if (user && user.role === 'Team') {
    router.push('/tasks')
    return null
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/tasks" className="text-zinc-400 hover:text-white transition-colors">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-2xl font-bold text-white">Nueva tarea</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-6 space-y-4">
          <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider">Información básica</h2>

          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-1.5">Título *</label>
            <input
              type="text"
              required
              value={form.title}
              onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
              placeholder="Ej: Crear campaña de email para cliente X"
              className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2.5 text-white placeholder-zinc-500 focus:border-indigo-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-1.5">Descripción</label>
            <textarea
              rows={4}
              value={form.description}
              onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
              placeholder="Detalles de la tarea, contexto, entregables esperados..."
              className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2.5 text-white placeholder-zinc-500 focus:border-indigo-500 focus:outline-none resize-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-1.5">Prioridad</label>
              <select
                value={form.priority}
                onChange={(e) => setForm((p) => ({ ...p, priority: e.target.value }))}
                className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2.5 text-white focus:border-indigo-500 focus:outline-none"
              >
                <option value="low">🟢 Baja</option>
                <option value="medium">🟠 Media</option>
                <option value="high">🟡 Alta</option>
                <option value="critical">🔴 Crítica</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-1.5">Deadline</label>
              <input
                type="datetime-local"
                value={form.deadline}
                onChange={(e) => setForm((p) => ({ ...p, deadline: e.target.value }))}
                className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2.5 text-white focus:border-indigo-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-1.5">Cliente (opcional)</label>
              <select
                value={form.clientId}
                onChange={(e) => setForm((p) => ({ ...p, clientId: e.target.value }))}
                className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2.5 text-white focus:border-indigo-500 focus:outline-none"
              >
                <option value="">Sin cliente</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-1.5">Horas estimadas</label>
              <input
                type="number"
                min="1"
                value={form.estimatedHours}
                onChange={(e) => setForm((p) => ({ ...p, estimatedHours: e.target.value }))}
                placeholder="e.g. 4"
                className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2.5 text-white placeholder-zinc-500 focus:border-indigo-500 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-1.5">Link al SOP (opcional)</label>
            <input
              type="url"
              value={form.sopLink}
              onChange={(e) => setForm((p) => ({ ...p, sopLink: e.target.value }))}
              placeholder="https://..."
              className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2.5 text-white placeholder-zinc-500 focus:border-indigo-500 focus:outline-none"
            />
          </div>
        </div>

        <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-6 space-y-4">
          <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider">
            Asignar a * ({form.assignedTo.length} seleccionados)
          </h2>
          <div className="grid grid-cols-2 gap-2">
            {users.map((u) => (
              <button
                key={u.id}
                type="button"
                onClick={() => toggleAssignee(u.id)}
                className={`flex items-center gap-3 rounded-lg border p-3 text-left transition-colors ${
                  form.assignedTo.includes(u.id)
                    ? 'border-indigo-500 bg-indigo-600/10 text-white'
                    : 'border-zinc-700 bg-zinc-800 text-zinc-400 hover:border-zinc-600'
                }`}
              >
                <div className={`h-5 w-5 rounded border flex items-center justify-center ${
                  form.assignedTo.includes(u.id) ? 'bg-indigo-600 border-indigo-600' : 'border-zinc-600'
                }`}>
                  {form.assignedTo.includes(u.id) && (
                    <svg className="h-3 w-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </div>
                <div>
                  <p className="text-sm font-medium text-white">{u.fullName}</p>
                  {u.department && <p className="text-xs text-zinc-500">{u.department}</p>}
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="flex gap-3 justify-end">
          <Link
            href="/tasks"
            className="rounded-lg border border-zinc-700 px-5 py-2.5 text-sm font-medium text-zinc-300 hover:bg-zinc-800 transition-colors"
          >
            Cancelar
          </Link>
          <button
            type="submit"
            disabled={loading}
            className="rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? 'Creando...' : 'Crear tarea'}
          </button>
        </div>
      </form>
    </div>
  )
}
