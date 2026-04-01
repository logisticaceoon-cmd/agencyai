'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import { toast } from '@/hooks/use-toast'
import { ArrowLeft, Plus, X } from 'lucide-react'

interface User {
  id: string
  fullName: string
  department: string | null
}

const defaultChecklistItems = [
  'Cambios documentados en app',
  'Screenshot adjunto como evidencia',
  'Notificó al equipo sobre el cambio',
  'Esperó aprobación del CEO antes de implementar',
  'Documentó el impacto del cambio',
  'CRM actualizado',
  'SOP actualizado si aplica',
]

export default function NewAuditPage() {
  const router = useRouter()
  const { user } = useCurrentUser()
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(false)
  const [checklistItems, setChecklistItems] = useState(defaultChecklistItems)
  const [newItem, setNewItem] = useState('')

  const [form, setForm] = useState({
    title: '',
    processName: '',
    auditedUsers: [] as string[],
    clientId: '',
    auditFrom: '',
    auditTo: '',
  })

  useEffect(() => {
    async function load() {
      const res = await fetch('/api/users')
      if (res.ok) {
        const data = await res.json()
        setUsers(data.data || [])
      }
    }
    load()
  }, [])

  function toggleUser(userId: string) {
    setForm((prev) => ({
      ...prev,
      auditedUsers: prev.auditedUsers.includes(userId)
        ? prev.auditedUsers.filter((id) => id !== userId)
        : [...prev.auditedUsers, userId],
    }))
  }

  function addItem() {
    if (newItem.trim() && !checklistItems.includes(newItem.trim())) {
      setChecklistItems((prev) => [...prev, newItem.trim()])
      setNewItem('')
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (form.auditedUsers.length === 0) {
      toast({ title: 'Seleccioná al menos una persona a auditar', variant: 'destructive' })
      return
    }
    setLoading(true)
    try {
      const res = await fetch('/api/audits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, checklistItems }),
      })
      if (res.ok) {
        const data = await res.json()
        toast({ title: 'Auditoría creada' })
        router.push(`/audits/${data.data.id}`)
      } else {
        toast({ title: 'Error al crear auditoría', variant: 'destructive' })
      }
    } finally {
      setLoading(false)
    }
  }

  if (user && user.role === 'Team') { router.push('/audits'); return null }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/audits" className="text-[var(--text-muted)] hover:text-slate-900"><ArrowLeft className="h-5 w-5" /></Link>
        <h1 className="text-2xl font-bold text-slate-900">Nueva auditoría</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="rounded-xl border border-[var(--border-base)] bg-white p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Título *</label>
            <input required value={form.title} onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))} placeholder="Ej: Auditoría de procesos de cambio — Marzo 2025" className="w-full rounded-lg border border-[var(--border-base)] bg-slate-100 px-4 py-2.5 text-slate-900 placeholder-[var(--text-muted)] focus:border-indigo-500 focus:outline-none" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Proceso a auditar *</label>
            <input required value={form.processName} onChange={(e) => setForm((p) => ({ ...p, processName: e.target.value }))} placeholder="Ej: Gestión de cambios en producción" className="w-full rounded-lg border border-[var(--border-base)] bg-slate-100 px-4 py-2.5 text-slate-900 placeholder-[var(--text-muted)] focus:border-indigo-500 focus:outline-none" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Período desde *</label>
              <input required type="date" value={form.auditFrom} onChange={(e) => setForm((p) => ({ ...p, auditFrom: e.target.value }))} className="w-full rounded-lg border border-[var(--border-base)] bg-slate-100 px-4 py-2.5 text-slate-900 focus:border-indigo-500 focus:outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Período hasta *</label>
              <input required type="date" value={form.auditTo} onChange={(e) => setForm((p) => ({ ...p, auditTo: e.target.value }))} className="w-full rounded-lg border border-[var(--border-base)] bg-slate-100 px-4 py-2.5 text-slate-900 focus:border-indigo-500 focus:outline-none" />
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-[var(--border-base)] bg-white p-6 space-y-3">
          <h2 className="text-sm font-semibold text-[var(--text-muted)] uppercase tracking-wider">Personas a auditar * ({form.auditedUsers.length})</h2>
          <div className="grid grid-cols-2 gap-2">
            {users.map((u) => (
              <button key={u.id} type="button" onClick={() => toggleUser(u.id)} className={`flex items-center gap-3 rounded-lg border p-3 text-left transition-colors ${form.auditedUsers.includes(u.id) ? 'border-indigo-500 bg-indigo-600/10' : 'border-[var(--border-base)] bg-slate-100 hover:border-[var(--border-strong)]'}`}>
                <div className={`h-5 w-5 rounded border flex items-center justify-center flex-shrink-0 ${form.auditedUsers.includes(u.id) ? 'bg-indigo-600 border-indigo-600' : 'border-[var(--border-strong)]'}`}>
                  {form.auditedUsers.includes(u.id) && <svg className="h-3 w-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-900">{u.fullName || (u as unknown as {email?: string}).email || 'Miembro'}</p>
                  {u.department && <p className="text-xs text-[var(--text-secondary)]">{u.department}</p>}
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="rounded-xl border border-[var(--border-base)] bg-white p-6 space-y-3">
          <h2 className="text-sm font-semibold text-[var(--text-muted)] uppercase tracking-wider">Checklist de verificación ({checklistItems.length} ítems)</h2>
          <div className="space-y-2">
            {checklistItems.map((item, i) => (
              <div key={i} className="flex items-center justify-between rounded-lg bg-slate-100 px-4 py-2.5">
                <span className="text-sm text-slate-700">✓ {item}</span>
                <button type="button" onClick={() => setChecklistItems((prev) => prev.filter((_, idx) => idx !== i))} className="text-[var(--text-secondary)] hover:text-red-400 transition-colors"><X className="h-4 w-4" /></button>
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <input value={newItem} onChange={(e) => setNewItem(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addItem())} placeholder="Agregar ítem al checklist..." className="flex-1 rounded-lg border border-[var(--border-base)] bg-slate-100 px-4 py-2 text-sm text-slate-900 placeholder-[var(--text-muted)] focus:border-indigo-500 focus:outline-none" />
            <button type="button" onClick={addItem} className="rounded-lg bg-slate-200 px-4 py-2 text-sm text-slate-900 hover:bg-slate-300 transition-colors"><Plus className="h-4 w-4" /></button>
          </div>
        </div>

        <div className="flex gap-3 justify-end">
          <Link href="/audits" className="rounded-lg border border-[var(--border-base)] px-5 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-100 transition-colors">Cancelar</Link>
          <button type="submit" disabled={loading} className="rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-50 transition-colors">{loading ? 'Creando...' : 'Crear auditoría'}</button>
        </div>
      </form>
    </div>
  )
}
