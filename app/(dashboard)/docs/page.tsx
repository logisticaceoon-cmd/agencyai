'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { PageHeader } from '@/components/shared/PageHeader'
import { TableSkeleton } from '@/components/shared/LoadingSkeleton'
import { EmptyState } from '@/components/shared/EmptyState'
import { formatDate } from '@/lib/utils'
import { BookOpen, Plus, Search } from 'lucide-react'

interface Doc {
  id: string
  title: string
  category: string
  status: string
  version: number
  tags: string[]
  updatedAt: string
  author: { id: string; fullName: string }
}

const categories = ['sop', 'manual', 'template', 'process', 'reference', 'policy']

export default function DocsPage() {
  const { user } = useCurrentUser()
  const [docs, setDocs] = useState<Doc[]>([])
  const [loading, setLoading] = useState(true)
  const [categoryFilter, setCategoryFilter] = useState('')
  const [search, setSearch] = useState('')

  async function loadDocs() {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (categoryFilter) params.set('category', categoryFilter)
      if (search) params.set('q', search)
      const res = await fetch(`/api/docs?${params}`)
      if (res.ok) {
        const data = await res.json()
        setDocs(data.data || [])
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadDocs() }, [categoryFilter, search])

  return (
    <div className="space-y-6">
      <PageHeader
        title="Documentación"
        description="SOPs, manuales y procesos de la agencia"
        action={
          <Link href="/docs/new" className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500 transition-colors">
            <Plus className="h-4 w-4" /> Nuevo documento
          </Link>
        }
      />

      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--text-secondary)]" />
          <input type="text" placeholder="Buscar documentos..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-full pl-9 pr-4 py-2 rounded-lg border border-[var(--border-base)] bg-slate-100 text-sm text-slate-900 placeholder-[var(--text-muted)] focus:border-indigo-500 focus:outline-none" />
        </div>
        <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} className="rounded-lg border border-[var(--border-base)] bg-slate-100 px-3 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none">
          <option value="">Todas las categorías</option>
          {categories.map((c) => <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
        </select>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => <div key={i} className="h-32 rounded-xl bg-white animate-pulse" />)}
        </div>
      ) : docs.length === 0 ? (
        <EmptyState icon={BookOpen} title="No hay documentos" description="Empezá creando el primer SOP de la agencia" action={<Link href="/docs/new" className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500 transition-colors"><Plus className="h-4 w-4" /> Nuevo documento</Link>} />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {docs.map((doc) => (
            <Link key={doc.id} href={`/docs/${doc.id}`} className="rounded-xl border border-[var(--border-base)] bg-white p-5 hover:border-[var(--border-base)] transition-colors space-y-3">
              <div className="flex items-start justify-between gap-2">
                <h3 className="font-medium text-slate-900 line-clamp-2">{doc.title}</h3>
                <StatusBadge status={doc.status} className="flex-shrink-0" />
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <StatusBadge status={doc.category} />
                <span className="text-xs text-[var(--text-secondary)]">v{doc.version}</span>
              </div>
              {doc.tags.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {doc.tags.slice(0, 3).map((tag) => (
                    <span key={tag} className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-[var(--text-secondary)]">{tag}</span>
                  ))}
                </div>
              )}
              <div className="flex items-center justify-between text-xs text-[var(--text-secondary)]">
                <span>{doc.author?.fullName || 'Usuario'}</span>
                <span>{formatDate(doc.updatedAt)}</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
