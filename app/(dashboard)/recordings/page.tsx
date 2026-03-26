'use client'

import { useState, useEffect, useCallback } from 'react'
import { PageHeader } from '@/components/shared/PageHeader'
import { useAuthStore } from '@/store/auth'
import { Video, Plus, ExternalLink, Clock, FileText, X, Play } from 'lucide-react'
import { cn, formatDate, timeAgo } from '@/lib/utils'

interface Recording {
  id: string
  title: string
  url: string | null
  platform: string | null
  duration: number | null
  transcription: string | null
  extractedTasks: { title: string; assignedTo?: string }[] | null
  client: { id: string; name: string } | null
  createdBy: { id: string; fullName: string } | null
  createdAt: string
}

const PLATFORMS = [
  { value: 'zoom', label: 'Zoom' },
  { value: 'meet', label: 'Google Meet' },
  { value: 'loom', label: 'Loom' },
  { value: 'other', label: 'Otro' },
]

export default function RecordingsPage() {
  const { org } = useAuthStore()
  const [recordings, setRecordings] = useState<Recording[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [clients, setClients] = useState<{ id: string; name: string }[]>([])
  const [showTranscription, setShowTranscription] = useState<string | null>(null)

  const fetchRecordings = useCallback(async () => {
    const res = await fetch('/api/recordings')
    if (res.ok) {
      const json = await res.json()
      setRecordings(json.data)
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchRecordings()
    fetch('/api/clients').then(r => r.json()).then(j => setClients(j.data || []))
  }, [fetchRecordings])

  const handleCreate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const form = new FormData(e.currentTarget)

    const res = await fetch('/api/recordings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: form.get('title'),
        clientId: form.get('clientId') || undefined,
        url: form.get('url') || undefined,
        platform: form.get('platform') || undefined,
        duration: form.get('duration') ? parseInt(form.get('duration') as string) : undefined,
        transcription: form.get('transcription') || undefined,
      }),
    })

    if (res.ok) {
      setShowForm(false)
      fetchRecordings()
    }
  }

  if (!org) return null

  return (
    <div className="space-y-6">
      <PageHeader
        title="Grabaciones"
        description="Reuniones grabadas, transcripciones y tareas extraídas"
        action={
          <button onClick={() => setShowForm(!showForm)} className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
            {showForm ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
            {showForm ? 'Cancelar' : 'Nueva grabación'}
          </button>
        }
      />

      {/* Create form */}
      {showForm && (
        <form onSubmit={handleCreate} className="rounded-xl border border-zinc-800 bg-zinc-900 p-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-zinc-400 mb-1 block">Título *</label>
              <input name="title" required className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white" placeholder="Reunión con cliente..." />
            </div>
            <div>
              <label className="text-xs text-zinc-400 mb-1 block">Cliente</label>
              <select name="clientId" className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white">
                <option value="">Sin cliente</option>
                {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-zinc-400 mb-1 block">URL de la grabación</label>
              <input name="url" type="url" className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white" placeholder="https://..." />
            </div>
            <div>
              <label className="text-xs text-zinc-400 mb-1 block">Plataforma</label>
              <select name="platform" className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white">
                <option value="">Seleccionar</option>
                {PLATFORMS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-zinc-400 mb-1 block">Duración (minutos)</label>
              <input name="duration" type="number" className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white" placeholder="60" />
            </div>
          </div>
          <div>
            <label className="text-xs text-zinc-400 mb-1 block">Transcripción</label>
            <textarea name="transcription" rows={4} className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white" placeholder="Pega la transcripción aquí..." />
          </div>
          <button type="submit" className="bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-2 rounded-lg text-sm font-medium transition-colors">
            Guardar grabación
          </button>
        </form>
      )}

      {/* Recordings List */}
      {loading ? (
        <div className="space-y-3">{[1, 2, 3].map(i => <div key={i} className="h-20 bg-zinc-800 rounded-xl animate-pulse" />)}</div>
      ) : recordings.length === 0 ? (
        <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-12 text-center">
          <Video className="h-12 w-12 text-zinc-600 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-white mb-2">No hay grabaciones aún</h3>
          <p className="text-sm text-zinc-400">Sube grabaciones de reuniones y añade transcripciones para extraer tareas.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {recordings.map(rec => (
            <div key={rec.id} className="rounded-xl border border-zinc-800 bg-zinc-900 p-5 space-y-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="rounded-lg bg-purple-500/10 p-2">
                    <Play className="h-4 w-4 text-purple-400" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-white">{rec.title}</p>
                    {rec.client && <p className="text-xs text-zinc-500">{rec.client.name}</p>}
                  </div>
                </div>
                {rec.platform && (
                  <span className="text-xs bg-zinc-800 text-zinc-400 px-2 py-0.5 rounded-full capitalize">{rec.platform}</span>
                )}
              </div>

              <div className="flex items-center gap-3 text-xs text-zinc-500">
                {rec.duration && (
                  <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {rec.duration} min</span>
                )}
                <span>{timeAgo(rec.createdAt)}</span>
              </div>

              <div className="flex items-center gap-2">
                {rec.url && (
                  <a href={rec.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-xs text-indigo-400 hover:text-indigo-300">
                    <ExternalLink className="h-3 w-3" /> Ver grabación
                  </a>
                )}
                {rec.transcription && (
                  <button onClick={() => setShowTranscription(showTranscription === rec.id ? null : rec.id)} className="flex items-center gap-1 text-xs text-zinc-400 hover:text-zinc-300">
                    <FileText className="h-3 w-3" /> Transcripción
                  </button>
                )}
              </div>

              {showTranscription === rec.id && rec.transcription && (
                <div className="bg-zinc-800 rounded-lg p-3 text-xs text-zinc-300 max-h-40 overflow-y-auto whitespace-pre-wrap">
                  {rec.transcription}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
