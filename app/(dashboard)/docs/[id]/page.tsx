'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { CardSkeleton } from '@/components/shared/LoadingSkeleton'
import { toast } from '@/hooks/use-toast'
import { formatDateTime } from '@/lib/utils'
import { ArrowLeft, Edit2, Save, X } from 'lucide-react'

interface DocDetail {
  id: string
  title: string
  content: string
  category: string
  status: string
  version: number
  versionNotes: string | null
  tags: string[]
  createdAt: string
  updatedAt: string
  author: { id: string; fullName: string }
}

export default function DocDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { user } = useCurrentUser()
  const [doc, setDoc] = useState<DocDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [editContent, setEditContent] = useState('')
  const [editTitle, setEditTitle] = useState('')

  async function loadDoc() {
    try {
      const res = await fetch(`/api/docs/${params.id}`)
      if (res.ok) {
        const data = await res.json()
        setDoc(data.data)
        setEditContent(data.data.content)
        setEditTitle(data.data.title)
      } else {
        router.push('/docs')
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadDoc() }, [params.id])

  async function saveDoc() {
    setSaving(true)
    try {
      const res = await fetch(`/api/docs/${params.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: editTitle, content: editContent }),
      })
      if (res.ok) {
        toast({ title: 'Documento actualizado' })
        setEditing(false)
        loadDoc()
      }
    } finally {
      setSaving(false)
    }
  }

  const isCEO = user?.role === 'CEO' || user?.role === 'Manager'

  if (loading) return <div className="max-w-4xl mx-auto space-y-4"><CardSkeleton /></div>
  if (!doc) return null

  function renderMarkdown(text: string) {
    return text
      .split('\n')
      .map((line, i) => {
        if (line.startsWith('# ')) return <h1 key={i} className="text-2xl font-bold text-white mt-6 mb-3">{line.slice(2)}</h1>
        if (line.startsWith('## ')) return <h2 key={i} className="text-xl font-semibold text-white mt-5 mb-2">{line.slice(3)}</h2>
        if (line.startsWith('### ')) return <h3 key={i} className="text-lg font-medium text-white mt-4 mb-2">{line.slice(4)}</h3>
        if (line.startsWith('- ') || line.startsWith('* ')) return <li key={i} className="text-zinc-300 ml-4 list-disc">{line.slice(2)}</li>
        if (line.match(/^\d+\. /)) return <li key={i} className="text-zinc-300 ml-4 list-decimal">{line.replace(/^\d+\. /, '')}</li>
        if (line === '') return <br key={i} />
        return <p key={i} className="text-zinc-300">{line}</p>
      })
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/docs" className="text-zinc-400 hover:text-white"><ArrowLeft className="h-5 w-5" /></Link>
          <div className="flex items-center gap-2">
            <StatusBadge status={doc.category} />
            <StatusBadge status={doc.status} />
            <span className="text-xs text-zinc-600">v{doc.version}</span>
          </div>
        </div>
        {isCEO && !editing && (
          <button onClick={() => setEditing(true)} className="flex items-center gap-2 rounded-lg border border-zinc-700 px-4 py-2 text-sm text-zinc-300 hover:bg-zinc-800 transition-colors">
            <Edit2 className="h-4 w-4" /> Editar
          </button>
        )}
        {editing && (
          <div className="flex gap-2">
            <button onClick={() => { setEditing(false); setEditContent(doc.content); setEditTitle(doc.title) }} className="flex items-center gap-2 rounded-lg border border-zinc-700 px-4 py-2 text-sm text-zinc-300 hover:bg-zinc-800 transition-colors">
              <X className="h-4 w-4" /> Cancelar
            </button>
            <button onClick={saveDoc} disabled={saving} className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm text-white hover:bg-indigo-500 disabled:opacity-50 transition-colors">
              <Save className="h-4 w-4" /> {saving ? 'Guardando...' : 'Guardar'}
            </button>
          </div>
        )}
      </div>

      <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-6">
        {editing ? (
          <div className="space-y-4">
            <input value={editTitle} onChange={(e) => setEditTitle(e.target.value)} className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2.5 text-xl font-bold text-white focus:border-indigo-500 focus:outline-none" />
            <textarea rows={24} value={editContent} onChange={(e) => setEditContent(e.target.value)} className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2.5 text-sm text-white placeholder-zinc-500 focus:border-indigo-500 focus:outline-none resize-none font-mono" />
          </div>
        ) : (
          <div className="prose-invert">
            <h1 className="text-2xl font-bold text-white mb-6">{doc.title}</h1>
            <div className="space-y-1">{renderMarkdown(doc.content)}</div>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between text-xs text-zinc-600">
        <span>Creado por {doc.author.fullName} · {formatDateTime(doc.createdAt)}</span>
        <span>Última actualización: {formatDateTime(doc.updatedAt)}</span>
      </div>

      {doc.tags.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {doc.tags.map((tag) => (
            <span key={tag} className="rounded-full bg-zinc-800 px-2.5 py-0.5 text-xs text-zinc-400">{tag}</span>
          ))}
        </div>
      )}
    </div>
  )
}
