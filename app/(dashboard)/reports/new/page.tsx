'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { toast } from '@/hooks/use-toast'
import { ArrowLeft, Upload, X } from 'lucide-react'

interface Task {
  id: string
  title: string
  status: string
}

interface Client {
  id: string
  name: string
}

export default function NewReportPage() {
  const router = useRouter()
  const [tasks, setTasks] = useState<Task[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [uploadedUrls, setUploadedUrls] = useState<string[]>([])

  const [form, setForm] = useState({
    title: '',
    description: '',
    reportType: 'task_completion',
    clientId: '',
    taskId: '',
    priority: 'medium',
    tags: '',
  })

  useEffect(() => {
    async function load() {
      const [tasksRes, clientsRes] = await Promise.all([
        fetch('/api/tasks?status=in_progress&limit=50'),
        fetch('/api/clients'),
      ])
      if (tasksRes.ok) {
        const data = await tasksRes.json()
        setTasks(data.data || [])
      }
      if (clientsRes.ok) {
        const data = await clientsRes.json()
        setClients(data.data || [])
      }
    }
    load()
  }, [])

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      const res = await fetch('/api/upload', { method: 'POST', body: formData })
      if (res.ok) {
        const data = await res.json()
        setUploadedUrls((prev) => [...prev, data.url])
        toast({ title: 'Archivo subido exitosamente' })
      } else {
        toast({ title: 'Error al subir archivo', variant: 'destructive' })
      }
    } finally {
      setUploading(false)
      e.target.value = ''
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (form.description.length < 50) {
      toast({ title: 'La descripción debe tener al menos 50 caracteres', variant: 'destructive' })
      return
    }
    setLoading(true)
    try {
      const res = await fetch('/api/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          clientId: form.clientId || undefined,
          taskId: form.taskId || undefined,
          fileUrls: uploadedUrls,
          tags: form.tags ? form.tags.split(',').map((t) => t.trim()).filter(Boolean) : [],
        }),
      })
      if (res.ok) {
        toast({ title: 'Reporte enviado exitosamente' })
        router.push('/reports')
      } else {
        const err = await res.json()
        toast({ title: 'Error al enviar reporte', description: JSON.stringify(err.error), variant: 'destructive' })
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/reports" className="text-zinc-400 hover:text-white transition-colors">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-2xl font-bold text-white">Nuevo reporte</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-1.5">Tipo de reporte *</label>
            <select
              value={form.reportType}
              onChange={(e) => setForm((p) => ({ ...p, reportType: e.target.value }))}
              className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2.5 text-white focus:border-indigo-500 focus:outline-none"
            >
              <option value="task_completion">Tarea completada</option>
              <option value="change">Cambio</option>
              <option value="issue">Issue / Problema</option>
              <option value="insight">Insight</option>
              <option value="client_update">Update de cliente</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-1.5">Título *</label>
            <input
              type="text"
              required
              value={form.title}
              onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
              placeholder="Ej: Campaña de email completada para E-commerce SA"
              className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2.5 text-white placeholder-zinc-500 focus:border-indigo-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-1.5">
              Descripción *
              <span className={`ml-2 text-xs ${form.description.length < 50 ? 'text-red-400' : 'text-green-400'}`}>
                ({form.description.length}/50 mín.)
              </span>
            </label>
            <textarea
              required
              rows={5}
              value={form.description}
              onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
              placeholder="Describí detalladamente qué hiciste, el resultado obtenido, y cualquier información relevante..."
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
                <option value="low">Baja</option>
                <option value="medium">Media</option>
                <option value="high">Alta</option>
                <option value="critical">Crítica</option>
              </select>
            </div>
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
          </div>

          {tasks.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-1.5">Tarea relacionada (opcional)</label>
              <select
                value={form.taskId}
                onChange={(e) => setForm((p) => ({ ...p, taskId: e.target.value }))}
                className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2.5 text-white focus:border-indigo-500 focus:outline-none"
              >
                <option value="">Sin tarea</option>
                {tasks.map((t) => (
                  <option key={t.id} value={t.id}>{t.title}</option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-1.5">Tags (separados por coma)</label>
            <input
              type="text"
              value={form.tags}
              onChange={(e) => setForm((p) => ({ ...p, tags: e.target.value }))}
              placeholder="email, campana, completado"
              className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2.5 text-white placeholder-zinc-500 focus:border-indigo-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-1.5">Adjuntar archivo (máx. 10MB)</label>
            <label className="flex items-center gap-3 rounded-lg border border-dashed border-zinc-600 bg-zinc-800/50 px-4 py-4 cursor-pointer hover:border-indigo-500 transition-colors">
              <Upload className="h-5 w-5 text-zinc-400" />
              <span className="text-sm text-zinc-400">{uploading ? 'Subiendo...' : 'Hacer click para seleccionar archivo'}</span>
              <input
                type="file"
                className="hidden"
                accept=".pdf,.jpg,.jpeg,.png,.xlsx,.xls,.csv"
                onChange={handleFileUpload}
                disabled={uploading}
              />
            </label>
            {uploadedUrls.length > 0 && (
              <div className="mt-2 space-y-1">
                {uploadedUrls.map((url, i) => (
                  <div key={i} className="flex items-center justify-between rounded-lg bg-zinc-800 px-3 py-2">
                    <a href={url} target="_blank" rel="noopener noreferrer" className="text-xs text-indigo-400 truncate flex-1">
                      {url.split('/').pop()}
                    </a>
                    <button
                      type="button"
                      onClick={() => setUploadedUrls((prev) => prev.filter((_, idx) => idx !== i))}
                      className="ml-2 text-zinc-500 hover:text-red-400"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="flex gap-3 justify-end">
          <Link href="/reports" className="rounded-lg border border-zinc-700 px-5 py-2.5 text-sm font-medium text-zinc-300 hover:bg-zinc-800 transition-colors">
            Cancelar
          </Link>
          <button
            type="submit"
            disabled={loading}
            className="rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? 'Enviando...' : 'Enviar reporte'}
          </button>
        </div>
      </form>
    </div>
  )
}
