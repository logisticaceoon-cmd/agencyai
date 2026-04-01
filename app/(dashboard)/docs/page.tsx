'use client'

import { useEffect, useState, useMemo, useCallback } from 'react'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import { cn } from '@/lib/utils'
import { BookmarkCard, getIconForUrl, getCategoryForUrl, getTitleForUrl, type Bookmark } from '@/components/bookmarks/BookmarkCard'
import {
  BookOpen, Plus, Search, X, Pin, Link2, Loader2,
} from 'lucide-react'
import * as Dialog from '@radix-ui/react-dialog'

// ── Types ────────────────────────────────────────────────────────────────────

interface Client { id: string; name: string }
interface Project { id: string; name: string }

const CATEGORIES = [
  { key: '', label: 'Todos' },
  { key: 'drive', label: 'Drive' },
  { key: 'sheets', label: 'Sheets' },
  { key: 'docs', label: 'Docs' },
  { key: 'notion', label: 'Notion' },
  { key: 'figma', label: 'Figma' },
  { key: 'externo', label: 'Externo' },
  { key: 'general', label: 'General' },
]

const ICON_OPTIONS = ['📄', '📊', '📈', '📝', '🔗', '📁', '🎨', '💡', '📋', '🗂️', '📌', '⭐', '🚀', '💰', '👥', '🎯']

const COLOR_OPTIONS = [
  { value: '#2563eb', label: 'Azul' },
  { value: '#16a34a', label: 'Verde' },
  { value: '#dc2626', label: 'Rojo' },
  { value: '#d97706', label: 'Amarillo' },
  { value: '#7c3aed', label: 'Purpura' },
  { value: '#ea580c', label: 'Naranja' },
  { value: '#db2777', label: 'Rosa' },
  { value: '#64748b', label: 'Gris' },
]

// ── Component ────────────────────────────────────────────────────────────────

export default function DocsPage() {
  const { user } = useCurrentUser()
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [clientFilter, setClientFilter] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editingBookmark, setEditingBookmark] = useState<Bookmark | null>(null)
  const [clients, setClients] = useState<Client[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [saving, setSaving] = useState(false)

  // Form state
  const [formUrl, setFormUrl] = useState('')
  const [formTitle, setFormTitle] = useState('')
  const [formIcon, setFormIcon] = useState('📄')
  const [formDescription, setFormDescription] = useState('')
  const [formCategory, setFormCategory] = useState('general')
  const [formClientId, setFormClientId] = useState('')
  const [formProjectId, setFormProjectId] = useState('')
  const [formColor, setFormColor] = useState('#2563eb')
  const [formPinned, setFormPinned] = useState(false)

  const loadBookmarks = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/bookmarks')
      if (res.ok) {
        const json = await res.json()
        setBookmarks(json.data || [])
      }
    } catch { /* ignore */ }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { loadBookmarks() }, [loadBookmarks])

  useEffect(() => {
    Promise.all([
      fetch('/api/clients').then(r => r.json()).then(d => setClients(Array.isArray(d) ? d : d.data || [])),
      fetch('/api/projects?limit=100').then(r => r.json()).then(d => setProjects(d.data || [])),
    ]).catch(() => {})
  }, [])

  // Filtered bookmarks
  const filtered = useMemo(() => {
    return bookmarks.filter(b => {
      if (categoryFilter && b.category !== categoryFilter) return false
      if (clientFilter && b.client_id !== clientFilter) return false
      if (searchQuery) {
        const q = searchQuery.toLowerCase()
        return b.title.toLowerCase().includes(q) || b.url.toLowerCase().includes(q) || (b.description || '').toLowerCase().includes(q)
      }
      return true
    })
  }, [bookmarks, categoryFilter, clientFilter, searchQuery])

  const pinnedBookmarks = filtered.filter(b => b.pinned)
  const unpinnedBookmarks = filtered.filter(b => !b.pinned)

  // Auto-detect on URL paste
  function handleUrlChange(url: string) {
    setFormUrl(url)
    if (!url) return
    const autoIcon = getIconForUrl(url)
    const autoCat = getCategoryForUrl(url)
    const autoTitle = getTitleForUrl(url)
    setFormIcon(autoIcon)
    setFormCategory(autoCat)
    if (autoTitle && !formTitle) setFormTitle(autoTitle)
  }

  function openCreateModal() {
    setEditingBookmark(null)
    setFormUrl('')
    setFormTitle('')
    setFormIcon('📄')
    setFormDescription('')
    setFormCategory('general')
    setFormClientId('')
    setFormProjectId('')
    setFormColor('#2563eb')
    setFormPinned(false)
    setModalOpen(true)
  }

  function openEditModal(b: Bookmark) {
    setEditingBookmark(b)
    setFormUrl(b.url)
    setFormTitle(b.title)
    setFormIcon(b.icon)
    setFormDescription(b.description || '')
    setFormCategory(b.category)
    setFormClientId(b.client_id || '')
    setFormProjectId(b.project_id || '')
    setFormColor(b.color)
    setFormPinned(b.pinned)
    setModalOpen(true)
  }

  async function handleSave() {
    if (!formUrl.trim() || !formTitle.trim()) return
    setSaving(true)
    try {
      const payload = {
        url: formUrl.trim(),
        title: formTitle.trim(),
        icon: formIcon,
        description: formDescription.trim() || null,
        category: formCategory,
        client_id: formClientId || null,
        project_id: formProjectId || null,
        color: formColor,
        pinned: formPinned,
      }

      if (editingBookmark) {
        await fetch(`/api/bookmarks/${editingBookmark.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
      } else {
        await fetch('/api/bookmarks', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
      }
      setModalOpen(false)
      loadBookmarks()
    } catch { /* ignore */ }
    finally { setSaving(false) }
  }

  async function handleDelete(id: string) {
    if (!confirm('Eliminar este marcador?')) return
    await fetch(`/api/bookmarks/${id}`, { method: 'DELETE' })
    setBookmarks(prev => prev.filter(b => b.id !== id))
  }

  async function handleTogglePin(id: string, pinned: boolean) {
    setBookmarks(prev => prev.map(b => b.id === id ? { ...b, pinned } : b))
    await fetch(`/api/bookmarks/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pinned }),
    })
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)] flex items-center gap-2">
            <BookOpen size={24} strokeWidth={1.5} className="text-[var(--blue)]" />
            Documentos
          </h1>
          <p className="mt-1 text-sm text-[var(--text-muted)]">Accesos rapidos y archivos de la agencia</p>
        </div>
        <button onClick={openCreateModal} className="btn-primary text-sm py-2 px-4">
          <Plus size={16} strokeWidth={1.5} /> Nuevo marcador
        </button>
      </div>

      {/* Search + Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--text-muted)]" />
          <input
            type="text"
            placeholder="Buscar por titulo, URL o descripcion..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="input pl-9"
          />
        </div>
        <select value={clientFilter} onChange={(e) => setClientFilter(e.target.value)} className="input w-auto min-w-[150px]">
          <option value="">Todos los clientes</option>
          {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>

      {/* Category tabs */}
      <div className="flex gap-1 overflow-x-auto pb-1">
        {CATEGORIES.map(cat => (
          <button
            key={cat.key}
            onClick={() => setCategoryFilter(cat.key)}
            className={cn(
              'px-3.5 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors',
              categoryFilter === cat.key
                ? 'bg-[var(--blue)] text-white'
                : 'bg-[var(--bg-muted)] text-[var(--text-secondary)] hover:bg-slate-200'
            )}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Content */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="rounded-[var(--radius-lg)] border border-[var(--border-base)] bg-white p-4 space-y-3">
              <div className="h-8 w-8 rounded bg-slate-100 animate-pulse" />
              <div className="h-4 w-3/4 rounded bg-slate-100 animate-pulse" />
              <div className="h-3 w-1/2 rounded bg-slate-100 animate-pulse" />
            </div>
          ))}
        </div>
      ) : filtered.length === 0 && !searchQuery && !categoryFilter ? (
        /* Empty state */
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="text-5xl mb-4">🔗</div>
          <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-2">Todavia no tenes accesos rapidos</h3>
          <p className="text-sm text-[var(--text-muted)] max-w-md mb-6">
            Guarda links a tus archivos de Drive, Sheets, Docs y mas para acceder rapido desde aca
          </p>
          <button onClick={openCreateModal} className="btn-primary text-sm py-2.5 px-5">
            <Plus size={16} strokeWidth={1.5} /> Agregar primer marcador
          </button>
        </div>
      ) : (
        <>
          {/* Pinned section */}
          {pinnedBookmarks.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold text-[var(--text-secondary)] flex items-center gap-1.5 mb-3">
                <Pin size={14} strokeWidth={1.5} /> Fijados
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
                {pinnedBookmarks.map(b => (
                  <BookmarkCard key={b.id} bookmark={b} onEdit={openEditModal} onDelete={handleDelete} onTogglePin={handleTogglePin} />
                ))}
              </div>
            </div>
          )}

          {/* All bookmarks */}
          {unpinnedBookmarks.length > 0 && (
            <div>
              {pinnedBookmarks.length > 0 && (
                <h2 className="text-sm font-semibold text-[var(--text-secondary)] mb-3">Todos los accesos rapidos</h2>
              )}
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
                {unpinnedBookmarks.map(b => (
                  <BookmarkCard key={b.id} bookmark={b} onEdit={openEditModal} onDelete={handleDelete} onTogglePin={handleTogglePin} />
                ))}
              </div>
            </div>
          )}

          {filtered.length === 0 && (searchQuery || categoryFilter) && (
            <div className="text-center py-12">
              <Search size={24} strokeWidth={1.5} className="text-[var(--text-muted)] mx-auto mb-2" />
              <p className="text-sm text-[var(--text-muted)]">No se encontraron marcadores</p>
            </div>
          )}
        </>
      )}

      {/* Create/Edit Modal */}
      <Dialog.Root open={modalOpen} onOpenChange={setModalOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-50 bg-black/40 backdrop-blur-[2px] animate-fade-in" />
          <Dialog.Content className="fixed left-1/2 top-1/2 z-50 -translate-x-1/2 -translate-y-1/2 w-full max-w-lg rounded-[var(--radius-xl)] border border-[var(--border-base)] bg-white shadow-[0_20px_60px_rgba(0,0,0,0.15)] animate-scale-in max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 pt-6 pb-0">
              <Dialog.Title className="text-lg font-bold text-[var(--text-primary)]">
                {editingBookmark ? 'Editar marcador' : 'Nuevo marcador'}
              </Dialog.Title>
              <Dialog.Close className="rounded-lg p-1.5 text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-muted)] transition-colors">
                <X size={16} strokeWidth={1.5} />
              </Dialog.Close>
            </div>

            <div className="px-6 py-5 space-y-4">
              {/* URL */}
              <div>
                <label className="label">URL *</label>
                <input
                  type="url"
                  value={formUrl}
                  onChange={(e) => handleUrlChange(e.target.value)}
                  className="input"
                  placeholder="https://docs.google.com/..."
                />
                {formUrl && (
                  <p className="text-[11px] text-[var(--text-muted)] mt-1 flex items-center gap-1">
                    <Link2 size={10} /> {(() => { try { return new URL(formUrl).hostname } catch { return '' } })()}
                  </p>
                )}
              </div>

              {/* Title */}
              <div>
                <label className="label">Titulo *</label>
                <input type="text" value={formTitle} onChange={(e) => setFormTitle(e.target.value)} className="input" placeholder="Nombre del marcador" />
              </div>

              {/* Icon selector */}
              <div>
                <label className="label">Icono</label>
                <div className="flex flex-wrap gap-1.5">
                  {ICON_OPTIONS.map(emoji => (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => setFormIcon(emoji)}
                      className={cn(
                        'h-8 w-8 rounded-lg flex items-center justify-center text-base transition-all',
                        formIcon === emoji ? 'bg-[var(--blue-light)] ring-2 ring-[var(--blue)]' : 'bg-[var(--bg-muted)] hover:bg-slate-200'
                      )}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="label">Descripcion</label>
                <textarea
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  className="input resize-y"
                  rows={2}
                  placeholder="Para que sirve este archivo?"
                />
              </div>

              {/* Category + Color row */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Categoria</label>
                  <select value={formCategory} onChange={(e) => setFormCategory(e.target.value)} className="input">
                    {CATEGORIES.filter(c => c.key).map(c => <option key={c.key} value={c.key}>{c.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label">Color del borde</label>
                  <div className="flex gap-1.5 mt-1">
                    {COLOR_OPTIONS.map(c => (
                      <button
                        key={c.value}
                        type="button"
                        onClick={() => setFormColor(c.value)}
                        className={cn(
                          'h-6 w-6 rounded-full transition-all',
                          formColor === c.value ? 'ring-2 ring-offset-1 ring-[var(--blue)]' : ''
                        )}
                        style={{ backgroundColor: c.value }}
                        title={c.label}
                      />
                    ))}
                  </div>
                </div>
              </div>

              {/* Client + Project row */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Cliente vinculado</label>
                  <select value={formClientId} onChange={(e) => setFormClientId(e.target.value)} className="input">
                    <option value="">Sin cliente</option>
                    {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label">Proyecto vinculado</label>
                  <select value={formProjectId} onChange={(e) => setFormProjectId(e.target.value)} className="input">
                    <option value="">Sin proyecto</option>
                    {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
              </div>

              {/* Pin toggle */}
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formPinned}
                  onChange={(e) => setFormPinned(e.target.checked)}
                  className="h-4 w-4 rounded border-[var(--border-base)] text-[var(--blue)] focus:ring-[var(--blue)]"
                />
                <span className="text-sm text-[var(--text-secondary)]">Fijar en la parte superior</span>
              </label>
            </div>

            {/* Footer */}
            <div className="flex justify-end gap-2 px-6 pb-6">
              <Dialog.Close asChild>
                <button type="button" className="btn-secondary text-sm py-2 px-4">Cancelar</button>
              </Dialog.Close>
              <button onClick={handleSave} disabled={saving || !formUrl.trim() || !formTitle.trim()} className="btn-primary text-sm py-2 px-4">
                {saving ? <Loader2 size={14} className="animate-spin" /> : null}
                {editingBookmark ? 'Guardar cambios' : 'Guardar marcador'}
              </button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  )
}
