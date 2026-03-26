'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { toast } from '@/hooks/use-toast'
import { ArrowLeft } from 'lucide-react'

export default function NewDocPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    title: '',
    content: '',
    category: 'sop',
    subcategory: '',
    tags: '',
    status: 'draft',
  })

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      const res = await fetch('/api/docs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          tags: form.tags ? form.tags.split(',').map((t) => t.trim()).filter(Boolean) : [],
        }),
      })
      if (res.ok) {
        const data = await res.json()
        toast({ title: 'Documento creado' })
        router.push(`/docs/${data.data.id}`)
      } else {
        toast({ title: 'Error al crear documento', variant: 'destructive' })
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/docs" className="text-zinc-400 hover:text-white"><ArrowLeft className="h-5 w-5" /></Link>
        <h1 className="text-2xl font-bold text-white">Nuevo documento</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-1.5">Título *</label>
            <input required value={form.title} onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))} className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2.5 text-white focus:border-indigo-500 focus:outline-none" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-1.5">Categoría</label>
              <select value={form.category} onChange={(e) => setForm((p) => ({ ...p, category: e.target.value }))} className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2.5 text-white focus:border-indigo-500 focus:outline-none">
                <option value="sop">SOP</option>
                <option value="manual">Manual</option>
                <option value="template">Template</option>
                <option value="process">Proceso</option>
                <option value="reference">Referencia</option>
                <option value="policy">Política</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-1.5">Estado</label>
              <select value={form.status} onChange={(e) => setForm((p) => ({ ...p, status: e.target.value }))} className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2.5 text-white focus:border-indigo-500 focus:outline-none">
                <option value="draft">Borrador</option>
                <option value="published">Publicado</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-1.5">Tags (separados por coma)</label>
            <input value={form.tags} onChange={(e) => setForm((p) => ({ ...p, tags: e.target.value }))} placeholder="proceso, marketing, cliente" className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2.5 text-white placeholder-zinc-500 focus:border-indigo-500 focus:outline-none" />
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-1.5">Contenido * (Markdown soportado)</label>
            <textarea required rows={16} value={form.content} onChange={(e) => setForm((p) => ({ ...p, content: e.target.value }))} placeholder="# Título del documento&#10;&#10;## Objetivo&#10;...&#10;&#10;## Pasos&#10;1. ..." className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2.5 text-white placeholder-zinc-500 focus:border-indigo-500 focus:outline-none resize-none font-mono text-sm" />
          </div>
        </div>

        <div className="flex gap-3 justify-end">
          <Link href="/docs" className="rounded-lg border border-zinc-700 px-5 py-2.5 text-sm font-medium text-zinc-300 hover:bg-zinc-800 transition-colors">Cancelar</Link>
          <button type="submit" disabled={loading} className="rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-50 transition-colors">{loading ? 'Guardando...' : 'Guardar documento'}</button>
        </div>
      </form>
    </div>
  )
}
